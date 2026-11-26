import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { openContentDb, createContentRepository } from "./curator-db.mjs";
import { createWorkspaceStore } from "./curator-workspace-store.mjs";
import { createWorkspaceService } from "./curator-workspace-service.mjs";
import { normalizeWorkingDraft } from "./curator-workspace-data.mjs";
import { exportContent } from "./curator-export.mjs";

async function fixture(fn) {
  const root = await mkdtemp(path.join(os.tmpdir(), "curator-service-")), dbFile = path.join(root, "content.sqlite"), outputRoot = path.join(root, "public");
  const db = await openContentDb({ file: dbFile });
  try { await fn({ db, root, dbFile, outputRoot, exportNow: () => exportContent({ dbFile, outputRoot, write: true }) }); }
  finally { db.close(); await rm(root, { recursive: true, force: true }); }
}
const example = () => ({ ...normalizeWorkingDraft({ id: "sample", slug: "sample", title: "Sample", blockType: "skill", category: "coding", sourceUrl: "https://example.com", payload: { summary: { zh: "测试简介", en: "Test summary" }, body: { zh: "完整原文", en: "Original" }, links: [] } }), status: "active" });
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
async function until(check) {
  const deadline = Date.now() + 2000;
  while (!check()) { if (Date.now() > deadline) throw new Error("Timed out waiting for local operation"); await new Promise((resolve) => setImmediate(resolve)); }
}

test("queued operations use the latest draft and a stopped run settles before the next starts", async () => fixture(async ({ db }) => {
  const first = deferred(), started = [], finished = deferred();
  const service = createWorkspaceService(db, { exportContent: async () => {}, runAgent: async ({ store, workspaceId, text, signal }) => {
    started.push({ text, title: store.get(workspaceId).draft.title });
    if (text === "first") { await first.promise; signal.throwIfAborted(); }
    else finished.resolve();
    return { text: `${text} finished` };
  } });
  const w = service.store.open({ draft: { title: "Before" } });
  const a = service.submit(w.id, { text: "first", requestId: "one" });
  service.submit(w.id, { text: "second", requestId: "two" });
  service.submit(w.id, { text: "second", requestId: "two" });
  assert.equal(service.store.get(w.id).operations.length, 2);
  assert.equal(service.store.get(w.id).conversation.messages.length, 2);
  service.store.update(w.id, { ...w.draft, title: "Manual edit while running" }, w.version);
  service.stop(w.id, a.operations[0].id);
  assert.equal(started.length, 1, "abort cannot start the next writer before the old one settles");
  first.resolve(); await finished.promise;
  await until(() => service.store.get(w.id).operations.every((o) => !["queued", "running"].includes(o.status)));
  assert.deepEqual(started[1], { text: "second", title: "Manual edit while running" });
  assert.equal(service.store.operation(a.operations[0].id).status, "cancelled");
}));

test("first draft persists sources and preserves the exact original prompt without automatic postprocessing", async () => fixture(async ({ db }) => {
  let calls = 0;
  const service = createWorkspaceService(db, { exportContent: async () => {}, runDraft: async (options) => {
    calls++; options.onEvidence({ url: "https://example.com", text: "Evidence" });
    return { model: "test", draft: { name: "Prompt", slug: "prompt", blockType: "prompt", kind: "prompt", prompt: "model changed the source", summary: { zh: "摘要", en: "Summary" } } };
  } });
  const w = service.store.open({ draft: { blockType: "prompt", payload: { prompt: "Original\n\n  {{name}}  " } } });
  service.submit(w.id, { text: "整理", mode: "ingest", requestId: "first" });
  await until(() => service.store.get(w.id).operations[0].status === "completed");
  const current = service.store.get(w.id);
  assert.equal(current.draft.payload.prompt, "Original\n\n  {{name}}  ");
  assert.equal(current.sources[0].text, "Evidence");
  assert.equal(current.contentId, null);
  assert.equal(calls, 1, "no mandatory polish or translation request");
  assert.ok(current.operations[0].result.timings.firstDraftAt);
}));

test("publication conversion removes old output, exports aliases, and does not touch unrelated files", async () => fixture(async ({ db, outputRoot, exportNow }) => {
  const contents = createContentRepository(db), store = createWorkspaceStore(db);
  contents.save(example());
  await exportNow();
  const untouched = path.join(outputRoot, "content/skills/private-note.md");
  await writeFile(untouched, "unrelated local work");
  let w = store.open({ contentId: "sample" });
  const proposal = store.proposeConversion(w.id, "site", w.version);
  w = store.resolveProposal(w.id, proposal.proposalId, "apply", w.version);
  w = store.update(w.id, { ...w.draft, category: "navigation" }, w.version);
  // Select an actual site category from the test vocabulary, independently of UI.
  const { categoriesForBlock } = await import("./curator-tags.mjs");
  w = store.update(w.id, { ...w.draft, category: categoriesForBlock("site")[0].id }, w.version);
  w = store.save(w.id, w.version);
  await exportNow();
  assert.ok(await readFile(path.join(outputRoot, "content/skills/sample.md"), "utf8"), "draft save retains old public file");
  w = store.save(w.id, w.version, { publish: true });
  await exportNow();
  await assert.rejects(access(path.join(outputRoot, "content/skills/sample.md")));
  assert.ok(await readFile(path.join(outputRoot, "content/sites/sample.md"), "utf8"));
  const aliases = JSON.parse(await readFile(path.join(outputRoot, "data/route-aliases.json"), "utf8"));
  assert.equal(aliases[0].blockType, "skill"); assert.equal(aliases[0].targetBlockType, "site");
  assert.equal(await readFile(untouched, "utf8"), "unrelated local work");
  assert.equal(store.history(w.id, w.changes.find((c) => c.kind === "conversion").id).before.payload.body.zh, "完整原文");
}));

test("export conflicts preserve all files and failed export retries do not create another revision or conversation", async () => fixture(async ({ db, outputRoot, exportNow }) => {
  const contents = createContentRepository(db);
  contents.save(example()); await exportNow();
  const service = createWorkspaceService(db, { exportContent: exportNow });
  let w = service.store.open({ contentId: "sample" });
  const originalFile = await readFile(path.join(outputRoot, "content/skills/sample.md"), "utf8");
  const originalTools = await readFile(path.join(outputRoot, "data/tools.json"), "utf8");
  await writeFile(path.join(outputRoot, "content/skills/sample.md"), originalFile + "\nmanual file edit");
  w = service.store.update(w.id, { ...w.draft, title: "Updated title" }, w.version);
  w = service.store.save(w.id, w.version, { publish: true });
  const revision = w.baseRevisionId, conversation = w.conversationId;
  await service.exportPending();
  assert.equal(service.store.get(w.id).exportJob.status, "failed");
  assert.equal(await readFile(path.join(outputRoot, "content/skills/sample.md"), "utf8"), originalFile + "\nmanual file edit");
  assert.equal(await readFile(path.join(outputRoot, "data/tools.json"), "utf8"), originalTools);
  await writeFile(path.join(outputRoot, "content/skills/sample.md"), originalFile);
  await service.exportPending();
  const done = service.store.get(w.id);
  assert.equal(done.exportJob.status, "completed"); assert.equal(done.baseRevisionId, revision); assert.equal(done.conversationId, conversation);
  service.store.save(w.id, done.version, { publish: true });
  assert.equal(db.prepare("SELECT count(*) AS n FROM content_export_jobs").get().n, 1, "same publication is idempotent");
}));

test("incomplete related links can be saved as drafts but cannot be published", async () => fixture(({ db }) => {
  const store = createWorkspaceStore(db);
  const w = store.open({ draft: { ...example(), payload: { ...example().payload, links: [{ label: "", url: "", kind: "other" }] } } });
  const saved = store.save(w.id, w.version);
  assert.equal(saved.item.payload.links.length, 1);
  assert.throws(() => store.save(w.id, saved.version, { publish: true }), /名称和地址/);
}));

test("icon collection follows the first draft and its failure does not fail the draft", async () => {
  for (const fail of [false, true]) await fixture(async ({ db }) => {
    let collected = false;
    const service = createWorkspaceService(db, {
      exportContent: async () => {},
      runDraft: async (options) => { options.onEvidence({ url: "https://example.com", text: "Official source", kind: "page" }); return { draft: { name: "Example", blockType: "tool", url: "https://example.com", logoUrl: "https://example.com/icon.png", summary: { zh: "介绍", en: "Intro" } } }; },
      collectLogo: async (options) => {
        collected = true;
        assert.equal(service.store.get(w.id).draft.title, "Example", "first draft is already available before downloading the icon");
        assert.equal(options.logoUrl, "https://example.com/icon.png");
        if (fail) throw new Error("Icon unavailable");
        return { logo: "/logos/verified.png", sourceUrl: options.logoUrl };
      },
    });
    const w = service.store.open({ draft: { sourceUrl: "https://example.com" } });
    service.submit(w.id, { text: "整理", mode: "ingest", requestId: "with-icon" });
    await until(() => service.store.get(w.id).operations[0].status === "completed");
    const current = service.store.get(w.id);
    assert.ok(collected);
    assert.equal(current.operations[0].result.logo.status, fail ? "failed" : "completed");
    assert.equal(current.draft.title, "Example");
    if (!fail) assert.equal(current.draft.payload.logo, "/logos/verified.png");
  });
});

test("cover collection follows the first draft and its failure does not fail the draft", async () => {
  for (const fail of [false, true]) await fixture(async ({ db }) => {
    const pages = [];
    const service = createWorkspaceService(db, {
      exportContent: async () => {},
      runDraft: async (options) => { options.onEvidence({ url: "https://example.com", text: "Official source", kind: "page" }); return { draft: { name: "Example", blockType: "site", url: "https://example.com", summary: { zh: "介绍", en: "Intro" } } }; },
      collectCover: async (options) => {
        pages.push(options.pageUrl);
        assert.equal(service.store.get(w.id).draft.title, "Example", "first draft is already available before capturing the cover");
        if (fail) throw new Error("Blank page");
        return { cover: `/covers/sample-${pages.length}.webp`, method: "screenshot" };
      },
    });
    const w = service.store.open({ draft: { sourceUrl: "https://example.com" } });
    service.submit(w.id, { text: "整理", mode: "ingest", requestId: "with-cover" });
    await until(() => service.store.get(w.id).operations[0].status === "completed");
    const current = service.store.get(w.id);
    assert.deepEqual(pages, ["https://example.com"]);
    assert.equal(current.operations[0].result.cover.status, fail ? "failed" : "completed");
    assert.equal(current.draft.title, "Example");
    if (!fail) assert.equal(current.draft.payload.cover, "/covers/sample-1.webp");
  });
});

test("cover survives a workspace round trip and reaches the export", async () => fixture(async ({ db, outputRoot, exportNow }) => {
  const store = createWorkspaceStore(db);
  const draft = { ...example(), blockType: "site", category: "ui-components", payload: { summary: { zh: "介绍", en: "Intro" }, url: "https://example.com", cover: "/covers/sample-abc.webp" } };
  const w = store.open({ draft });
  assert.equal(store.get(w.id).draft.payload.cover, "/covers/sample-abc.webp");
  store.save(w.id, w.version, { publish: true });
  await exportNow();
  const exported = await readFile(path.join(outputRoot, "content", "sites", "sample.md"), "utf8");
  assert.match(exported, /"cover": "\/covers\/sample-abc\.webp"/);
}));

test("agent runs wait for a free slot so a pasted batch does not flood the gateway", async () => fixture(async ({ db }) => {
  let running = 0, peak = 0;
  const gates = [];
  const service = createWorkspaceService(db, { exportContent: async () => {}, concurrency: 2, runAgent: async ({ text }) => {
    running += 1; peak = Math.max(peak, running);
    await new Promise((resolve) => gates.push(resolve));
    running -= 1;
    return { text: `${text} done` };
  } });
  const ids = ["a", "b", "c"].map((name) => { const w = service.store.open({ draft: { title: name } }); service.submit(w.id, { text: name, requestId: name }); return w.id; });
  await until(() => gates.length === 2);
  assert.equal(peak, 2, "only two runs start while the third waits");
  gates.shift()();
  await until(() => gates.length === 2);
  while (gates.length) gates.shift()();
  await until(() => ids.every((id) => service.store.get(id).operations[0].status === "completed"));
  assert.equal(peak, 2);
}));

test("workspaces opened from the library and left untouched are listed and dismissed; edited ones stay", async () => fixture(async ({ db }) => {
  const repo = createContentRepository(db);
  repo.save(example());
  repo.save({ ...example(), id: "other", slug: "other" });
  const service = createWorkspaceService(db, { exportContent: async () => {} });
  const untouched = service.store.open({ contentId: "sample" });
  const editing = service.store.open({ contentId: "other" });
  service.store.update(editing.id, { ...editing.draft, title: "Unsaved edit" }, editing.version);
  assert.deepEqual(service.idleWorkspaces().map((w) => w.id), [], "a workspace opened today is not a leftover yet");
  assert.deepEqual(service.idleWorkspaces({ olderThanMs: 0 }).map((w) => w.id), [untouched.id]);
  assert.equal(service.dismissIdle({ olderThanMs: 0 }), 1);
  assert.equal(service.store.get(untouched.id).disposition, "dismissed");
  assert.equal(service.store.get(editing.id).disposition, "open");
}));

test("stopping a run that waited for its slot does not strand the runs queued behind it", async () => fixture(async ({ db }) => {
  const started = [];
  const gates = new Map();
  const service = createWorkspaceService(db, { exportContent: async () => {}, concurrency: 1, runAgent: async ({ text, signal }) => {
    started.push(text);
    await new Promise((resolve, reject) => { gates.set(text, resolve); signal.addEventListener("abort", () => reject(signal.reason), { once: true }); });
    return { text: `${text} done` };
  } });
  const open = (name) => { const w = service.store.open({ draft: { title: name } }); return { id: w.id, op: service.submit(w.id, { text: name, requestId: name }).operations[0].id }; };
  const a = open("a"), b = open("b"), c = open("c");
  await until(() => started.includes("a"));
  gates.get("a")();
  // b was woken from the queue and now holds the only slot; stop it.
  await until(() => started.includes("b"));
  service.stop(b.id, b.op);
  await until(() => started.includes("c"));
  gates.get("c")();
  await until(() => service.store.get(c.id).operations[0].status === "completed");
  assert.deepEqual(started, ["a", "b", "c"]);
  assert.equal(service.store.get(a.id).operations[0].status, "completed");
}));

test("a workspace closed by cleanup can be reopened and edited", async () => fixture(async ({ db }) => {
  createContentRepository(db).save(example());
  const service = createWorkspaceService(db, { exportContent: async () => {} });
  service.store.open({ contentId: "sample" });
  assert.equal(service.dismissIdle({ olderThanMs: 0 }), 1);
  const reopened = service.store.open({ contentId: "sample" });
  const edited = service.store.update(reopened.id, { ...reopened.draft, title: "Edited after cleanup" }, reopened.version);
  assert.equal(edited.draft.title, "Edited after cleanup");
  assert.equal(edited.disposition, "open", "an edit brings it back into the dashboard queue");
}));

test("batch fix captures covers directly and asks the agent only for what it can fix, leaving edits unsaved", async () => fixture(async ({ db }) => {
  const repo = createContentRepository(db);
  repo.save({ ...example(), category: "", payload: { ...example().payload, body: "只有中文正文" } });
  repo.save({ ...example(), id: "tagged", slug: "tagged", tags: ["not-in-vocabulary"], payload: { ...example().payload, cover: "/covers/tagged.webp" } });
  const prompts = [];
  const covers = [];
  const service = createWorkspaceService(db, {
    exportContent: async () => {},
    collectCover: async ({ id }) => { covers.push(id); return { cover: `/covers/${id}.webp`, method: "og-image" }; },
    runAgent: async ({ store, workspaceId, text }) => { prompts.push(text); const draft = store.get(workspaceId).draft; store.merge(workspaceId, draft, { ...draft, category: "coding" }, { note: "补分类" }); return { text: "done" }; },
  });
  const report = service.autoFix(["sample", "tagged", "missing"]);
  assert.equal(report.agent, 1);
  assert.equal(report.covers, 1);
  assert.deepEqual(report.skipped.map((s) => s.id), ["tagged", "missing"], "an unknown tag needs a person; a missing id is reported");
  const workspace = service.store.list().find((w) => w.contentId === "sample");
  await until(() => service.store.get(workspace.id).operations[0]?.status === "completed" && service.store.get(workspace.id).draft.payload.cover);
  assert.match(prompts[0], /category/);
  assert.match(prompts[0], /payload\.body\.en/);
  assert.doesNotMatch(prompts[0], /tagline/);
  const after = service.store.get(workspace.id);
  assert.equal(after.draft.category, "coding");
  assert.equal(after.draft.payload.cover, "/covers/sample.webp");
  assert.notEqual(after.version, after.savedVersion, "results wait for a person to save");
  assert.equal(repo.get("sample").category, "", "the library is untouched until saved");
}));

test("opening a workspace with no unsaved edits catches up with a newer library save", async () => fixture(async ({ db }) => {
  const repo = createContentRepository(db);
  repo.save(example());
  const service = createWorkspaceService(db, { exportContent: async () => {} });
  const first = service.openFresh("sample");
  repo.save({ ...repo.get("sample"), payload: { ...repo.get("sample").payload, cover: "/covers/new.webp" } });
  assert.equal(service.store.get(first.id).externalChanged, true);
  const reopened = service.openFresh("sample");
  assert.equal(reopened.externalChanged, false);
  assert.equal(reopened.draft.payload.cover, "/covers/new.webp");
  assert.equal(reopened.version, reopened.savedVersion);
}));

test("catching up a draft stored before a field existed does not raise a conflict on that field", async () => fixture(async ({ db }) => {
  const repo = createContentRepository(db);
  repo.save(example());
  const service = createWorkspaceService(db, { exportContent: async () => {} });
  const opened = service.store.open({ contentId: "sample" });
  // Simulate a workspace written before payload.cover was part of the draft.
  const stored = JSON.parse(db.prepare("SELECT draft_json FROM curator_workspaces WHERE id=?").get(opened.id).draft_json);
  delete stored.payload.cover;
  db.prepare("UPDATE curator_workspaces SET draft_json=? WHERE id=?").run(JSON.stringify(stored), opened.id);
  repo.save({ ...repo.get("sample"), payload: { ...repo.get("sample").payload, cover: "/covers/sample.webp" } });
  const caught = service.openFresh("sample");
  assert.equal(caught.proposals.length, 0);
  assert.equal(caught.draft.payload.cover, "/covers/sample.webp");
  assert.equal(caught.version, caught.savedVersion);
}));

test("an operation waiting for a model slot reads as queued and can be cancelled before it runs", async () => fixture(async ({ db }) => {
  const started = [];
  const gates = new Map();
  const service = createWorkspaceService(db, { exportContent: async () => {}, concurrency: 1, runAgent: async ({ text, signal }) => {
    started.push(text);
    await new Promise((resolve, reject) => { gates.set(text, resolve); signal.addEventListener("abort", () => reject(signal.reason), { once: true }); });
    return { text: `${text} done` };
  } });
  const open = (name) => { const w = service.store.open({ draft: { title: name } }); return { id: w.id, op: service.submit(w.id, { text: name, requestId: name }).operations[0].id }; };
  const a = open("a"), b = open("b");
  await until(() => started.includes("a") && service.store.get(b.id).operations[0].status === "queued");
  assert.equal(service.store.get(a.id).operations[0].status, "running");
  service.stop(b.id, b.op);
  gates.get("a")();
  await until(() => service.store.get(a.id).operations[0].status === "completed" && service.store.get(b.id).operations[0].status === "cancelled");
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(started, ["a"], "the cancelled operation never reached the model");
}));

test("a first draft with a Chinese body queues the English translation as the next step", async () => fixture(async ({ db }) => {
  const asked = [];
  const service = createWorkspaceService(db, {
    exportContent: async () => {},
    runDraft: async (options) => {
      options.onEvidence({ url: "https://example.com", text: "Evidence", kind: "page" });
      return { model: "test", draft: { name: "Example", slug: "example", blockType: "skill", kind: "skill", summary: { zh: "摘要", en: "Summary" }, body: "## 用法\n\n中文正文" } };
    },
    runAgent: async ({ text }) => { asked.push(text); return { text: "英文正文已补上。", model: "test" }; },
  });
  const w = service.store.open({ draft: { blockType: "skill", sourceUrl: "https://example.com" } });
  service.submit(w.id, { text: "根据来源生成首份草稿。", mode: "ingest", requestId: "first" });
  await until(() => service.store.get(w.id).operations.length === 2 && service.store.get(w.id).operations.every((o) => o.status === "completed"));
  assert.equal(asked.length, 1);
  assert.match(asked[0], /payload\.body\.en/);
  const label = service.store.get(w.id).conversation.messages.find((m) => m.role === "user" && m.data?.label)?.data.label;
  assert.equal(label, "收录 · 翻译英文正文");
}));

test("asking not to translate skips the follow-up", async () => fixture(async ({ db }) => {
  let agentCalls = 0;
  const service = createWorkspaceService(db, {
    exportContent: async () => {},
    runDraft: async (options) => {
      options.onEvidence({ url: "https://example.com", text: "Evidence", kind: "page" });
      return { model: "test", draft: { name: "Example", slug: "example", blockType: "skill", kind: "skill", summary: { zh: "摘要", en: "Summary" }, body: "中文正文" } };
    },
    runAgent: async () => { agentCalls++; return { text: "ok", model: "test" }; },
  });
  const w = service.store.open({ draft: { blockType: "skill", sourceUrl: "https://example.com" } });
  service.submit(w.id, { text: "生成草稿，先不用翻译英文", mode: "ingest", requestId: "first" });
  await until(() => service.store.get(w.id).operations[0].status === "completed");
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(service.store.get(w.id).operations.length, 1);
  assert.equal(agentCalls, 0);
}));
