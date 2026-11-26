// One function per section of the digest. Each takes plain data and returns a
// plain object, so they can be tested without the network or the file system.
import { dateInWeek } from './week.mjs';

export const TIER_LABEL = { T1: '第一梯队', T2: '第二梯队', T3: '第三梯队', T4: '第四梯队', T5: '第五梯队', rest: '五档以外' };

/**
 * Model tiers. `snapshots` are the files of data/history in the models repo
 * ({ updatedAt, leaderScore, entries }). The comparison itself is done by
 * `diffTiers` from that repo's lib/tiers.ts, so the rules live in one place.
 */
export function modelsSection({ snapshots, popularity, week, diffTiers }) {
  const sorted = [...snapshots].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  const untilEnd = sorted.filter((s) => new Date(s.updatedAt) < new Date(week.end));
  if (untilEnd.length === 0) throw new Error('no tier snapshot exists before the end of this week');
  const current = untilEnd[untilEnd.length - 1];
  const beforeWeek = sorted.filter((s) => new Date(s.updatedAt) < new Date(week.start));
  // No snapshot from before the week (the first weeks of recording): start from the earliest one inside it.
  const previous = beforeWeek.length ? beforeWeek[beforeWeek.length - 1] : untilEnd[0];
  const changes = diffTiers(previous, current);
  const previousLeader = [...previous.entries].sort((a, b) => b.score - a.score)[0];
  const tier1 = current.entries.filter((e) => e.tier === 'T1').sort((a, b) => b.score - a.score).map((e) => ({ family: e.family, score: e.score }));
  return {
    from: previous.updatedAt,
    to: current.updatedAt,
    leader: { family: changes.leader.family, score: changes.leader.score },
    leaderChanged: previousLeader.family !== changes.leader.family,
    previousLeader: { family: previousLeader.family, score: previousLeader.score },
    tier1,
    newEntries: changes.newEntries,
    promoted: changes.promoted,
    demoted: changes.demoted,
    popular: (popularity?.items ?? []).slice(0, 5).map((item) => ({ rank: item.rank, name: item.name, provider: item.provider })),
  };
}

/**
 * Official articles published this week. Many entries carry no date, so the
 * digest keeps its own record of the issue in which it first saw each URL
 * (`seen` maps url to an ISO week such as "2026-W48") and files an undated
 * article under that issue. With no state yet (`seen` is null) the run only
 * records what exists, so the backlog is not announced as new.
 */
export function articlesSection({ articles, seen, week }) {
  if (!Array.isArray(articles)) throw new Error('articles.json is not a list');
  const firstRun = seen === null;
  const nextSeen = { ...(seen ?? {}) };
  for (const article of articles) {
    if (article?.url && !(article.url in nextSeen)) nextSeen[article.url] = firstRun ? 'baseline' : week.isoWeek;
  }
  const items = articles
    .filter((a) => a?.url && a?.title)
    .filter((a) => (a.date ? dateInWeek(week, a.date) : nextSeen[a.url] === week.isoWeek))
    .map((a) => ({ src: a.src, title: a.title, url: a.url, date: a.date || null }))
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title));
  return { items, seen: nextSeen };
}

/**
 * Entries newly added to the tools catalog since the previous issue. `seen`
 * maps id to the ISO week of the issue that first saw it, so building the same
 * issue twice lists the same entries. With no state yet (`seen` is null) the
 * run only records a baseline.
 */
export function toolsSection({ catalog, seen, week }) {
  if (!catalog || !Array.isArray(catalog.items)) throw new Error('catalog.json has no items list');
  const firstRun = seen === null;
  const nextSeen = { ...(seen ?? {}) };
  for (const item of catalog.items) {
    if (item?.id && !(item.id in nextSeen)) nextSeen[item.id] = firstRun ? 'baseline' : week.isoWeek;
  }
  const items = catalog.items
    .filter((item) => item?.id && nextSeen[item.id] === week.isoWeek)
    .map((item) => ({ id: item.id, kind: item.kind, title: item.title?.zh || item.title?.en || item.id, summary: item.summary?.zh || '', url: item.url, sourceUrl: item.sourceUrl || null }));
  return { baseline: firstRun, total: catalog.items.length, items, seen: nextSeen };
}
