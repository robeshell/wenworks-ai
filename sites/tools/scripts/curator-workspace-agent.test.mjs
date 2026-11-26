import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { openContentDb } from "./curator-db.mjs";
import { createWorkspaceStore } from "./curator-workspace-store.mjs";
import { runWorkspaceAgent } from "./curator-workspace-agent.mjs";
import { callTool, mockConfig, reply, scriptedModel } from "./curator-mock-model.mjs";

async function fixture(fn) {
  const root = await mkdtemp(path.join(os.tmpdir(), "curator-workspace-agent-")), db = await openContentDb({ file: path.join(root, "test.sqlite") });
  const store = createWorkspaceStore(db);
  const w = store.open({ draft: { blockType: "skill", title: "Initial", payload: { summary: { zh: "原始摘要", en: "Original" }, body: { zh: "完整的原始文章", en: "" } } } });
  const run = (responses, options = {}) => runWorkspaceAgent({ store, workspaceId: w.id, operationId: "test-operation", text: "请修改", config: mockConfig, model: scriptedModel(responses).model, ...options });
  try { await fn({ store, w, run }); } finally { db.close(); await rm(root, { recursive: true, force: true }); }
}

test("later tools in one run cannot overwrite a manual edit that the first tool happened to observe", async () => fixture(async ({ store, w, run }) => {
  await run([
    () => { store.update(w.id, { ...w.draft, title: "Manual title" }, w.version); return callTool("edit_fields", { changes: [{ path: "payload.summary.zh", value: "AI summary" }], summary: "Shorten summary" }); },
    callTool("edit_fields", { changes: [{ path: "title", value: "AI title" }], summary: "Change title" }),
    reply("请检查提案。"),
  ]);
  const result = store.get(w.id);
  assert.equal(result.draft.title, "Manual title");
  assert.equal(result.draft.payload.summary.zh, "AI summary");
  assert.equal(result.proposals[0].kind, "conflict");
}));

test("whole-body replacement cannot bypass the preview even if the model omits the flag", async () => fixture(async ({ store, w, run }) => {
  await run([callTool("edit_fields", { changes: [{ path: "payload.body.zh", value: "整篇新文章" }], summary: "Rewrite", preview: false }), reply("请检查提案。")]);
  assert.equal(store.get(w.id).draft.payload.body.zh, "完整的原始文章");
  assert.equal(store.get(w.id).proposals[0].draft.payload.body.zh, "整篇新文章");
}));

test("translation is marked for review if its source language changed during processing", async () => fixture(async ({ store, w, run }) => {
  await run([
    () => { store.update(w.id, { ...w.draft, payload: { ...w.draft.payload, summary: { zh: "手动补充了事实", en: "Original" } } }, w.version); return callTool("edit_fields", { changes: [{ path: "payload.summary.en", value: "Translation of the old source" }], summary: "Translate" }); },
    reply("原文有新修改，请复核。"),
  ]);
  const result = store.get(w.id);
  assert.equal(result.draft.payload.summary.en, "Original");
  assert.match(result.proposals[0].note, /中文原文/);
}));

test("the reply is only the last step's text; narration before tools is marked as process", async () => fixture(async ({ run }) => {
  const events = [];
  const result = await run([
    callTool("edit_fields", { changes: [{ path: "payload.summary.zh", value: "更短的摘要" }], summary: "缩短摘要" }, { text: "我先看一下当前摘要，然后调用工具修改。" }),
    reply("摘要缩短到一句，保留了核心用途。"),
  ], { onEvent: (event) => events.push(event) });
  assert.equal(result.text, "摘要缩短到一句，保留了核心用途。");
  // The service resets the live text on every step, so the narration never lands in the chat.
  const types = events.map((event) => event.type);
  assert.ok(types.lastIndexOf("step.started") > types.indexOf("text.delta"));
  assert.deepEqual(events.filter((e) => e.type.startsWith("tool.")).map((e) => `${e.type}:${e.tool}`), ["tool.started:edit_fields", "tool.completed:edit_fields"]);
}));
