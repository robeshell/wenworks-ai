import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildTiers } from "./tiers.ts";
import {
  BUDGETS,
  DEFAULT_FILTERS,
  MAX_PICKS,
  USE_CASES,
  filtersToQuery,
  parseFilters,
  pickModels,
  toPickModels,
} from "./pick.ts";
import type { PickFilters, PickModel } from "./pick.ts";

const model = (over: Partial<PickModel>): PickModel => ({
  familyKey: over.family ?? "m",
  family: "M",
  creator: "Lab",
  creatorLogo: "",
  tier: "T1",
  tierLabel: "第一梯队",
  score: 60,
  blendedPerMillion: 4,
  isOpenWeights: false,
  popularityRank: null,
  contextLength: null,
  scicode: null,
  lcr: null,
  ...over,
});

const filters = (over: Partial<PickFilters> = {}): PickFilters => ({
  ...DEFAULT_FILTERS,
  ...over,
});

test("a missing sub-score falls back to the overall score, not zero", () => {
  const models = [
    model({ family: "NoSub", score: 60, scicode: null }),
    model({ family: "A", score: 50, scicode: 60 }),
    model({ family: "B", score: 45, scicode: 55 }),
    model({ family: "C", score: 40, scicode: 52 }),
    model({ family: "D", score: 35, scicode: 45 }),
    model({ family: "E", score: 30, scicode: 42 }),
  ];
  const result = pickModels(models, filters({ use: "coding" }));
  assert.equal(result.picks[0].model.family, "NoSub");
  assert.equal(result.picks[0].rankScore, 60);
  assert.equal(result.picks[0].subMissing, true);
  assert.equal(result.picks[0].subValue, null);
  assert.equal(result.picks[1].subMissing, false);
});

test("a strong sub-score moves a model up by at most one tier", () => {
  const base = [50, 45, 40, 35, 30].map((score, i) =>
    model({ family: `M${i}`, score, scicode: score + 5 }),
  );
  const star = model({ family: "Star", score: 48, scicode: 95 });
  const result = pickModels([...base, star], filters({ use: "coding" }));
  const pick = result.picks.find((p) => p.model.family === "Star")!;
  assert.ok(pick.rankScore > 48);
  assert.ok(pick.rankScore <= 53);
  assert.equal(result.picks[0].model.family, "Star");
});

test("budget excludes pricier and unpriced models", () => {
  const models = [
    model({ family: "Pricey", score: 70, blendedPerMillion: 12 }),
    model({ family: "Unpriced", score: 65, blendedPerMillion: null }),
    model({ family: "Ok", score: 50, blendedPerMillion: 3 }),
  ];
  const result = pickModels(models, filters({ budget: 3 }));
  assert.deepEqual(result.picks.map((p) => p.model.family), ["Ok"]);
});

test("cheap use case trades one tier of score for half the price", () => {
  const models = [
    model({ family: "Top", score: 60, blendedPerMillion: 8 }),
    model({ family: "Value", score: 52, blendedPerMillion: 1 }),
    model({ family: "Free", score: 20, blendedPerMillion: 0 }),
  ];
  const result = pickModels(models, filters({ use: "cheap" }));
  assert.deepEqual(result.picks.map((p) => p.model.family), ["Value", "Top", "Free"]);
});

test("reasons come from the data", () => {
  const models = [
    model({ family: "Cheap", score: 58, blendedPerMillion: 2 }),
    model({ family: "Dear", score: 60, blendedPerMillion: 16 }),
  ];
  const result = pickModels(models, filters());
  const byName = Object.fromEntries(result.picks.map((p) => [p.model.family, p.reason]));
  assert.match(byName.Cheap, /第一梯队里最便宜/);
  assert.match(byName.Dear, /综合分最高/);
});

test("no match: says which condition to loosen", () => {
  const models = [
    model({ family: "Open", score: 30, blendedPerMillion: 5, isOpenWeights: true }),
    model({ family: "Closed", score: 60, blendedPerMillion: 0.5 }),
  ];
  const result = pickModels(models, filters({ budget: 1, open: true }));
  assert.equal(result.picks.length, 0);
  const labels = result.hints.map((h) => h.label);
  assert.ok(labels.includes("预算放宽到 $10"));
  assert.ok(labels.includes("取消“只看开源”"));
  for (const hint of result.hints) {
    assert.ok(pickModels(models, hint.filters).picks.length > 0);
  }
});

test("filters round-trip through the URL", () => {
  const all: PickFilters[] = [];
  for (const use of USE_CASES) {
    for (const budget of BUDGETS) {
      for (const open of [false, true]) {
        for (const hot of [false, true]) all.push({ use: use.key, budget, open, hot });
      }
    }
  }
  for (const f of all) {
    assert.deepEqual(parseFilters(new URLSearchParams(filtersToQuery(f))), f);
  }
  assert.deepEqual(parseFilters(new URLSearchParams("use=nope&budget=7")), DEFAULT_FILTERS);
});

test("current data: every use case and budget gives at least one pick", () => {
  const load = (name: string) =>
    JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), "utf8"));
  const rankings = load("rankings").items;
  const prices = load("prices").items;
  const board = buildTiers(rankings, prices, load("popularity").items);
  const models = toPickModels(board, rankings, prices);
  for (const use of USE_CASES) {
    for (const budget of BUDGETS) {
      const result = pickModels(models, filters({ use: use.key, budget }));
      assert.ok(result.picks.length >= 1, `${use.key} / ${budget}`);
      assert.ok(result.picks.length <= MAX_PICKS);
      for (const pick of result.picks) assert.ok(pick.reason.length > 3);
    }
  }
});
