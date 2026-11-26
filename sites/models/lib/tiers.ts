// Tier leaderboard: groups model families by how far their best score sits
// behind the leader, instead of giving every model an exact rank. Adjacent
// AA Intelligence Index scores are usually less than a point apart, so a
// "#11 vs #12" ordering suggests more precision than the data has.
//
// Kept free of runtime imports so the data scripts can load it directly with
// Node's type stripping (node scripts/snapshot-tiers.mjs).
import type {
  PopularRecord,
  PriceRecord,
  RankingRecord,
} from "./types";

/** Points behind the leader that one tier spans. */
export const TIER_STEP = 5;
export const TIER_COUNT = 5;

export type TierKey = "T1" | "T2" | "T3" | "T4" | "T5" | "rest";

export type TierModel = {
  familyKey: string;
  family: string;
  /** Artificial Analysis model ids of every setting in the family. */
  ids: string[];
  /** Slug of the setting that represents the family (its best score). */
  slug: string;
  /** Reasoning effort of that setting, e.g. "Max"; null when not stated. */
  effort: string | null;
  variantCount: number;
  creator: string;
  creatorSlug: string;
  creatorLogo: string;
  score: number;
  gap: number;
  inputPerMillion: number | null;
  outputPerMillion: number | null;
  /** 3:1 input/output blended price per million tokens (USD). */
  blendedPerMillion: number | null;
  releaseDate: string | null;
  isOpenWeights: boolean | null;
  /** Best OpenRouter weekly rank of the family, if it is in the top list. */
  popularityRank: number | null;
};

export type Tier = {
  key: TierKey;
  label: string;
  /** Points behind the leader covered by this tier: [min, max). */
  range: [number, number | null];
  models: TierModel[];
};

export type TierBoard = {
  updatedAt: string;
  leaderScore: number;
  tiers: Tier[];
};

const EFFORT_WORDS =
  /^(max|xhigh|high|medium|low|minimal|reasoning|non-reasoning)$/i;

const TIER_LABELS: Record<TierKey, string> = {
  T1: "第一梯队",
  T2: "第二梯队",
  T3: "第三梯队",
  T4: "第四梯队",
  T5: "第五梯队",
  rest: "其他",
};

// Artificial Analysis gives the newest version of a model the plain slug and
// moves older versions to a dated one (deepseek-v4-flash → deepseek-v4-flash-0420).
// The family key keeps that date, so two versions stay two families; only the
// reasoning-effort suffix is dropped, whether it comes before or after the date.
const VERSION_DATE = "(?=(?:-\\d{4})?$)";
const EFFORT_SUFFIX = new RegExp(`-(?:xhigh|high|medium|low|max|minimal)${VERSION_DATE}`);
const REASONING_SUFFIX = new RegExp(`-(?:non-reasoning|reasoning)${VERSION_DATE}`);

export function familyKeyFromSlug(slug: string): string {
  return slug.toLowerCase().replace(EFFORT_SUFFIX, "").replace(REASONING_SUFFIX, "");
}

/** Family key as history files before model ids wrote it (date dropped too). */
function legacyFamilyKey(key: string): string {
  return key.replace(/-\d{4}$/, "");
}

/** "Claude Fable 5.2 (Max, Default Fallback)" → "Max" */
export function effortFromName(name: string): string | null {
  const match = name.match(/\(([^)]+)\)\s*$/);
  if (!match) return null;
  const first = match[1].split(",")[0].trim();
  return EFFORT_WORDS.test(first) ? first : null;
}

/** "Claude Fable 5.2 (Max, Default Fallback)" → "Claude Fable 5.2" */
export function familyLabelFromName(name: string): string {
  const match = name.match(/\s*\(([^)]+)\)\s*$/);
  if (!match) return name.trim();
  const first = match[1].split(",")[0].trim();
  if (!EFFORT_WORDS.test(first) && !/fallback/i.test(match[1])) {
    return name.trim();
  }
  return name.slice(0, match.index).trim();
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b\d{4}\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function blendedPrice(
  input: number | null,
  output: number | null,
): number | null {
  if (input === null || output === null) return null;
  return (input * 3 + output) / 4;
}

export function tierKeyForGap(gap: number): TierKey {
  const index = Math.floor(gap / TIER_STEP);
  if (index < TIER_COUNT) return `T${index + 1}` as TierKey;
  return "rest";
}

export function buildTiers(
  rankings: RankingRecord[],
  prices: PriceRecord[] = [],
  popularity: PopularRecord[] = [],
  updatedAt = "",
): TierBoard {
  const priceBySlug = new Map(prices.map((item) => [item.id, item]));
  const priceById = new Map(
    prices.filter((item) => item.modelId).map((item) => [item.modelId, item]),
  );

  const popularityByName = new Map<string, number>();
  for (const item of popularity) {
    const key = normalizeName(item.name);
    const current = popularityByName.get(key);
    if (current === undefined || item.rank < current) {
      popularityByName.set(key, item.rank);
    }
  }

  const families = new Map<string, RankingRecord[]>();
  for (const item of rankings) {
    if (typeof item.intelligenceIndex !== "number") continue;
    const key = familyKeyFromSlug(item.slug);
    const list = families.get(key) ?? [];
    list.push(item);
    families.set(key, list);
  }

  const leaderScore = Math.max(
    ...[...families.values()].flat().map((item) => item.intelligenceIndex),
  );

  const models: TierModel[] = [...families.entries()].map(([key, items]) => {
    const best = [...items].sort(
      (a, b) => b.intelligenceIndex - a.intelligenceIndex,
    )[0];
    const price =
      (best.modelId ? priceById.get(best.modelId) : undefined) ??
      priceBySlug.get(best.slug);
    const family = familyLabelFromName(best.shortName || best.name);
    const input = price?.inputPerMillion ?? null;
    const output = price?.outputPerMillion ?? null;
    return {
      familyKey: key,
      family,
      ids: items
        .map((item) => item.modelId)
        .filter((id): id is string => Boolean(id))
        .sort(),
      slug: best.slug,
      effort: effortFromName(best.shortName || best.name),
      variantCount: items.length,
      creator: best.creator,
      creatorSlug: best.creatorSlug,
      creatorLogo: best.creatorLogo,
      score: best.intelligenceIndex,
      gap: Math.round((leaderScore - best.intelligenceIndex) * 10) / 10,
      inputPerMillion: input,
      outputPerMillion: output,
      blendedPerMillion: blendedPrice(input, output),
      releaseDate: best.releaseDate ?? price?.releaseDate ?? null,
      isOpenWeights: price?.isOpenWeights ?? best.isOpenWeights ?? null,
      popularityRank: popularityByName.get(normalizeName(family)) ?? null,
    };
  });

  const order: TierKey[] = ["T1", "T2", "T3", "T4", "T5", "rest"];
  const tiers: Tier[] = order.map((key, index) => ({
    key,
    label: TIER_LABELS[key],
    range:
      key === "rest"
        ? [TIER_STEP * TIER_COUNT, null]
        : [TIER_STEP * index, TIER_STEP * (index + 1)],
    models: [],
  }));
  const tierByKey = new Map(tiers.map((tier) => [tier.key, tier]));
  for (const model of models) {
    tierByKey.get(tierKeyForGap(model.gap))!.models.push(model);
  }

  // Inside a tier the scores are close, so cheaper comes first. Models
  // without a price go last, then higher score breaks ties.
  for (const tier of tiers) {
    tier.models.sort((a, b) => {
      if (tier.key === "rest") return b.score - a.score;
      const pa = a.blendedPerMillion ?? Number.POSITIVE_INFINITY;
      const pb = b.blendedPerMillion ?? Number.POSITIVE_INFINITY;
      if (pa !== pb) return pa - pb;
      return b.score - a.score;
    });
  }

  return { updatedAt, leaderScore, tiers };
}

// ---------------------------------------------------------------------------
// History and "what changed"

export type TierHistoryEntry = {
  familyKey: string;
  family: string;
  score: number;
  tier: TierKey;
  /** Artificial Analysis model ids of the family. Missing in older files. */
  ids?: string[];
};

export type TierHistory = {
  updatedAt: string;
  leaderScore: number;
  entries: TierHistoryEntry[];
};

export type TierMove = {
  family: string;
  from: TierKey;
  to: TierKey;
  score: number;
};

export type TierChanges = {
  from: string | null;
  to: string;
  leader: { family: string; score: number; isNew: boolean };
  newEntries: { family: string; tier: TierKey; score: number }[];
  promoted: TierMove[];
  demoted: TierMove[];
  summary: string;
};

export function toHistory(board: TierBoard): TierHistory {
  return {
    updatedAt: board.updatedAt,
    leaderScore: board.leaderScore,
    entries: board.tiers.flatMap((tier) =>
      tier.models.map((model) => ({
        familyKey: model.familyKey,
        family: model.family,
        score: model.score,
        tier: tier.key,
        ids: model.ids,
      })),
    ),
  };
}

const TIER_RANK: Record<TierKey, number> = {
  T1: 1,
  T2: 2,
  T3: 3,
  T4: 4,
  T5: 5,
  rest: 6,
};

function hasIds(entry: TierHistoryEntry): boolean {
  return Array.isArray(entry.ids) && entry.ids.length > 0;
}

/** True when the history file was written before model ids were stored. */
export function historyLacksIds(history: TierHistory | null): boolean {
  return Boolean(history?.entries.length) && !history!.entries.some(hasIds);
}

/**
 * Pairs each current family with the same family in the previous board.
 * Families are the same when they share an Artificial Analysis model id, so a
 * new version that took over a slug is a new family, not a score change.
 * Entries from files written before ids were stored are paired by family key.
 */
export function matchHistory(
  previous: TierHistory | null,
  current: TierHistory,
): Map<TierHistoryEntry, TierHistoryEntry> {
  const pairs = new Map<TierHistoryEntry, TierHistoryEntry>();
  if (!previous) return pairs;
  const used = new Set<TierHistoryEntry>();

  const byId = new Map<string, TierHistoryEntry>();
  const byKey = new Map<string, TierHistoryEntry>();
  const byLegacyKey = new Map<string, TierHistoryEntry>();
  for (const entry of previous.entries) {
    if (!byKey.has(entry.familyKey)) byKey.set(entry.familyKey, entry);
    if (hasIds(entry)) {
      for (const id of entry.ids!) if (!byId.has(id)) byId.set(id, entry);
    } else {
      const legacy = legacyFamilyKey(entry.familyKey);
      if (!byLegacyKey.has(legacy)) byLegacyKey.set(legacy, entry);
    }
  }

  const take = (cur: TierHistoryEntry, prev: TierHistoryEntry | undefined) => {
    if (!prev || used.has(prev)) return false;
    pairs.set(cur, prev);
    used.add(prev);
    return true;
  };

  // Pair by id first, so a family's own previous entry is taken before any
  // other family can claim it by key.
  const rest: TierHistoryEntry[] = [];
  for (const entry of current.entries) {
    const prev = hasIds(entry)
      ? entry.ids!.map((id) => byId.get(id)).find((p) => p && !used.has(p))
      : undefined;
    if (!take(entry, prev)) rest.push(entry);
  }
  for (const entry of rest) {
    if (take(entry, byLegacyKey.get(legacyFamilyKey(entry.familyKey)))) continue;
    // Only when this run has no ids at all for the family: pair by key.
    if (!hasIds(entry)) take(entry, byKey.get(entry.familyKey));
  }
  return pairs;
}

/** True when the tier membership differs, so a new history file is worth keeping. */
export function historyChanged(
  previous: TierHistory | null,
  current: TierHistory,
): boolean {
  if (!previous) return true;
  const pairs = matchHistory(previous, current);
  if (pairs.size !== current.entries.length) return true;
  if (pairs.size !== previous.entries.length) return true;
  for (const [cur, prev] of pairs) if (cur.tier !== prev.tier) return true;
  return false;
}

/**
 * An older history file with the ids of the matching current families added.
 * Use it only when historyChanged() is false, so both boards hold the same
 * families in the same tiers.
 */
export function withIds(
  previous: TierHistory,
  current: TierHistory,
): TierHistory {
  const idsByPrevious = new Map<TierHistoryEntry, string[]>();
  for (const [cur, prev] of matchHistory(previous, current)) {
    if (hasIds(cur)) idsByPrevious.set(prev, cur.ids!);
  }
  return {
    ...previous,
    entries: previous.entries.map((entry) => {
      const ids = idsByPrevious.get(entry);
      return ids ? { ...entry, ids } : entry;
    }),
  };
}

function formatDay(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // Beijing date, since the posts are written for a Chinese audience.
  const bj = new Date(d.getTime() + 8 * 3600 * 1000);
  return `${bj.getUTCMonth() + 1}月${bj.getUTCDate()}日`;
}

export function diffTiers(
  previous: TierHistory | null,
  current: TierHistory,
): TierChanges {
  const pairs = matchHistory(previous, current);
  const ranked = current.entries.filter((entry) => entry.tier !== "rest");
  const leaderEntry = [...current.entries].sort((a, b) => b.score - a.score)[0];
  const prevLeader = previous
    ? [...previous.entries].sort((a, b) => b.score - a.score)[0]
    : null;

  const newEntries: TierChanges["newEntries"] = [];
  const promoted: TierMove[] = [];
  const demoted: TierMove[] = [];

  if (previous) {
    for (const entry of current.entries) {
      const before = pairs.get(entry);
      if (!before) {
        if (entry.tier !== "rest") {
          newEntries.push({
            family: entry.family,
            tier: entry.tier,
            score: entry.score,
          });
        }
        continue;
      }
      if (before.tier === entry.tier) continue;
      const move = {
        family: entry.family,
        from: before.tier,
        to: entry.tier,
        score: entry.score,
      };
      if (TIER_RANK[entry.tier] < TIER_RANK[before.tier]) promoted.push(move);
      else demoted.push(move);
    }
  }

  const byTier = (a: { tier?: TierKey; to?: TierKey; score: number }, b: typeof a) =>
    TIER_RANK[(a.tier ?? a.to)!] - TIER_RANK[(b.tier ?? b.to)!] ||
    b.score - a.score;
  newEntries.sort(byTier);
  promoted.sort(byTier);
  demoted.sort(byTier);

  const leader = {
    family: leaderEntry?.family ?? "",
    score: leaderEntry?.score ?? 0,
    isNew: Boolean(prevLeader && leaderEntry && pairs.get(leaderEntry) !== prevLeader),
  };

  const changes: TierChanges = {
    from: previous?.updatedAt ?? null,
    to: current.updatedAt,
    leader,
    newEntries,
    promoted,
    demoted,
    summary: "",
  };
  changes.summary = buildSummary(changes, ranked);
  return changes;
}

function tierName(key: TierKey): string {
  return TIER_LABELS[key];
}

function buildSummary(
  changes: TierChanges,
  ranked: TierHistoryEntry[],
): string {
  const lines: string[] = [];
  const day = formatDay(changes.to);
  lines.push(`大模型梯队榜更新${day ? `（${day}）` : ""}`);
  lines.push("");

  const top = ranked
    .filter((entry) => entry.tier === "T1")
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.family);
  if (changes.leader.isNew) {
    lines.push(`新榜首：${changes.leader.family}（${changes.leader.score.toFixed(1)} 分）`);
  }
  if (top.length > 0) lines.push(`第一梯队：${top.join("、")}`);

  if (!changes.from) {
    lines.push("");
    lines.push("首期榜单：按与榜首的差距每 5 分一档，同档内按价格从低到高排。");
  } else {
    if (changes.newEntries.length > 0) {
      lines.push(
        `新上榜：${changes.newEntries
          .map((e) => `${e.family}（${tierName(e.tier)}）`)
          .join("、")}`,
      );
    }
    if (changes.promoted.length > 0) {
      lines.push(
        `升档：${changes.promoted
          .map((m) => `${m.family} ${tierName(m.from)}→${tierName(m.to)}`)
          .join("、")}`,
      );
    }
    if (changes.demoted.length > 0) {
      lines.push(
        `降档：${changes.demoted
          .map((m) => `${m.family} ${tierName(m.from)}→${tierName(m.to)}`)
          .join("、")}`,
      );
    }
    if (
      changes.newEntries.length === 0 &&
      changes.promoted.length === 0 &&
      changes.demoted.length === 0 &&
      !changes.leader.isNew
    ) {
      lines.push("本期梯队没有变化。");
    }
  }

  lines.push("");
  lines.push("数据：Artificial Analysis Intelligence Index");
  return lines.join("\n");
}
