import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildTiers,
  diffTiers,
  effortFromName,
  familyKeyFromSlug,
  familyLabelFromName,
  historyChanged,
  historyLacksIds,
  tierKeyForGap,
  toHistory,
  withIds,
} from "./tiers.ts";
import type { PriceRecord, RankingRecord } from "./types";

function ranking(
  slug: string,
  name: string,
  score: number,
  modelId?: string,
): RankingRecord {
  return {
    rank: 0,
    modelId: modelId ?? null,
    name,
    shortName: name,
    creator: "Acme",
    creatorSlug: "acme",
    creatorLogo: "",
    intelligenceIndex: score,
    codingIndex: null,
    agenticIndex: null,
    gpqa: null,
    hle: null,
    scicode: null,
    terminalbench: null,
    lcr: null,
    isReasoning: false,
    slug,
  };
}

function price(id: string, input: number, output: number): PriceRecord {
  return {
    id,
    name: id,
    provider: "Acme",
    creatorLogo: "",
    contextLength: null,
    inputPerMillion: input,
    outputPerMillion: output,
    intelligenceIndex: null,
  };
}

test("effort and family label come from the trailing parenthesis", () => {
  assert.equal(effortFromName("Claude Fable 5.2 (Max, Default Fallback)"), "Max");
  assert.equal(effortFromName("GPT-6 Astra (Xhigh)"), "Xhigh");
  assert.equal(effortFromName("Qwen4 (0902)"), null);
  assert.equal(familyLabelFromName("Claude Fable 5.2 (Max, Default Fallback)"), "Claude Fable 5.2");
  assert.equal(familyLabelFromName("Gemini 4 Carbon (High)"), "Gemini 4 Carbon");
  assert.equal(familyLabelFromName("Qwen4 (0902)"), "Qwen4 (0902)");
});

test("tiers are 5-point bands behind the leader, with rounding", () => {
  assert.equal(tierKeyForGap(0), "T1");
  assert.equal(tierKeyForGap(4.9), "T1");
  assert.equal(tierKeyForGap(5), "T2");
  assert.equal(tierKeyForGap(24.9), "T5");
  assert.equal(tierKeyForGap(25), "rest");
  // 64.6 - 54.6 is 9.9999… in floating point; it must still land in T3.
  const board = buildTiers([
    ranking("a", "A (Max)", 64.6),
    ranking("b", "B", 54.6),
  ]);
  assert.equal(board.tiers.find((t) => t.key === "T3")!.models[0].family, "B");
});

test("a family is listed once, by its best setting", () => {
  const board = buildTiers([
    ranking("model-x", "Model X (Max)", 60),
    ranking("model-x-high", "Model X (High)", 58),
    ranking("model-x-low", "Model X (Low)", 50),
  ]);
  const all = board.tiers.flatMap((t) => t.models);
  assert.equal(all.length, 1);
  assert.equal(all[0].effort, "Max");
  assert.equal(all[0].variantCount, 3);
});

test("inside a tier, cheaper models come first", () => {
  const board = buildTiers(
    [ranking("pricey", "Pricey", 60), ranking("cheap", "Cheap", 58)],
    [price("pricey", 10, 40), price("cheap", 1, 4)],
  );
  assert.deepEqual(
    board.tiers[0].models.map((m) => m.family),
    ["Cheap", "Pricey"],
  );
  assert.equal(board.tiers[0].models[0].blendedPerMillion, 1.75);
});

test("diff reports new entries and tier moves", () => {
  const before = toHistory(
    buildTiers([ranking("a", "A", 60), ranking("b", "B", 52)], [], [], "2026-11-01T00:00:00Z"),
  );
  const after = toHistory(
    buildTiers(
      [ranking("a", "A", 60), ranking("b", "B", 57), ranking("c", "C", 49)],
      [],
      [],
      "2026-11-02T00:00:00Z",
    ),
  );
  assert.equal(historyChanged(before, after), true);
  assert.equal(historyChanged(after, after), false);
  const changes = diffTiers(before, after);
  assert.deepEqual(changes.newEntries.map((e) => e.family), ["C"]);
  assert.deepEqual(changes.promoted.map((m) => [m.family, m.from, m.to]), [["B", "T2", "T1"]]);
  assert.match(changes.summary, /新上榜：C/);
  assert.match(changes.summary, /升档：B 第二梯队→第一梯队/);
});

test("a dated slug of an older version stays its own family", () => {
  assert.equal(familyKeyFromSlug("deepseek-v4-flash"), "deepseek-v4-flash");
  assert.equal(familyKeyFromSlug("deepseek-v4-flash-high"), "deepseek-v4-flash");
  assert.equal(familyKeyFromSlug("deepseek-v4-flash-0420"), "deepseek-v4-flash-0420");
  assert.equal(familyKeyFromSlug("deepseek-v4-flash-0420-high"), "deepseek-v4-flash-0420");
  assert.equal(familyKeyFromSlug("deepseek-v4-flash-high-0420"), "deepseek-v4-flash-0420");
  assert.equal(
    familyKeyFromSlug("deepseek-v4-1-flash-1017-non-reasoning"),
    "deepseek-v4-1-flash-1017",
  );
});

// Artificial Analysis moves a slug to the newest version of a model and gives
// the old version a dated slug; only the model id stays fixed.
const BEFORE_SWAP = [
  ranking("leader", "Leader (Max)", 70, "id-leader"),
  ranking("flash", "Flash 0420 (Max)", 58, "id-old-max"),
  ranking("flash-high", "Flash 0420 (High)", 56, "id-old-high"),
];
const AFTER_SWAP = [
  ranking("leader", "Leader (Max)", 70, "id-leader"),
  ranking("flash", "Flash 1125 (Max)", 66, "id-new-max"),
  ranking("flash-high", "Flash 1125 (High)", 64, "id-new-high"),
  ranking("flash-0420", "Flash 0420 (Max)", 58, "id-old-max"),
  ranking("flash-0420-high", "Flash 0420 (High)", 56, "id-old-high"),
];

test("a new version that takes over a slug is a new entry, not a tier move", () => {
  const before = toHistory(buildTiers(BEFORE_SWAP, [], [], "2026-11-24T00:00:00Z"));
  const after = toHistory(buildTiers(AFTER_SWAP, [], [], "2026-11-25T00:00:00Z"));
  assert.equal(historyChanged(before, after), true);
  const changes = diffTiers(before, after);
  assert.deepEqual(
    changes.newEntries.map((e) => [e.family, e.tier]),
    [["Flash 1125", "T1"]],
  );
  // The old version keeps its tier under its new, dated slug.
  assert.deepEqual(changes.promoted, []);
  assert.deepEqual(changes.demoted, []);
  assert.match(changes.summary, /新上榜：Flash 1125（第一梯队）/);
});

test("the same board under a moved slug is not a change", () => {
  const before = toHistory(
    buildTiers([ranking("a", "A 0420", 60, "id-a"), ranking("b", "B", 52, "id-b")]),
  );
  const after = toHistory(
    buildTiers([ranking("a-0420", "A 0420", 60, "id-a"), ranking("b", "B", 52, "id-b")]),
  );
  assert.equal(historyChanged(before, after), false);
});

test("a new leader is told by model id, not by slug", () => {
  const before = toHistory(
    buildTiers([ranking("top", "Top 0420", 60, "id-old"), ranking("b", "B", 58, "id-b")]),
  );
  const after = toHistory(
    buildTiers([ranking("top", "Top 1125", 62, "id-new"), ranking("b", "B", 58, "id-b")]),
  );
  const changes = diffTiers(before, after);
  assert.equal(changes.leader.isNew, true);
  assert.equal(changes.leader.family, "Top 1125");
});

test("history files without ids still pair by family key", () => {
  // A file written before ids were stored, with the old key that dropped dates.
  const legacy = toHistory(
    buildTiers([ranking("a-1017", "A 1017", 60), ranking("b", "B", 52)], [], [], "2026-11-24T00:00:00Z"),
  );
  for (const entry of legacy.entries) {
    delete entry.ids;
    entry.familyKey = entry.familyKey.replace(/-\d{4}$/, "");
  }
  const current = toHistory(
    buildTiers(
      [ranking("a-1017", "A 1017", 60, "id-a"), ranking("b", "B", 52, "id-b")],
      [],
      [],
      "2026-11-25T00:00:00Z",
    ),
  );
  assert.equal(historyLacksIds(legacy), true);
  assert.equal(historyChanged(legacy, current), false);
  assert.deepEqual(diffTiers(legacy, current).newEntries, []);

  const upgraded = withIds(legacy, current);
  assert.equal(historyLacksIds(upgraded), false);
  assert.equal(upgraded.updatedAt, legacy.updatedAt);
  assert.deepEqual(
    upgraded.entries.map((e) => [e.familyKey, e.ids]),
    [
      ["a", ["id-a"]],
      ["b", ["id-b"]],
    ],
  );
});

test("prices join a family by model id", () => {
  const board = buildTiers(
    [ranking("flash", "Flash 1125", 60, "id-new")],
    [{ ...price("flash", 9, 9), modelId: "id-old" }, { ...price("other", 1, 4), modelId: "id-new" }],
  );
  assert.equal(board.tiers[0].models[0].inputPerMillion, 1);
});
