import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createContentRepository, openContentDb } from "./curator-db.mjs";
import { createWorkspaceStore } from "./curator-workspace-store.mjs";
import { normalizeWorkingDraft, patchWorkingDraft, same } from "./curator-workspace-data.mjs";

function example(type = "skill") {
  return normalizeWorkingDraft({ id: "example", title: "Example", slug: "example", blockType: type,
    category: "coding", sourceUrl: "https://example.com", tags: ["web"],
    payload: { summary: { zh: "示例摘要", en: "Example summary" }, body: { zh: "原始长正文", en: "Original article" },
      tagline: { zh: "示例定位", en: "Example tagline" }, url: "https://example.com", links: [] } });
}
async function fixture(fn) {
  const root = await mkdtemp(path.join(os.tmpdir(), "curator-workspace-"));
  const dbFile = path.join(root, "content.sqlite");
  const db = await openContentDb({ file: dbFile });
  try { await fn(createWorkspaceStore(db), createContentRepository(db), { root, dbFile, db }); }
  finally { db.close(); await rm(root, { recursive: true, force: true }); }
}

test("editing and saving an active resource never changes its public snapshot", async () => fixture((store, contents) => {
  contents.save({ ...example(), status: "active" });
  const original = contents.published()[0];
  let w = store.open({ contentId: "example" });
  w = store.update(w.id, { ...w.draft, title: "Changed" }, w.version);
  assert.equal(contents.get("example").title, "Example");
  w = store.save(w.id, w.version);
  assert.equal(contents.get("example").title, "Changed");
  assert.deepEqual(contents.published()[0], original);
  const savedRevision = w.baseRevisionId;
  w = store.save(w.id, w.version);
  assert.equal(w.baseRevisionId, savedRevision, "repeat save must be idempotent");
  w = store.save(w.id, w.version, { publish: true });
  assert.equal(contents.published()[0].title, "Changed");
  assert.equal(w.publication.revisionId, savedRevision);
  assert.equal(store.exportJobs().length, 1);
}));

test("type conversion keeps identity, conversation, original long text, and invalidates category", async () => fixture((store, contents) => {
  const item = contents.save({ ...example(), status: "active" });
  let w = store.open({ contentId: item.id });
  store.addMessage(w.id, { role: "user", text: "这是站点" });
  const conversationId = w.conversationId;
  const converted = store.proposeConversion(w.id, "site", w.version);
  w = store.resolveProposal(w.id, converted.proposalId, "apply", w.version);
  assert.equal(w.draft.blockType, "site");
  assert.equal(w.draft.category, "");
  assert.equal(w.draft.payload.url, "https://example.com");
  assert.equal(w.conversationId, conversationId);
  assert.equal(w.conversation.messages.length, 1);
  const change = store.history(w.id, w.changes[0].id);
  assert.equal(change.before.payload.body.zh, "原始长正文");
  w = store.save(w.id, w.version);
  assert.equal(contents.published()[0].blockType, "skill");
  assert.equal(contents.list().length, 1);
  assert.equal(contents.get(item.id).blockType, "site");
  const reverted = store.proposeConversion(w.id, "skill", w.version);
  w = store.resolveProposal(w.id, reverted.proposalId, "apply", w.version);
  assert.equal(w.draft.payload.body.zh, "原始长正文");
}));

test("new drafts can be incomplete, preserve one workspace on save, and never publish implicitly", async () => fixture((store, contents) => {
  let w = store.open({ id: "request-one", draft: { title: "Partial", blockType: "site" } });
  assert.equal(contents.list().length, 0);
  assert.equal(store.open({ id: "request-one" }).id, w.id);
  w = store.save(w.id, w.version);
  assert.equal(w.draft.slug, "partial");
  assert.equal(contents.list().length, 1);
  assert.equal(contents.published().length, 0);
  assert.equal(store.open({ contentId: w.contentId }).id, w.id);
  assert.throws(() => store.save(w.id, w.version, { publish: true }), /中英文简介/);
  assert.equal(contents.published().length, 0);
}));

test("three-way AI changes merge independent manual edits and turn conflicts into proposals", async () => fixture((store) => {
  let w = store.open({ draft: example() });
  const base = w.draft;
  w = store.update(w.id, { ...w.draft, title: "Hand edited" }, w.version);
  const proposed = patchWorkingDraft(base, [{ path: "payload.summary.zh", value: "更短的摘要" }]);
  w = store.merge(w.id, base, proposed).workspace;
  assert.equal(w.draft.title, "Hand edited");
  assert.equal(w.draft.payload.summary.zh, "更短的摘要");
  const older = w.draft;
  w = store.update(w.id, patchWorkingDraft(w.draft, [{ path: "payload.summary.zh", value: "手工摘要" }]), w.version);
  const result = store.merge(w.id, older, patchWorkingDraft(older, [{ path: "payload.summary.zh", value: "AI 摘要" }]));
  assert.ok(result.proposalId);
  assert.equal(result.workspace.draft.payload.summary.zh, "手工摘要");
  assert.equal(result.workspace.proposals[0].draft.payload.summary.zh, "AI 摘要");
  assert.equal(result.workspace.proposals[0].kind, "conflict");
}));

test("stale drafts and stale previews cannot overwrite newer work", async () => fixture((store) => {
  let w = store.open({ draft: example() });
  const proposal = store.proposeConversion(w.id, "site", w.version);
  const before = w.version;
  w = store.update(w.id, { ...w.draft, title: "Newer" }, w.version);
  assert.throws(() => store.update(w.id, example(), before), /草稿已更新/);
  assert.throws(() => store.resolveProposal(w.id, proposal.proposalId, "apply", w.version), /新修改/);
  assert.equal(store.get(w.id).draft.title, "Newer");
}));

test("undo restores just the changed fields and preserves subsequent manual work", async () => fixture((store) => {
  let w = store.open({ draft: example() });
  const base = w.draft;
  w = store.merge(w.id, base, patchWorkingDraft(base, [{ path: "payload.summary.zh", value: "AI 修改" }])).workspace;
  const changeId = w.changes[0].id;
  w = store.update(w.id, { ...w.draft, title: "Keep this title" }, w.version);
  w = store.undo(w.id, changeId, w.version);
  assert.equal(w.draft.title, "Keep this title");
  assert.equal(w.draft.payload.summary.zh, base.payload.summary.zh);
}));

test("operation requests are idempotent and service interruption remains a real failure", async () => fixture((store) => {
  const w = store.open({ draft: example() });
  const first = store.createOperation(w.id, { text: "摘要短一点" }, "one");
  const retry = store.createOperation(w.id, { text: "摘要短一点" }, "one");
  assert.equal(first.operation.id, retry.operation.id);
  assert.equal(retry.created, false);
  store.setOperation(first.operation.id, "running");
  store.interruptOrphans();
  assert.equal(store.operation(first.operation.id).status, "failed");
  assert.equal(store.get(w.id).conversation.messages.length, 1);
  store.dismiss(w.id);
  assert.equal(store.get(w.id).disposition, "dismissed");
  assert.equal(store.operation(first.operation.id).status, "failed");
  assert.ok(same(store.get(w.id).draft, w.draft));
}));

test("field tools cannot change type, publication status, identity, or prototype keys", () => {
  for (const path of ["blockType", "status", "id", "payload.__proto__.polluted", "payload.summary.constructor"]) {
    assert.throws(() => patchWorkingDraft(example(), [{ path, value: "unsafe" }]), /不能修改/);
  }
  assert.throws(() => patchWorkingDraft(example(), [{ path: "payload.summary.zh", value: 42 }]), /格式不正确/);
  assert.equal({}.polluted, undefined);
});

test("conflicting fields do not block safe first-draft fields, and keeping current retains the useful draft", async () => fixture((store) => {
  const w = store.open({ draft: example() }), base = w.draft;
  store.update(w.id, { ...base, title: "Keep my title" }, w.version);
  const proposed = patchWorkingDraft(base, [{ path: "title", value: "AI title" }, { path: "payload.summary.zh", value: "Useful draft summary" }]);
  const merged = store.merge(w.id, base, proposed);
  assert.equal(merged.workspace.draft.title, "Keep my title");
  assert.equal(merged.workspace.draft.payload.summary.zh, "Useful draft summary");
  assert.deepEqual(merged.workspace.proposals[0].changes.map((c) => c.path), ["title"]);
  const kept = store.resolveProposal(w.id, merged.proposalId, "dismiss", merged.workspace.version);
  assert.equal(kept.draft.payload.summary.zh, "Useful draft summary");
}));

test("batch publication preserves unsaved workspace fields and does not leave its base revision stale", async () => fixture((store, contents) => {
  contents.save({ ...example(), status: "draft" });
  let w = store.open({ contentId: "example" });
  w = store.update(w.id, { ...w.draft, title: "Unsaved manual title" }, w.version);
  store.batchStatus(["example"], "active");
  w = store.get(w.id);
  assert.equal(contents.published()[0].title, "Example");
  assert.equal(w.draft.title, "Unsaved manual title");
  assert.equal(w.baseRevisionId, contents.get("example").revision.id);
  assert.doesNotThrow(() => store.save(w.id, w.version));
}));

test("later pasted sources cannot overwrite the original source", async () => fixture((store) => {
  const w = store.open();
  store.addSource(w.id, { text: "Original prompt", kind: "pasted" });
  store.addSource(w.id, { text: "Follow-up evidence", kind: "pasted" });
  store.addSource(w.id, { text: "Follow-up evidence", kind: "pasted" });
  assert.deepEqual(store.get(w.id).sources.map((s) => s.text), ["Original prompt", "Follow-up evidence"]);
}));

test("external saved changes can be rebased without losing the working draft or trapping future saves", async () => fixture((store, contents) => {
  contents.save({ ...example(), status: "active" });
  let w = store.open({ contentId: "example" });
  w = store.update(w.id, { ...w.draft, title: "Manual working title" }, w.version);
  const item = contents.get("example");
  contents.save({ ...item, payload: { ...item.payload, summary: { zh: "Updated elsewhere", en: "Other edit" } } }, { expectedRevisionId: item.revision.id, publish: false });
  assert.equal(store.get(w.id).externalChanged, true);
  assert.throws(() => store.save(w.id, w.version), /其他位置/);
  w = store.rebase(w.id, w.version);
  assert.equal(w.draft.title, "Manual working title");
  assert.equal(w.draft.payload.summary.zh, "Updated elsewhere");
  assert.equal(w.externalChanged, false);
  assert.doesNotThrow(() => store.save(w.id, w.version));
}));

test("old editor slugs resolve immediately after draft save without exposing a private alias publicly", async () => fixture((store, contents) => {
  contents.save({ ...example(), id: "stable-id", status: "draft" });
  let w = store.open({ contentId: "stable-id" });
  w = store.update(w.id, { ...w.draft, slug: "renamed" }, w.version);
  store.save(w.id, w.version);
  assert.equal(contents.get("example").slug, "renamed");
  assert.equal(contents.routeAliases().length, 0);
}));
