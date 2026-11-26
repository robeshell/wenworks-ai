// Scripted AI SDK models for tests: each queued response is the stream one
// model call returns. A response may be a function, which runs when that call
// is made (to simulate an edit landing mid-run) and returns the parts.
import { MockLanguageModelV4, convertArrayToReadableStream } from "ai/test";

const usage = { inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 0, text: 0, reasoning: 0 } };
let ids = 0;

export const mockConfig = { apiKey: "test", apiBaseUrl: "http://gateway.test/v1", requestedModel: "mock", model: { id: "mock", baseUrl: "http://gateway.test", maxTokens: 1000 } };

export function reply(text) {
  return [
    { type: "stream-start", warnings: [] },
    { type: "text-start", id: "t" }, { type: "text-delta", id: "t", delta: text }, { type: "text-end", id: "t" },
    { type: "finish", usage, finishReason: { unified: "stop", raw: "end_turn" } },
  ];
}

export function callTool(name, input, { text } = {}) {
  const id = `call-${++ids}`;
  return [
    { type: "stream-start", warnings: [] },
    ...(text ? [{ type: "text-start", id: "t" }, { type: "text-delta", id: "t", delta: text }, { type: "text-end", id: "t" }] : []),
    { type: "tool-input-start", id, toolName: name }, { type: "tool-input-end", id },
    { type: "tool-call", toolCallId: id, toolName: name, input: JSON.stringify(input) },
    { type: "finish", usage, finishReason: { unified: "tool-calls", raw: "tool_use" } },
  ];
}

export function failure(message) {
  return [{ type: "stream-start", warnings: [] }, { type: "error", error: new Error(message) }];
}

export function scriptedModel(responses) {
  const queue = [...responses];
  const calls = [];
  const model = new MockLanguageModelV4({
    doStream: async (options) => {
      calls.push(options);
      let next = queue.shift();
      if (typeof next === "function") next = next(options);
      if (!next) throw new Error("scripted model ran out of responses");
      return { stream: convertArrayToReadableStream(next) };
    },
  });
  return { model, calls };
}
