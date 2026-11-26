// Model picker: turns a use case, a budget and two optional filters into a
// short list of recommendations with a data-backed reason for each.
//
// Everything here runs in the browser on data that is already in the page.
// The tier grouping itself comes from buildTiers and is not changed here.
import { TIER_STEP, familyKeyFromSlug } from "./tiers.ts";
import type { TierBoard, TierKey } from "./tiers.ts";
import type { PriceRecord, RankingRecord } from "./types";

export type UseCase = "coding" | "agent" | "general" | "long" | "cheap";
export type SubKey = "scicode" | "lcr";

export const USE_CASES: { key: UseCase; label: string; note: string }[] = [
  {
    key: "coding",
    label: "编程",
    note: "按综合分排，并参考 SciCode（科学计算编程）。Artificial Analysis 已不再发布 Coding 指数。",
  },
  {
    key: "agent",
    label: "Agent / 工具调用",
    note: "按综合分排。Artificial Analysis 已不再发布 Agentic 指数，暂无该项评测。",
  },
  {
    key: "general",
    label: "通用对话与写作",
    note: "按综合分排。",
  },
  {
    key: "long",
    label: "长文本",
    note: "按综合分排，并参考 LCR（长上下文推理）；分数相同时上下文更长的在前。",
  },
  {
    key: "cheap",
    label: "低成本批量处理",
    note: `按性价比排：价格每便宜一半，相当于综合分多 ${TIER_STEP} 分（一档）。`,
  },
];

/** Blended price caps in USD per million tokens; null means no cap. */
export const BUDGETS: (number | null)[] = [null, 1, 3, 10, 30];

export const HOT_RANK = 20;
export const MAX_PICKS = 5;

/** Most points a sub-score can move a model up or down: one tier. */
const SUB_SWING = TIER_STEP;
/** Lowest price used in the value formula, so free models do not win outright. */
const PRICE_FLOOR = 0.1;

const SUB_OF: Partial<Record<UseCase, SubKey>> = {
  coding: "scicode",
  long: "lcr",
};

export const SUB_LABEL: Record<SubKey, string> = {
  scicode: "SciCode",
  lcr: "LCR",
};

export type PickModel = {
  familyKey: string;
  family: string;
  creator: string;
  creatorLogo: string;
  tier: TierKey;
  tierLabel: string;
  score: number;
  blendedPerMillion: number | null;
  isOpenWeights: boolean;
  popularityRank: number | null;
  contextLength: number | null;
  /** Sub-scores in points (0–100); null when the model has not been tested. */
  scicode: number | null;
  lcr: number | null;
};

export type PickFilters = {
  use: UseCase;
  budget: number | null;
  open: boolean;
  hot: boolean;
};

export type Pick = {
  model: PickModel;
  /** Score the list is sorted by. */
  rankScore: number;
  /** Sub-score that belongs to the use case, if the use case has one. */
  subKey: SubKey | null;
  subValue: number | null;
  /** True when the use case has a sub-score but this model lacks it. */
  subMissing: boolean;
  reason: string;
};

export type RelaxHint = { label: string; count: number; filters: PickFilters };

export type PickResult = {
  picks: Pick[];
  /** Candidates that pass the filters, before the top few are taken. */
  matched: number;
  hints: RelaxHint[];
};

/** Sub-scores come as fractions (0.61); show and compare them as points. */
function toPoints(value: number | null | undefined): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return value <= 1 ? value * 100 : value;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Flattens the tier board and attaches sub-scores and context length. */
export function toPickModels(
  board: TierBoard,
  rankings: RankingRecord[],
  prices: PriceRecord[],
): PickModel[] {
  const subs = new Map<string, { scicode: number | null; lcr: number | null }>();
  const slugFamily = new Map<string, string>();
  const idFamily = new Map<string, string>();
  for (const item of rankings) {
    const key = familyKeyFromSlug(item.slug);
    slugFamily.set(item.slug, key);
    if (item.modelId) idFamily.set(item.modelId, key);
    const current = subs.get(key) ?? { scicode: null, lcr: null };
    for (const sub of ["scicode", "lcr"] as const) {
      const value = toPoints(item[sub]);
      if (value !== null && (current[sub] === null || value > current[sub]!)) {
        current[sub] = value;
      }
    }
    subs.set(key, current);
  }

  const context = new Map<string, number>();
  for (const item of prices) {
    const key =
      (item.modelId ? idFamily.get(item.modelId) : undefined) ??
      slugFamily.get(item.id);
    if (!key || typeof item.contextLength !== "number") continue;
    context.set(key, Math.max(context.get(key) ?? 0, item.contextLength));
  }

  return board.tiers.flatMap((tier) =>
    tier.models.map((model) => ({
      familyKey: model.familyKey,
      family: model.family,
      creator: model.creator,
      creatorLogo: model.creatorLogo,
      tier: tier.key,
      tierLabel: tier.label,
      score: model.score,
      blendedPerMillion: model.blendedPerMillion,
      isOpenWeights: model.isOpenWeights === true,
      popularityRank: model.popularityRank,
      contextLength: context.get(model.familyKey) ?? null,
      scicode: subs.get(model.familyKey)?.scicode ?? null,
      lcr: subs.get(model.familyKey)?.lcr ?? null,
    })),
  );
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * How a sub-score shifts the overall score. Among models that have the
 * sub-score, fit it against the overall score; a model that does better than
 * models of its overall level moves up, one that does worse moves down, by at
 * most one tier. A model without the sub-score is not moved at all, so a
 * missing value falls back to the overall score and never counts as zero.
 */
function subAdjuster(models: PickModel[], sub: SubKey) {
  const points = models.filter((m) => m[sub] !== null);
  if (points.length < 5) return () => 0;
  const n = points.length;
  const mx = points.reduce((a, m) => a + m.score, 0) / n;
  const my = points.reduce((a, m) => a + (m[sub] as number), 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (const m of points) {
    sxy += (m.score - mx) * ((m[sub] as number) - my);
    sxx += (m.score - mx) ** 2;
  }
  const slope = sxx > 0 ? sxy / sxx : 0;
  const residual = (m: PickModel) =>
    (m[sub] as number) - (my + slope * (m.score - mx));
  const sd = Math.sqrt(points.reduce((a, m) => a + residual(m) ** 2, 0) / n);
  if (sd === 0) return () => 0;
  return (m: PickModel) => {
    if (m[sub] === null) return 0;
    const shift = (residual(m) / sd) * (SUB_SWING / 2);
    return Math.max(-SUB_SWING, Math.min(SUB_SWING, shift));
  };
}

function passes(model: PickModel, filters: PickFilters): boolean {
  if (filters.use === "cheap" && model.blendedPerMillion === null) return false;
  if (filters.budget !== null) {
    if (model.blendedPerMillion === null) return false;
    if (model.blendedPerMillion > filters.budget) return false;
  }
  if (filters.open && !model.isOpenWeights) return false;
  if (
    filters.hot &&
    !(model.popularityRank !== null && model.popularityRank <= HOT_RANK)
  ) {
    return false;
  }
  return true;
}

function money(value: number): string {
  if (value === 0) return "免费";
  return `$${value < 1 ? value.toFixed(2) : round1(value)}`;
}

/** Models priced within half to double the given price. */
function pricePeers(model: PickModel, all: PickModel[]): PickModel[] {
  const price = model.blendedPerMillion;
  if (price === null) return [];
  const low = Math.max(price, PRICE_FLOOR) / 2;
  const high = Math.max(price, PRICE_FLOOR) * 2;
  return all.filter(
    (m) =>
      m.familyKey !== model.familyKey &&
      m.blendedPerMillion !== null &&
      m.blendedPerMillion >= low &&
      m.blendedPerMillion <= high,
  );
}

function reasonFor(
  model: PickModel,
  all: PickModel[],
  candidates: PickModel[],
  filters: PickFilters,
  sub: SubKey | null,
): string {
  const parts: string[] = [];
  const price = model.blendedPerMillion;
  const peers = pricePeers(model, all);

  if (price !== null && model.tier !== "rest") {
    const tierPrices = all
      .filter((m) => m.tier === model.tier && m.blendedPerMillion !== null)
      .map((m) => m.blendedPerMillion as number);
    if (tierPrices.length > 1 && price <= Math.min(...tierPrices)) {
      parts.push(`${model.tierLabel}里最便宜`);
    }
  }

  if (sub && model[sub] !== null) {
    const peerMedian = median(
      peers.filter((m) => m[sub] !== null).map((m) => m[sub] as number),
    );
    if (peerMedian !== null) {
      const diff = round1((model[sub] as number) - peerMedian);
      if (diff >= 1) {
        parts.push(`${SUB_LABEL[sub]} 比同价位模型的中位数高 ${diff.toFixed(1)} 分`);
      }
    }
  }

  const top = Math.max(...candidates.map((m) => m.score));
  if (model.score >= top && candidates.length > 1) {
    parts.push(
      filters.budget !== null
        ? `${money(filters.budget)} 预算内综合分最高`
        : "符合条件的模型里综合分最高",
    );
  }

  if (parts.length < 2) {
    const peerMedian = median(peers.map((m) => m.score));
    if (peerMedian !== null) {
      const diff = round1(model.score - peerMedian);
      if (diff >= 1) {
        parts.push(`综合分比同价位模型的中位数高 ${diff.toFixed(1)} 分`);
      }
    }
  }

  if (
    parts.length < 2 &&
    model.popularityRank !== null &&
    model.popularityRank <= HOT_RANK
  ) {
    parts.push(`OpenRouter 近 7 天使用量第 ${model.popularityRank}`);
  }

  if (parts.length === 0) {
    parts.push(
      price === null
        ? `${model.tierLabel}，综合分 ${model.score.toFixed(1)}`
        : `${model.tierLabel}，综合分 ${model.score.toFixed(1)}，混合单价 ${money(price)}`,
    );
  }
  return `${parts.slice(0, 2).join("，")}。`;
}

function count(models: PickModel[], filters: PickFilters): number {
  return models.filter((m) => passes(m, filters)).length;
}

/** When nothing matches: which single condition to loosen, and what it yields. */
function relaxHints(models: PickModel[], filters: PickFilters): RelaxHint[] {
  const hints: RelaxHint[] = [];
  if (filters.budget !== null) {
    const wider = BUDGETS.filter(
      (b): b is number => b !== null && b > (filters.budget as number),
    );
    const next = [...wider, null].find(
      (budget) => count(models, { ...filters, budget }) > 0,
    );
    if (next !== undefined) {
      const relaxed = { ...filters, budget: next };
      hints.push({
        label: next === null ? "预算改为不限" : `预算放宽到 ${money(next)}`,
        count: count(models, relaxed),
        filters: relaxed,
      });
    }
  }
  if (filters.open) {
    const relaxed = { ...filters, open: false };
    const n = count(models, relaxed);
    if (n > 0) hints.push({ label: "取消“只看开源”", count: n, filters: relaxed });
  }
  if (filters.hot) {
    const relaxed = { ...filters, hot: false };
    const n = count(models, relaxed);
    if (n > 0) hints.push({ label: "取消“只看热门”", count: n, filters: relaxed });
  }
  if (hints.length === 0 && (filters.open || filters.hot)) {
    const relaxed = { ...filters, open: false, hot: false };
    const n = count(models, relaxed);
    if (n > 0) {
      hints.push({
        label: "同时取消“只看开源”和“只看热门”",
        count: n,
        filters: relaxed,
      });
    }
  }
  return hints.sort((a, b) => b.count - a.count);
}

export function pickModels(models: PickModel[], filters: PickFilters): PickResult {
  const sub = SUB_OF[filters.use] ?? null;
  const adjust = sub ? subAdjuster(models, sub) : () => 0;
  const candidates = models.filter((m) => passes(m, filters));

  const rankScore = (m: PickModel) => {
    if (filters.use === "cheap") {
      const price = Math.max(m.blendedPerMillion as number, PRICE_FLOOR);
      return m.score - TIER_STEP * Math.log2(price);
    }
    return m.score + adjust(m);
  };

  const ranked = candidates
    .map((model) => ({ model, rankScore: rankScore(model) }))
    .sort((a, b) => {
      if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore;
      if (filters.use === "long") {
        const diff = (b.model.contextLength ?? 0) - (a.model.contextLength ?? 0);
        if (diff !== 0) return diff;
      }
      const pa = a.model.blendedPerMillion ?? Number.POSITIVE_INFINITY;
      const pb = b.model.blendedPerMillion ?? Number.POSITIVE_INFINITY;
      if (pa !== pb) return pa - pb;
      return a.model.family.localeCompare(b.model.family);
    });

  const picks: Pick[] = ranked.slice(0, MAX_PICKS).map(({ model, rankScore: s }) => ({
    model,
    rankScore: s,
    subKey: sub,
    subValue: sub ? model[sub] : null,
    subMissing: filters.use === "agent" || (sub !== null && model[sub] === null),
    reason: reasonFor(model, models, candidates, filters, sub),
  }));

  return {
    picks,
    matched: candidates.length,
    hints: picks.length === 0 ? relaxHints(models, filters) : [],
  };
}

// ---------------------------------------------------------------------------
// URL parameters: /pick?use=coding&budget=3&open=1&hot=1

export const DEFAULT_FILTERS: PickFilters = {
  use: "general",
  budget: null,
  open: false,
  hot: false,
};

export function parseFilters(params: URLSearchParams): PickFilters {
  const use = params.get("use");
  const budget = Number(params.get("budget"));
  return {
    use: USE_CASES.some((item) => item.key === use)
      ? (use as UseCase)
      : DEFAULT_FILTERS.use,
    budget: BUDGETS.includes(budget) && budget > 0 ? budget : null,
    open: params.get("open") === "1",
    hot: params.get("hot") === "1",
  };
}

export function filtersToQuery(filters: PickFilters): string {
  const params = new URLSearchParams();
  if (filters.use !== DEFAULT_FILTERS.use) params.set("use", filters.use);
  if (filters.budget !== null) params.set("budget", String(filters.budget));
  if (filters.open) params.set("open", "1");
  if (filters.hot) params.set("hot", "1");
  return params.toString();
}
