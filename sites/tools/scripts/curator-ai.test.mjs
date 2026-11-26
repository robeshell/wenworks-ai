import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { loadPiGatewayConfig, normalizeAnthropicJson, normalizeAnthropicSseLine, publicPiProjectConfig, runCuratorDraft, serialTools, writePiProjectConfig } from "./curator-ai.mjs";
import { callTool, failure, mockConfig, reply, scriptedModel } from "./curator-mock-model.mjs";

const draftSchema = { type: "object", additionalProperties: false, required: ["name"], properties: { name: { type: "string" }, slug: { type: "string" } } };

test("gateway config is stored in the project-local private file", async () => {
  const directory = await mkdtemp("/tmp/curator-ai-");
  const file = path.join(directory, ".curator", "pi-config.json");
  await writePiProjectConfig({
    baseUrl: "http://localhost:5173/api/agent/",
    apiKey: "secret-key",
    defaultModel: "deepseek-v4-flash",
    contextWindow: 64000,
    maxTokens: 4096,
  }, { file });
  const config = await loadPiGatewayConfig({ file });
  const visible = publicPiProjectConfig({ apiKey: "secret-key", baseUrl: config.model.baseUrl, defaultModel: config.model.id });
  assert.equal((await stat(file)).mode & 0o777, 0o600);
  assert.equal(config.model.baseUrl, "http://localhost:5173/api/agent");
  assert.equal(config.apiBaseUrl, "http://localhost:5173/api/agent/v1");
  assert.equal(config.model.id, "deepseek-v4-flash");
  assert.equal(config.model.contextWindow, 64000);
  assert.equal(config.model.maxTokens, 4096);
  assert.equal(visible.apiKeyHint, "••••-key");
  assert.equal("apiKey" in visible, false);
});

test("gateway config does not fall back to computer-wide settings", async () => {
  const directory = await mkdtemp("/tmp/curator-ai-empty-");
  await assert.rejects(
    loadPiGatewayConfig({ file: path.join(directory, ".curator", "pi-config.json") }),
    /设置页/,
  );
});

test("a configured /v1 suffix is kept for the AI SDK and stripped from the gateway root", async () => {
  const directory = await mkdtemp("/tmp/curator-ai-v1-");
  const file = path.join(directory, ".curator", "pi-config.json");
  await writePiProjectConfig({
    baseUrl: "https://gateway.example/api/agent/v1",
    apiKey: "secret-key",
    defaultModel: "deepseek-v4-flash",
  }, { file });

  const config = await loadPiGatewayConfig({ file });
  // The AI SDK appends only /messages; callers that build /v1/... use the root.
  assert.equal(config.apiBaseUrl, "https://gateway.example/api/agent/v1");
  assert.equal(config.model.baseUrl, "https://gateway.example/api/agent");
  assert.equal(publicPiProjectConfig(JSON.parse(await readFile(file, "utf8"))).baseUrl, "https://gateway.example/api/agent/v1");
});

test("compatible Anthropic streams get missing usage counters normalized", () => {
  const line = normalizeAnthropicSseLine('data: {"type":"message_start","message":{"id":"one","model":"demo"}}');
  const payload = JSON.parse(line.slice(6));
  assert.equal(payload.message.usage.input_tokens, 0);
  assert.equal(payload.message.usage.output_tokens, 0);
});

test("non-streaming responses get unsigned thinking blocks a signature", () => {
  const json = normalizeAnthropicJson({ content: [{ type: "thinking", thinking: "…" }, { type: "text", text: "ok" }] });
  assert.equal(json.content[0].signature, "");
  assert.equal(json.usage.input_tokens, 0);
});

test("the draft workflow ends through the structured submit tool", async () => {
  const { model } = scriptedModel([callTool("submit_draft", { name: "Example", slug: "example" })]);
  const result = await runCuratorDraft({ prompt: "整理示例", schema: draftSchema, allowNetwork: false, model, config: mockConfig });
  assert.deepEqual(result.draft, { name: "Example", slug: "example" });
});

test("research that ends as plain text gets a forced, submit-only second pass", async () => {
  const { model, calls } = scriptedModel([
    reply("研究完成，但先错误地输出了普通文本。"),
    callTool("submit_draft", { name: "Recovered" }),
  ]);
  const events = [];
  const result = await runCuratorDraft({ prompt: "整理示例", schema: draftSchema, allowNetwork: true, model, config: mockConfig, onEvent: (event) => events.push(event) });
  assert.deepEqual(result.draft, { name: "Recovered" });
  assert.ok(events.some((event) => event.type === "submission.started"));
  assert.ok(events.some((event) => event.type === "draft.delta"));
  assert.ok(!events.some((event) => event.type === "text.delta"), "整理过程不能伪装成对话回复");
  assert.deepEqual(calls[0].tools.map((t) => t.name).sort(), ["submit_draft", "web_fetch", "web_search"]);
  assert.deepEqual(calls[1].tools.map((t) => t.name), ["submit_draft"]);
  assert.deepEqual(calls[1].toolChoice, { type: "tool", toolName: "submit_draft" });
  assert.ok(JSON.stringify(calls[1].prompt).includes("研究完成"), "第二轮保留研究内容");
});

test("research is kept when a thinking gateway rejects forced tool choice", async () => {
  const { model, calls } = scriptedModel([
    reply("Research completed"),
    failure("Thinking mode does not support this tool_choice"),
    callTool("submit_draft", { name: "Recovered" }),
  ]);
  const result = await runCuratorDraft({ prompt: "Prepare draft", schema: draftSchema, allowNetwork: false, model, config: mockConfig });
  assert.equal(result.draft.name, "Recovered");
  assert.equal(calls.length, 3);
  assert.deepEqual(calls[2].toolChoice, { type: "required" });
  assert.ok(JSON.stringify(calls[2].prompt).includes("Research completed"));
});

test("research tools run and their pages are kept as evidence", async () => {
  const { model } = scriptedModel([
    callTool("web_fetch", { url: "https://example.com/tool" }),
    callTool("submit_draft", { name: "Example" }),
  ]);
  const evidence = [];
  const fetchFn = async () => new Response("<html><body><h1>Example</h1> A tool.</body></html>", { headers: { "content-type": "text/html" } });
  const result = await runCuratorDraft({ prompt: "整理 https://example.com/tool", schema: draftSchema, model, config: mockConfig, fetchFn, onEvidence: (source) => evidence.push(source) });
  assert.equal(result.draft.name, "Example");
  assert.equal(evidence[0].url, "https://example.com/tool");
  assert.match(evidence[0].text, /A tool/);
});

test("stopping a draft run reports it as cancelled", async () => {
  let stop;
  const { model } = scriptedModel([() => { stop(); return reply("…"); }]);
  await assert.rejects(
    runCuratorDraft({ prompt: "整理示例", schema: draftSchema, allowNetwork: false, model, config: mockConfig, onAgent: (agent) => { stop = () => agent.abort(); } }),
    (error) => error.cancelled === true,
  );
});

test("tool calls from one step run one at a time, and started means actually running", async () => {
  const log = [];
  const slow = (name, ms) => ({ inputSchema: z.object({}), execute: async () => { log.push(`run:${name}`); await new Promise((r) => setTimeout(r, ms)); log.push(`done:${name}`); return name; } });
  const tools = serialTools({ first: slow("first", 30), second: slow("second", 1) }, { onEvent: (event) => log.push(`${event.type}:${event.tool}`) });
  // The SDK starts every call of a step at once; the wrapper must queue them.
  const results = await Promise.all([tools.first.execute({}, {}), tools.second.execute({}, {})]);
  assert.deepEqual(results, ["first", "second"]);
  assert.deepEqual(log, ["tool.started:first", "run:first", "done:first", "tool.completed:first", "tool.started:second", "run:second", "done:second", "tool.completed:second"]);
});

test("a failing tool is reported and does not block the next one", async () => {
  const events = [];
  const tools = serialTools({
    broken: { inputSchema: z.object({}), execute: async () => { throw new Error("nope"); } },
    fine: { inputSchema: z.object({}), execute: async () => "ok" },
  }, { onEvent: (event) => events.push(event) });
  const [broken, fine] = await Promise.allSettled([tools.broken.execute({}, {}), tools.fine.execute({}, {})]);
  assert.equal(broken.status, "rejected");
  assert.equal(fine.value, "ok");
  assert.equal(events.find((e) => e.type === "tool.completed" && e.tool === "broken").isError, true);
});
