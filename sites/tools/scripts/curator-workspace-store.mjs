import { randomUUID } from "node:crypto";
import { createContentRepository, publishItemWithin, saveItemWithin, withTransaction } from "./curator-db.mjs";
import { assertContentItemShape, assertUrlShape, validateContentPayload } from "./curator-content-rules.mjs";
import { convertWorkingDraft, diffDrafts, mergeWorkingDraft, normalizeWorkingDraft, same, TYPE_NAMES, WORKSPACE_TYPES, workspaceError } from "./curator-workspace-data.mjs";

const at = () => new Date().toISOString();
const json = (value) => JSON.stringify(value);
const parse = (value, fallback = null) => value ? JSON.parse(value) : fallback;

export function createWorkspaceStore(db) {
  const contents = createContentRepository(db);
  function row(id) {
    const value = db.prepare("SELECT * FROM curator_workspaces WHERE id = ?").get(id);
    if (!value) throw workspaceError("找不到这个资源工作区", "not-found", 404);
    return value;
  }
  function expect(value, version) {
    if (!Number.isInteger(version) || version !== Number(value.version)) throw workspaceError("草稿已更新，请先合并最新内容", "stale-draft", 409);
  }
  function emit(id, type, data, operationId = null) {
    const createdAt = at();
    const result = db.prepare("INSERT INTO workspace_events(workspace_id, operation_id, type, data_json, created_at) VALUES (?, ?, ?, ?, ?)").run(id, operationId, type, json(data), createdAt);
    return { sequence: Number(result.lastInsertRowid), workspaceId: id, operationId, type, data, createdAt };
  }
  function writeWithin(value, next, kind, note, operationId = null) {
    const before = parse(value.draft_json);
    const draft = normalizeWorkingDraft(next, before.id);
    if (same(before, draft)) return value;
    const version = Number(value.version) + 1;
    const createdAt = at();
    db.prepare("UPDATE curator_workspaces SET draft_json=?, version=?, disposition='open', updated_at=? WHERE id=?").run(json(draft), version, createdAt, value.id);
    const change = db.prepare("INSERT INTO workspace_changes(workspace_id, version, before_json, after_json, kind, note, created_at, operation_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(value.id, version, value.draft_json, json(draft), kind, note, createdAt, operationId);
    emit(value.id, "draft.updated", { version, kind, note, changeId: Number(change.lastInsertRowid), changes: diffDrafts(before, draft) }, operationId);
    return row(value.id);
  }
  function proposalWithin(value, next, kind, note) {
    const id = randomUUID();
    // A concrete new proposal replaces pending older proposals, so "好的" has
    // one referent. Their contents remain in history as superseded proposals.
    db.prepare("UPDATE workspace_proposals SET status='superseded' WHERE workspace_id=? AND status='pending'").run(value.id);
    db.prepare("INSERT INTO workspace_proposals(id, workspace_id, base_version, before_json, after_json, kind, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id, value.id, value.version, value.draft_json, json(normalizeWorkingDraft(next, parse(value.draft_json).id)), kind, note, at());
    emit(value.id, "proposal.created", { id, kind, note });
    return id;
  }
  function operation(row) {
    if (!row) return null;
    return { id: row.id, workspaceId: row.workspace_id, status: row.status, input: parse(row.input_json), result: parse(row.result_json), error: row.error,
      createdAt: row.created_at, updatedAt: row.updated_at };
  }
  const store = {
    contents,
    get(id) {
      const value = row(id);
      const publication = value.content_id ? db.prepare("SELECT * FROM content_publications WHERE item_id=?").get(value.content_id) : null;
      const proposals = db.prepare("SELECT * FROM workspace_proposals WHERE workspace_id=? AND status='pending' ORDER BY created_at DESC").all(id).map((p) => ({
        id: p.id, kind: p.kind, note: p.note, baseVersion: p.base_version, createdAt: p.created_at,
        draft: parse(p.after_json), changes: diffDrafts(parse(p.before_json), parse(p.after_json)),
      }));
      const events = db.prepare("SELECT coalesce(max(sequence),0) AS sequence FROM workspace_events WHERE workspace_id=?").get(id);
      const savedItem = value.content_id ? contents.get(value.content_id) : null;
      return {
        id, contentId: value.content_id, conversationId: value.conversation_id,
        draft: parse(value.draft_json), version: Number(value.version), savedVersion: Number(value.saved_version),
        baseRevisionId: value.base_revision_id, disposition: value.disposition, updatedAt: value.updated_at, createdAt: value.created_at,
        item: savedItem,
        externalChanged: Boolean(savedItem && savedItem.revision.id !== value.base_revision_id),
        publication: publication ? { revisionId: publication.revision_id, item: parse(publication.snapshot_json), updatedAt: publication.updated_at } : null,
        conversation: contents.getConversation(value.conversation_id),
        proposals,
        sources: db.prepare("SELECT id, url, title, text, kind, created_at AS createdAt FROM workspace_sources WHERE workspace_id=? ORDER BY id").all(id),
        changes: db.prepare("SELECT id, version, kind, note, operation_id AS operationId, created_at AS createdAt FROM workspace_changes WHERE workspace_id=? ORDER BY version DESC LIMIT 40").all(id),
        operations: db.prepare("SELECT * FROM workspace_operations WHERE workspace_id=? ORDER BY created_at DESC LIMIT 30").all(id).map(operation),
        exportJob: db.prepare("SELECT id, status, error, updated_at AS updatedAt FROM content_export_jobs WHERE workspace_id=? ORDER BY id DESC LIMIT 1").get(id) || null,
        sequence: Number(events.sequence),
      };
    },
    open({ id = randomUUID(), contentId, conversationId, draft = {} } = {}) {
      const existing = db.prepare("SELECT id FROM curator_workspaces WHERE id=? OR (? IS NOT NULL AND content_id=?) OR (? IS NOT NULL AND conversation_id=?)")
        .get(id, contentId || null, contentId || null, conversationId || null, conversationId || null);
      if (existing) return store.get(existing.id);
      const item = contentId ? contents.get(contentId) : null;
      if (contentId && !item) throw workspaceError("找不到对应资源", "not-found", 404);
      if (item && !WORKSPACE_TYPES.includes(item.blockType)) throw workspaceError("这个内容类型尚未接入资源工作区，原内容已保留");
      if (item) {
        const byContent = db.prepare("SELECT id FROM curator_workspaces WHERE content_id=?").get(item.id);
        if (byContent) return store.get(byContent.id);
      }
      const conversation = conversationId ? contents.getConversation(conversationId) : contents.createConversation({ contentId: item?.id || null });
      if (!conversation) throw workspaceError("找不到原对话", "not-found", 404);
      if (conversation.contentId && !item) return store.open({ contentId: conversation.contentId });
      const working = normalizeWorkingDraft(item || draft, item?.id || draft.id || randomUUID());
      withTransaction(db, () => {
        db.prepare("INSERT INTO curator_workspaces(id,content_id,conversation_id,draft_json,saved_version,base_revision_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)")
          .run(id, item?.id || null, conversation.id, json(working), item ? 1 : 0, item?.revision?.id || null, at(), at());
        emit(id, "workspace.created", { contentId: item?.id || null });
      });
      return store.get(id);
    },
    list() {
      return db.prepare(`SELECT w.*, (SELECT status FROM workspace_operations o WHERE o.workspace_id=w.id ORDER BY created_at DESC LIMIT 1) AS operation_status,
        (SELECT COUNT(*) FROM workspace_proposals p WHERE p.workspace_id=w.id AND p.status='pending') AS pending_proposals
        FROM curator_workspaces w ORDER BY updated_at DESC`).all().map((w) => {
        const draft = parse(w.draft_json);
        return { id: w.id, contentId: w.content_id, title: draft.title || draft.sourceUrl || "未命名资源", blockType: draft.blockType,
          disposition: w.disposition, version: w.version, savedVersion: w.saved_version, operationStatus: w.operation_status, proposalCount: Number(w.pending_proposals || 0), updatedAt: w.updated_at };
      });
    },
    update(id, draft, expectedVersion, { kind = "manual", note = "手动编辑" } = {}) {
      withTransaction(db, () => { const value = row(id); expect(value, expectedVersion);
        if (draft.blockType !== parse(value.draft_json).blockType) throw workspaceError("请通过类型转换预览修改内容类型");
        writeWithin(value, draft, kind, note);
      });
      return store.get(id);
    },
    merge(id, base, proposed, { note = "AI 修改", preview = false, kind = "agent", operationId = null } = {}) {
      let proposalId = null;
      withTransaction(db, () => {
        let value = row(id);
        const current = parse(value.draft_json);
        const result = mergeWorkingDraft(base, current, proposed);
        if (preview || result.conflicts.length) {
          const intended = mergeWorkingDraft(base, current, proposed, true).draft;
          if (!preview && result.conflicts.length) value = writeWithin(value, result.draft, kind, `${note}（无冲突部分）`, operationId);
          proposalId = proposalWithin(value, intended, result.conflicts.length ? "conflict" : kind,
            result.conflicts.length ? `${note}；部分字段在处理期间已修改，请检查差异` : note);
        } else writeWithin(value, result.draft, kind, note, operationId);
      });
      return { workspace: store.get(id), proposalId };
    },
    proposeConversion(id, targetType, expectedVersion) {
      let proposalId;
      withTransaction(db, () => {
        const value = row(id); expect(value, expectedVersion);
        const current = parse(value.draft_json);
        const old = db.prepare("SELECT before_json,after_json FROM workspace_changes WHERE workspace_id=? ORDER BY version DESC").all(id)
          .flatMap((c) => [parse(c.after_json), parse(c.before_json)]).find((c) => c.blockType === targetType);
        const next = convertWorkingDraft(current, targetType, old);
        proposalId = proposalWithin(value, next, "conversion", `${TYPE_NAMES[current.blockType]}转为${TYPE_NAMES[targetType]}；原有字段完整保留在历史中`);
      });
      return { workspace: store.get(id), proposalId };
    },
    resolveProposal(id, proposalId, action, expectedVersion, { operationId = null } = {}) {
      withTransaction(db, () => {
        const value = row(id); expect(value, expectedVersion);
        const proposal = db.prepare("SELECT * FROM workspace_proposals WHERE id=? AND workspace_id=? AND status='pending'").get(proposalId, id);
        if (!proposal) throw workspaceError("这个提案已处理，请刷新工作区", "stale-proposal", 409);
        if (action === "apply") {
          if (proposal.base_version !== value.version) throw workspaceError("草稿在预览后有新修改，请重新生成提案后检查", "stale-proposal", 409);
          writeWithin(value, parse(proposal.after_json), proposal.kind, proposal.note, operationId);
        }
        db.prepare("UPDATE workspace_proposals SET status=? WHERE id=?").run(action === "apply" ? "applied" : "dismissed", proposalId);
        emit(id, "proposal.resolved", { proposalId, action });
      });
      return store.get(id);
    },
    history(id, changeId) {
      row(id);
      const change = db.prepare("SELECT * FROM workspace_changes WHERE workspace_id=? AND id=?").get(id, Number(changeId));
      if (!change) throw workspaceError("找不到这个修改版本", "not-found", 404);
      return { ...change, before: parse(change.before_json), after: parse(change.after_json), changes: diffDrafts(parse(change.before_json), parse(change.after_json)) };
    },
    undo(id, changeId, expectedVersion, { operationId = null } = {}) {
      expect(row(id), expectedVersion);
      const change = store.history(id, changeId);
      return store.merge(id, change.after, change.before, { kind: "undo", note: `撤销：${change.note}`, operationId }).workspace;
    },
    rebase(id, expectedVersion) {
      withTransaction(db, () => {
        let value = row(id); expect(value, expectedVersion);
        const latest = contents.get(value.content_id);
        if (!latest || latest.revision.id === value.base_revision_id) return;
        const revision = db.prepare("SELECT snapshot_json FROM content_revisions WHERE id=?").get(value.base_revision_id);
        if (!revision?.snapshot_json) throw workspaceError("旧保存版本缺少完整快照，请先从修改记录导出草稿后检查");
        // Normalize all three sides the same way: a draft written before a field
        // existed (cover) must not read as a local edit against the filled-in base.
        const stored = parse(value.draft_json);
        const before = normalizeWorkingDraft(parse(revision.snapshot_json)), current = normalizeWorkingDraft(stored, stored.id), next = normalizeWorkingDraft(latest);
        const merged = mergeWorkingDraft(before, current, next);
        value = writeWithin(value, merged.draft, "external", "合并资源库的已保存版本");
        if (merged.conflicts.length) proposalWithin(value, mergeWorkingDraft(before, current, next, true).draft, "conflict", "已合并无冲突字段；这些字段与当前工作草稿不同，请选择保留当前内容或采用资源库版本");
        db.prepare("UPDATE curator_workspaces SET base_revision_id=?, saved_version=?, updated_at=? WHERE id=?").run(latest.revision.id, same(merged.draft, next) ? value.version : value.saved_version, at(), id);
        emit(id, "workspace.rebased", { revisionId: latest.revision.id });
      });
      return store.get(id);
    },
    save(id, expectedVersion, { publish = false, archive = false } = {}) {
      withTransaction(db, () => {
        let value = row(id); expect(value, expectedVersion);
        let draft = parse(value.draft_json);
        if (!draft.title.trim()) throw workspaceError("请填写资源名称");
        const slug = draft.slug.trim() || draft.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `resource-${draft.id.slice(0, 8)}`;
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw workspaceError("Slug 只能使用小写字母、数字和连字符");
        value = writeWithin(value, { ...draft, title: draft.title.trim(), slug }, "manual", "补齐保存信息");
        draft = parse(value.draft_json);
        const current = value.content_id ? contents.get(value.content_id) : null;
        if (current && current.revision.id !== value.base_revision_id) throw workspaceError("资源已在其他位置更新，重新载入后再保存", "stale-revision", 409);
        const occupied = contents.get(draft.slug);
        if (occupied && occupied.id !== draft.id) throw workspaceError("Slug 已被其他资源占用", "slug-conflict", 409);
        const alias = db.prepare("SELECT item_id FROM content_route_aliases WHERE slug=? AND item_id<>?").get(slug, draft.id);
        if (alias) throw workspaceError("这个 Slug 已用于其他资源的旧链接，请更换", "slug-conflict", 409);
        const next = { ...draft, status: archive ? "archived" : publish ? "active" : current?.status || "draft" };
        assertContentItemShape(next);
        if (publish) validateContentPayload({ ...next, status: "active" });
        else for (const link of next.payload.links || []) if (link.url.trim()) assertUrlShape(link.url);
        let saved = current;
        if (!saved || value.saved_version !== value.version || next.status !== current.status) saved = saveItemWithin(db, next,
          { expectedRevisionId: value.base_revision_id ?? undefined, note: publish ? "更新公开版本" : archive ? "归档资源" : "保存工作草稿", publish: false });
        db.prepare("UPDATE curator_workspaces SET content_id=?, saved_version=version, base_revision_id=?, disposition=CASE WHEN EXISTS(SELECT 1 FROM workspace_operations WHERE workspace_id=curator_workspaces.id AND status IN ('queued','running')) OR EXISTS(SELECT 1 FROM workspace_proposals WHERE workspace_id=curator_workspaces.id AND status='pending') THEN 'open' ELSE 'done' END, updated_at=? WHERE id=?")
          .run(saved.id, saved.revision.id, at(), id);
        db.prepare("UPDATE conversations SET content_id=?, title=?, updated_at=? WHERE id=?").run(saved.id, saved.title, at(), value.conversation_id);
        if (publish || archive) {
          publishItemWithin(db, saved);
          db.prepare("INSERT OR IGNORE INTO content_export_jobs(workspace_id,revision_id,snapshot_json,created_at,updated_at) VALUES (?,?,?,?,?)").run(id, saved.revision.id, json(saved), at(), at());
        }
        emit(id, "workspace.saved", { revisionId: saved.revision.id, publish, archive });
      });
      return store.get(id);
    },
    batchStatus(ids, status) {
      if (!["active", "archived"].includes(status)) throw workspaceError("批量操作只支持加入公开目录或归档");
      const entries = [...new Set(ids)].map((id) => contents.get(id)).filter(Boolean);
      for (const item of entries) validateContentPayload({ ...item, status });
      const workspaces = new Map(entries.map((item) => [item.id, store.open({ contentId: item.id })]));
      withTransaction(db, () => {
        for (const item of entries) {
          const saved = item.status === status ? item : saveItemWithin(db, { ...item, status }, { expectedRevisionId: item.revision.id, note: status === "active" ? "批量加入公开目录" : "批量归档", publish: false });
          const workspace = workspaces.get(item.id);
          // Only the saved item's status changed; keep every working field and
          // its dirty version while advancing the saved-version comparison.
          if (workspace.baseRevisionId === item.revision.id) db.prepare("UPDATE curator_workspaces SET base_revision_id=? WHERE id=?").run(saved.revision.id, workspace.id);
          publishItemWithin(db, saved);
          db.prepare("INSERT OR IGNORE INTO content_export_jobs(workspace_id,revision_id,snapshot_json,created_at,updated_at) VALUES (?,?,?,?,?)").run(workspace.id, saved.revision.id, json(saved), at(), at());
          emit(workspace.id, "publication.updated", { status, revisionId: saved.revision.id });
        }
      });
      return entries.length;
    },
    addSource(id, { url = "", title = "", text = "", kind = "page" }) {
      row(id);
      const body = String(text), sourceUrl = String(url), sourceKind = String(kind);
      const existing = db.prepare("SELECT id FROM workspace_sources WHERE workspace_id=? AND url=? AND kind=? AND text=?").get(id, sourceUrl, sourceKind, body);
      if (!existing) db.prepare("INSERT INTO workspace_sources(workspace_id,url,title,text,kind,created_at) VALUES (?,?,?,?,?,?)")
        .run(id, sourceUrl, String(title), body, sourceKind, at());
      emit(id, "source.updated", { url, title, kind });
      return store.get(id);
    },
    addMessage(id, message) { const w = row(id); const added = contents.addMessage(w.conversation_id, message); emit(id, "message.created", { id: added.id }); return added; },
    emit,
    events(id, after = 0) {
      row(id);
      return db.prepare("SELECT * FROM workspace_events WHERE workspace_id=? AND sequence>? ORDER BY sequence LIMIT 500").all(id, after).map((e) => ({
        sequence: e.sequence, operationId: e.operation_id, type: e.type, data: parse(e.data_json), createdAt: e.created_at,
      }));
    },
    createOperation(id, input, requestId) {
      row(id);
      const existing = db.prepare("SELECT * FROM workspace_operations WHERE workspace_id=? AND request_id=?").get(id, requestId);
      if (existing) return { operation: operation(existing), created: false };
      const opId = randomUUID(), createdAt = at();
      withTransaction(db, () => {
        db.prepare("INSERT INTO workspace_operations(id,request_id,workspace_id,status,input_json,created_at,updated_at) VALUES (?,?,?,'queued',?,?,?)")
          .run(opId, requestId, id, json(input), createdAt, createdAt);
        db.prepare("UPDATE curator_workspaces SET disposition='open',updated_at=? WHERE id=?").run(createdAt, id);
        emit(id, "operation.queued", { id: opId, text: input.text }, opId);
      });
      return { operation: store.operation(opId), created: true };
    },
    nextOperation(id) { return operation(db.prepare("SELECT * FROM workspace_operations WHERE workspace_id=? AND status='queued' ORDER BY created_at, rowid LIMIT 1").get(id)); },
    operation(id) { return operation(db.prepare("SELECT * FROM workspace_operations WHERE id=?").get(id)); },
    setOperation(id, status, { result = null, error = "" } = {}) {
      const current = store.operation(id);
      if (!current) throw workspaceError("找不到这个处理任务", "not-found", 404);
      db.prepare("UPDATE workspace_operations SET status=?, result_json=?, error=?, updated_at=? WHERE id=?").run(status, json(result), error, at(), id);
      emit(current.workspaceId, "operation.updated", { id, status, error }, id);
      return store.operation(id);
    },
    interruptOrphans() {
      const pending = db.prepare("SELECT id FROM workspace_operations WHERE status IN ('running','queued')").all();
      for (const item of pending) {
        const op = store.setOperation(item.id, "failed", { error: "服务已重启，处理被中断。已有资料和草稿已保留，可继续处理。" });
        store.addMessage(op.workspaceId, { role: "assistant", text: op.error, kind: "workspace-result", data: { operationId: op.id, status: "failed" }, runId: op.id });
      }
    },
    dismiss(id) {
      if (db.prepare("SELECT id FROM workspace_operations WHERE workspace_id=? AND status='running'").get(id)) throw workspaceError("请先停止当前处理");
      db.prepare("UPDATE curator_workspaces SET disposition='dismissed',updated_at=? WHERE id=?").run(at(), id);
      for (const op of db.prepare("SELECT id FROM workspace_operations WHERE workspace_id=? AND status='queued'").all(id)) store.setOperation(op.id, "cancelled");
      emit(id, "workspace.dismissed", {});
      return store.get(id);
    },
    exportJobs() { return db.prepare("SELECT * FROM content_export_jobs WHERE status<>'completed' ORDER BY id").all(); },
    finishExports(ids, error = "") {
      withTransaction(db, () => { for (const id of ids) db.prepare("UPDATE content_export_jobs SET status=?,error=?,updated_at=? WHERE id=?")
        .run(error ? "failed" : "completed", error, at(), id); });
    },
  };
  return store;
}
