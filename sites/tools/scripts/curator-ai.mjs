import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAnthropic } from "@ai-sdk/anthropic";
import { hasToolCall, isStepCount, jsonSchema, streamText, tool } from "ai";
import { z } from "zod";

import { RESOURCE_NAMING_RULE, TOOL_INTRO_RULE } from "./curator-agent-policy.mjs";

// The gateway serves model ids the SDK does not know, which logs a capability
// warning on every call. maxOutputTokens is always passed explicitly instead.
globalThis.AI_SDK_LOG_WARNINGS = false;

const DEFAULT_CONTEXT_WINDOW = 128_000;
const DEFAULT_MAX_TOKENS = 8_192;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// The file name predates the AI SDK; keep it so saved connections survive.
export const PI_CONFIG_FILE = path.join(ROOT, ".curator", "pi-config.json");

function clean(value) {
  return String(value || "").trim();
}

/** Settings accept either the gateway root or its `/v1` endpoint. `baseUrl`
 *  is the root (callers append `/v1/...` themselves); `apiBaseUrl` is what the
 *  AI SDK wants, which appends only `/messages`. */
function gatewayRoot(value) {
  return clean(value).replace(/\/+$/, "").replace(/\/v1$/i, "");
}

function normalizeUsage(value) {
  return {
    input_tokens: Number(value?.input_tokens) || 0,
    output_tokens: Number(value?.output_tokens) || 0,
    cache_creation_input_tokens: Number(value?.cache_creation_input_tokens) || 0,
    cache_read_input_tokens: Number(value?.cache_read_input_tokens) || 0,
    ...(value || {}),
  };
}

/** The gateway omits usage on message_start / message_delta, which the SDK's
 *  stream schema requires. Normalize only those counters. */
export function normalizeAnthropicSseLine(line) {
  if (!line.startsWith("data: ")) return line;
  try {
    const payload = JSON.parse(line.slice(6));
    if (payload.type === "message_start" && payload.message) {
      payload.message.usage = normalizeUsage(payload.message.usage);
    } else if (payload.type === "message_delta") {
      payload.usage = normalizeUsage(payload.usage);
    }
    return `data: ${JSON.stringify(payload)}`;
  } catch {
    return line;
  }
}

/** Non-streaming counterpart: thinking blocks arrive without the `signature`
 *  string the SDK's response schema requires. */
export function normalizeAnthropicJson(json) {
  if (!json || typeof json !== "object") return json;
  for (const block of Array.isArray(json.content) ? json.content : []) {
    if (block?.type === "thinking" && typeof block.signature !== "string") block.signature = "";
  }
  if (Array.isArray(json.content)) json.usage = normalizeUsage(json.usage);
  return json;
}

export async function curatorGatewayFetch(input, init) {
  const response = await fetch(input, init);
  const type = String(response.headers.get("content-type") || "");
  if (response.ok && type.includes("application/json")) {
    const text = await response.text();
    let body = text;
    try { body = JSON.stringify(normalizeAnthropicJson(JSON.parse(text))); } catch { /* leave as is */ }
    return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
  }
  if (!response.body || !type.includes("text/event-stream")) return response;
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  const transformed = response.body.pipeThrough(new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) controller.enqueue(encoder.encode(`${normalizeAnthropicSseLine(line)}\n`));
    },
    flush(controller) {
      buffer += decoder.decode();
      if (buffer) controller.enqueue(encoder.encode(normalizeAnthropicSseLine(buffer)));
    },
  }));
  return new Response(transformed, { status: response.status, statusText: response.statusText, headers: response.headers });
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return {};
  }
}

export async function readPiProjectConfig({ file = PI_CONFIG_FILE } = {}) {
  return readJson(file);
}

export function publicPiProjectConfig(config = {}) {
  const apiKey = clean(config.apiKey);
  return {
    configured: Boolean(clean(config.baseUrl) && apiKey && clean(config.defaultModel)),
    baseUrl: clean(config.baseUrl),
    defaultModel: clean(config.defaultModel),
    contextWindow: Number(config.contextWindow) || DEFAULT_CONTEXT_WINDOW,
    maxTokens: Number(config.maxTokens) || DEFAULT_MAX_TOKENS,
    hasApiKey: Boolean(apiKey),
    apiKeyHint: apiKey ? `••••${apiKey.slice(-4)}` : "",
  };
}

export async function writePiProjectConfig(input, { file = PI_CONFIG_FILE } = {}) {
  const current = await readPiProjectConfig({ file });
  const baseUrl = clean(input.baseUrl).replace(/\/+$/, "");
  const apiKey = clean(input.apiKey) || clean(current.apiKey);
  const defaultModel = clean(input.defaultModel);
  const contextWindow = Number(input.contextWindow) || DEFAULT_CONTEXT_WINDOW;
  const maxTokens = Number(input.maxTokens) || DEFAULT_MAX_TOKENS;
  if (!/^https?:\/\//i.test(baseUrl)) throw new Error("网关地址必须以 http:// 或 https:// 开头");
  if (!apiKey) throw new Error("请输入 API Key");
  if (!defaultModel) throw new Error("请输入模型名称");
  if (contextWindow < 1 || maxTokens < 1) throw new Error("Token 数必须大于 0");
  const next = { baseUrl, apiKey, defaultModel, contextWindow, maxTokens };
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(temporary, file);
  await fs.chmod(file, 0o600);
  return next;
}

export async function deletePiProjectConfig({ file = PI_CONFIG_FILE } = {}) {
  await fs.rm(file, { force: true });
}

/** Resolve the gateway only from Curator's project-local private configuration. */
export async function loadPiGatewayConfig({ selectedModel = "", file = PI_CONFIG_FILE, config: injectedConfig } = {}) {
  const settings = injectedConfig || await readPiProjectConfig({ file });
  const root = gatewayRoot(settings.baseUrl);
  const apiKey = clean(settings.apiKey);
  const modelId = clean(selectedModel || settings.defaultModel);

  if (!root) throw new Error("AI 连接还没有填写网关地址，请前往设置页");
  if (!apiKey) throw new Error("AI 连接还没有填写 API Key，请前往设置页");
  if (!modelId) throw new Error("AI 连接还没有选择模型，请前往设置页");

  return {
    apiKey,
    requestedModel: modelId,
    apiBaseUrl: `${root}/v1`,
    model: {
      id: modelId,
      baseUrl: root,
      contextWindow: Number(settings.contextWindow) || DEFAULT_CONTEXT_WINDOW,
      maxTokens: Number(settings.maxTokens) || DEFAULT_MAX_TOKENS,
    },
  };
}

/** An AI SDK language model for the configured gateway. */
export function gatewayModel(config) {
  return createAnthropic({ baseURL: config.apiBaseUrl, apiKey: config.apiKey, fetch: curatorGatewayFetch })(config.model.id);
}

/** Persisted chat history as SDK messages. Only display text is stored, which
 *  is all the model needs to keep the thread. */
export function priorMessages(messages) {
  return (messages || [])
    .filter((message) => (message.role === "user" || message.role === "assistant") && clean(message.text))
    .slice(-20)
    .map((message) => ({ role: message.role, content: clean(message.text) }));
}

/** The SDK runs a step's tool calls concurrently and the gateway ignores
 *  disable_parallel_tool_use. Tools here mutate one draft, so run them one at
 *  a time; `started` fires only when a call actually begins. */
export function serialTools(definitions, { onEvent = () => {}, signal } = {}) {
  let chain = Promise.resolve();
  return Object.fromEntries(Object.entries(definitions).map(([name, definition]) => {
    if (!definition.execute) return [name, tool(definition)];
    const run = definition.execute;
    return [name, tool({
      ...definition,
      execute: (input, options) => {
        const next = chain.then(async () => {
          signal?.throwIfAborted();
          onEvent({ type: "tool.started", tool: name, args: input });
          let isError = false;
          try { return await run(input, options); }
          catch (error) { isError = true; throw error; }
          finally { onEvent({ type: "tool.completed", tool: name, isError }); }
        });
        chain = next.catch(() => {});
        return next;
      },
    })];
  }));
}

/** A readable message for a failed model call. APICallError's own message is
 *  often just the status text; the gateway's explanation is in the body. */
export function modelErrorMessage(error) {
  const status = error?.statusCode;
  let detail = "";
  const body = error?.responseBody;
  if (typeof body === "string" && body.trim()) {
    try {
      const parsed = JSON.parse(body);
      detail = parsed?.error?.message || parsed?.message || parsed?.error || "";
    } catch { detail = body; }
  }
  detail = String(detail || error?.message || "").trim().split("\n")[0].slice(0, 300);
  return status ? `模型请求失败（HTTP ${status}）${detail ? `：${detail}` : ""}` : detail || "模型请求失败";
}

const cancelled = () => Object.assign(new Error("处理已停止"), { cancelled: true });

/** Drain a streamText result, forwarding the parts Curator shows. Resolves
 *  with the steps once the stream ends; throws on an error or abort part. */
export async function consumeStream(result, { onPart = () => {}, signal } = {}) {
  let failure = null;
  for await (const part of result.fullStream) {
    if (part.type === "error") { failure = part.error; break; }
    if (part.type === "abort") throw cancelled();
    onPart(part);
  }
  if (signal?.aborted) throw cancelled();
  if (failure) throw new Error(modelErrorMessage(failure));
  return result.steps;
}

function lintSchema(schema) {
  return Object.fromEntries(Object.entries(schema || {}).filter(([key]) => key !== "$schema"));
}

export function fetchWithSignal(fetchFn, signal) {
  return (input, init = {}) => fetchFn(input, { ...init, signal: init.signal ? AbortSignal.any([signal, init.signal]) : signal });
}

function decodeHtml(text) {
  return text
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchReadablePage(url, fetchFn = fetch) {
  const target = new URL(url);
  if (!['http:', 'https:'].includes(target.protocol)) throw new Error("只允许读取 http 或 https 页面");
  const response = await fetchFn(target, {
    signal: AbortSignal.timeout(20_000),
    headers: { "User-Agent": "Mozilla/5.0 Curator/1.0" },
  });
  if (!response.ok) throw new Error(`读取失败：HTTP ${response.status}`);
  const raw = (await response.text()).slice(0, 300_000);
  const type = response.headers.get("content-type") || "";
  const text = type.includes("html") ? decodeHtml(raw) : raw.trim();
  return text.slice(0, 45_000) || "页面没有可读正文";
}

export function gatewayToolUrl(baseUrl, name) {
  const base = String(baseUrl || "").replace(/\/+$/, "");
  return `${base}${base.endsWith("/v1") ? "" : "/v1"}/${name}`;
}

const DRAFT_STEPS = 8;
const SUBMIT = "submit_draft";

/** The submit_draft call a pass ended with, if it is usable. */
function submittedDraft(steps) {
  const calls = steps.flatMap((step) => step.toolCalls || []).filter((call) => call.toolName === SUBMIT);
  const last = calls.at(-1);
  if (!last || last.invalid || !last.input || typeof last.input !== "object") return { draft: null, error: last?.error };
  return { draft: last.input };
}

/** History for a retry. A trailing submit_draft call has no tool result, and
 *  Anthropic-shaped APIs reject an unanswered tool_use, so drop it. */
function historyForRetry(messages) {
  const history = [...messages];
  const last = history.at(-1);
  if (last?.role === "assistant" && Array.isArray(last.content) && last.content.some((part) => part.type === "tool-call")) {
    const kept = last.content.filter((part) => part.type !== "tool-call");
    if (kept.some((part) => part.type === "text" && part.text.trim())) history[history.length - 1] = { ...last, content: kept };
    else history.pop();
  }
  return history;
}

/** Run the ingest workflow: optional research, then exactly one structured
 *  draft through submit_draft. The draft is only returned; Curator decides
 *  what to do with it. */
export async function runCuratorDraft({
  prompt,
  schema,
  selectedModel = "",
  allowNetwork = true,
  onEvidence = () => {},
  onEvent = () => {},
  onAgent = () => {},
  model: injectedModel,
  config: injectedConfig,
  fetchFn = fetch,
} = {}) {
  if (!clean(prompt)) throw new Error("整理提示词为空");
  const config = injectedConfig || await loadPiGatewayConfig({ selectedModel });
  const model = injectedModel || gatewayModel(config);
  const controller = new AbortController();
  onAgent({ abort: () => controller.abort() });
  const signal = controller.signal;
  const pageFetch = fetchWithSignal(fetchFn, signal);
  const maxNetworkUses = 4;
  let networkUses = 0;
  const networkGuard = () => {
    networkUses += 1;
    if (networkUses > maxNetworkUses) throw new Error(`网页工具最多调用 ${maxNetworkUses} 次`);
  };

  const definitions = {};
  if (allowNetwork) {
    definitions.web_fetch = {
      description: "读取一个公开网页的正文。优先读取任务给出的目标 URL。",
      inputSchema: z.object({ url: z.string().min(8) }),
      execute: async ({ url }) => {
        networkGuard();
        const text = await fetchReadablePage(url, pageFetch);
        onEvidence({ url, text, kind: "page" });
        return text;
      },
    };
    definitions.web_search = {
      description: "仅在目标页面不足以核验关键事实时搜索网页；不要用搜索摘要代替目标页面证据。",
      inputSchema: z.object({ query: z.string().min(2), max_results: z.number().int().min(1).max(5).optional() }),
      execute: async ({ query, max_results }) => {
        networkGuard();
        const response = await pageFetch(gatewayToolUrl(config.apiBaseUrl, "web-search"), {
          method: "POST",
          signal: AbortSignal.timeout(25_000),
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
          body: JSON.stringify({ query, max_results: max_results || 5 }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || payload?.message || `搜索失败：HTTP ${response.status}`);
        const text = JSON.stringify(payload.sources || payload, null, 2);
        onEvidence({ url: `search:${query}`, title: query, text, kind: "search" });
        return text;
      },
    };
  }
  // No execute: calling it ends the run and its input is the draft.
  definitions[SUBMIT] = { description: "完成核验后提交唯一的结构化草稿。提交后本轮结束，草稿仍需人工确认。", inputSchema: jsonSchema(lintSchema(schema)) };
  const tools = serialTools(definitions, { onEvent, signal });
  const researchTools = Object.keys(definitions).filter((name) => name !== SUBMIT);

  const instructions = `你是 Wenworks AI · 工具精选 的整理 Agent。${RESOURCE_NAMING_RULE}
${TOOL_INTRO_RULE}严格遵循用户提供的整理规则。${allowNetwork ? `先读取目标页面；必要时搜索。网页工具总计最多 ${maxNetworkUses} 次。` : "本轮禁止联网。"} 最终必须调用 submit_draft，禁止用普通文本或 Markdown 代替结构化提交。不要保存、发布或修改数据库。`;

  const onPart = (part) => {
    // A draft run has no chat reply: narration before submit_draft stays in
    // the process stream so it never shows up as a message.
    if (part.type === "text-delta") onEvent({ type: "draft.delta", text: part.text });
    else if (part.type === "reasoning-delta") onEvent({ type: "reasoning.delta", text: part.text });
    else if (part.type === "tool-input-start" && part.toolName === SUBMIT) onEvent({ type: "tool.started", tool: SUBMIT });
    else if (part.type === "tool-call" && part.toolName === SUBMIT) onEvent({ type: "tool.completed", tool: SUBMIT, isError: Boolean(part.invalid) });
  };

  const pass = async (messages, toolChoice) => {
    const result = streamText({
      model,
      instructions,
      messages,
      tools,
      maxOutputTokens: config.model.maxTokens,
      maxRetries: 1,
      abortSignal: signal,
      // Error parts are handled by consumeStream; skip the SDK's console log.
      onError: () => {},
      stopWhen: [hasToolCall(SUBMIT), isStepCount(DRAFT_STEPS)],
      // Research may use every tool; near the step cap, or on a forced pass,
      // only submit_draft is offered.
      prepareStep: ({ stepNumber }) => (toolChoice || stepNumber >= DRAFT_STEPS - 1)
        ? { activeTools: [SUBMIT], toolChoice: toolChoice || { type: "tool", toolName: SUBMIT } }
        : { activeTools: [...researchTools, SUBMIT] },
    });
    const steps = await consumeStream(result, { onPart, signal });
    return { steps, messages: [...messages, ...(await result.response).messages] };
  };

  let history = [{ role: "user", content: clean(prompt) }];
  let outcome = await pass(history);
  let found = submittedDraft(outcome.steps);
  if (!found.draft) {
    // Research ended as plain text, or the submission did not fit the schema.
    // Keep the research and ask again with only submit_draft available.
    onEvent({ type: "submission.started", tool: SUBMIT });
    const nudge = found.error
      ? `上次提交的草稿不符合格式：${String(found.error?.message || found.error).slice(0, 300)}。请修正后重新调用 submit_draft。`
      : "根据刚才已经完成的研究提交最终草稿。现在必须调用 submit_draft，不要继续解释。";
    history = [...historyForRetry(outcome.messages), { role: "user", content: nudge }];
    try {
      outcome = await pass(history, { type: "tool", toolName: SUBMIT });
    } catch (error) {
      if (error.cancelled || !/thinking.*tool_choice|tool_choice.*thinking/i.test(error.message)) throw error;
      // Some thinking models reject a forced tool; let the model pick instead.
      onEvent({ type: "submission.retry", reason: "网关不支持强制工具选择，正在保留资料重试提交" });
      outcome = await pass([...history.slice(0, -1), { role: "user", content: "资料已经齐备。请现在调用 submit_draft 工具提交草稿，不要把 JSON 写在普通回复中，也不要再读取网页。" }], "required");
    }
    found = submittedDraft(outcome.steps);
  }
  if (!found.draft) throw new Error("AI 没有提交结构化草稿，请重试");
  return { draft: found.draft, model: config.model.id, requestedModel: config.requestedModel };
}
