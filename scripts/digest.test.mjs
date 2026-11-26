import { test } from 'node:test';
import assert from 'node:assert/strict';
import { articlesSection, docsSection, modelsSection, toolsSection } from './lib/sections.mjs';
import { TWEET_LIMIT, issueHtml, issueSummary, noteHtml, thread, weight } from './lib/render.mjs';
import { dateInWeek, inWeek, lastCompleteWeek, weekContaining } from './lib/week.mjs';

const W48 = weekContaining(new Date('2026-11-25T04:00:00Z'));

test('a week runs Monday 00:00 to Sunday 24:00 in Taipei', () => {
  assert.equal(W48.startDate, '2026-11-23');
  assert.equal(W48.endDate, '2026-11-29');
  assert.equal(W48.start, '2026-11-22T16:00:00.000Z');
  assert.equal(W48.end, '2026-11-29T16:00:00.000Z');
  assert.equal(W48.isoWeek, '2026-W48');
  assert.equal(W48.label, '2026 年 11 月 23 日 – 11 月 29 日');
  // Sunday 23:59 Taipei is still inside; Monday 00:00 is the next week.
  assert.equal(weekContaining(new Date('2026-11-29T15:59:00Z')).isoWeek, '2026-W48');
  assert.equal(weekContaining(new Date('2026-11-29T16:00:00Z')).isoWeek, '2026-W49');
  assert.ok(inWeek(W48, '2026-11-22T16:00:00Z'));
  assert.ok(!inWeek(W48, '2026-11-29T16:00:00Z'));
  assert.ok(dateInWeek(W48, '2026-11-29'));
  assert.ok(!dateInWeek(W48, '2026-11-30'));
  assert.ok(!dateInWeek(W48, null));
});

test('the scheduled run on Monday 08:17 Taipei covers the week that just ended', () => {
  assert.equal(lastCompleteWeek(new Date('2026-11-30T00:17:00Z')).isoWeek, '2026-W48');
  assert.equal(lastCompleteWeek(new Date('2026-11-26T09:00:00Z')).isoWeek, '2026-W47');
  assert.equal(weekContaining(new Date('2027-01-01T04:00:00Z')).isoWeek, '2026-W53');
});

const snap = (updatedAt, entries) => ({ updatedAt, leaderScore: Math.max(...entries.map((e) => e.score)), entries });
const entry = (family, score, tier) => ({ familyKey: family.toLowerCase(), family, score, tier, ids: [family] });
// Stand-in for lib/tiers.ts of the models repo; the real one is used in production.
const fakeDiff = (previous, current) => {
  const before = new Map(previous.entries.map((e) => [e.family, e]));
  const leader = [...current.entries].sort((a, b) => b.score - a.score)[0];
  return {
    leader: { family: leader.family, score: leader.score },
    newEntries: current.entries.filter((e) => !before.has(e.family) && e.tier !== 'rest').map((e) => ({ family: e.family, tier: e.tier, score: e.score })),
    promoted: current.entries.filter((e) => before.has(e.family) && before.get(e.family).tier > e.tier).map((e) => ({ family: e.family, from: before.get(e.family).tier, to: e.tier, score: e.score })),
    demoted: current.entries.filter((e) => before.has(e.family) && before.get(e.family).tier < e.tier).map((e) => ({ family: e.family, from: before.get(e.family).tier, to: e.tier, score: e.score })),
  };
};

test('models: compares the last snapshot before the week with the last one inside it', () => {
  const snapshots = [
    snap('2026-11-20T00:00:00Z', [entry('A', 60, 'T1'), entry('B', 54, 'T2')]),
    snap('2026-11-22T10:00:00Z', [entry('A', 60, 'T1'), entry('B', 54, 'T2'), entry('Old', 50, 'T2')]),
    snap('2026-11-25T00:00:00Z', [entry('A', 60, 'T1'), entry('B', 57, 'T1'), entry('C', 61, 'T1')]),
    snap('2026-11-30T03:00:00Z', [entry('Later', 70, 'T1')]),
  ];
  const m = modelsSection({ snapshots, popularity: { items: [{ rank: 1, name: 'P', provider: 'X' }] }, week: W48, diffTiers: fakeDiff });
  assert.equal(m.from, '2026-11-22T10:00:00Z');
  assert.equal(m.to, '2026-11-25T00:00:00Z');
  assert.equal(m.leaderChanged, true);
  assert.deepEqual(m.leader, { family: 'C', score: 61 });
  assert.equal(m.previousLeader.family, 'A');
  assert.deepEqual(m.newEntries.map((e) => e.family), ['C']);
  assert.deepEqual(m.promoted.map((e) => e.family), ['B']);
  assert.deepEqual(m.tier1.map((e) => e.family), ['C', 'A', 'B']);
});

test('models: with no snapshot before the week, starts from the earliest one inside it', () => {
  const snapshots = [snap('2026-11-24T00:00:00Z', [entry('A', 60, 'T1')]), snap('2026-11-26T00:00:00Z', [entry('A', 60, 'T1'), entry('B', 58, 'T1')])];
  const m = modelsSection({ snapshots, popularity: null, week: W48, diffTiers: fakeDiff });
  assert.equal(m.from, '2026-11-24T00:00:00Z');
  assert.deepEqual(m.newEntries.map((e) => e.family), ['B']);
  assert.deepEqual(m.popular, []);
  assert.throws(() => modelsSection({ snapshots: [snap('2026-12-05T00:00:00Z', [entry('A', 1, 'T1')])], popularity: null, week: W48, diffTiers: fakeDiff }));
});

test('docs: keeps this week\'s entries and copes with an empty list', () => {
  assert.deepEqual(docsSection({ updates: [], week: W48 }).items, []);
  const updates = [
    { date: '2026-11-24', agent: 'Codex', type: 'added', title: 'T', url: 'https://x/t' },
    { date: '2026-11-20', agent: 'Codex', type: 'added', title: 'Old', url: 'https://x/o' },
  ];
  assert.deepEqual(docsSection({ updates, week: W48 }).items.map((i) => i.title), ['T']);
  assert.throws(() => docsSection({ updates: { nope: 1 }, week: W48 }));
});

test('tools: the first run only records a baseline', () => {
  const catalog = { items: [{ id: 'a', kind: 'tool', title: { zh: '甲' }, summary: { zh: '一句' }, url: 'https://t/a' }, { id: 'b', kind: 'site', title: { zh: '乙' } }] };
  const first = toolsSection({ catalog, seen: null, week: W48 });
  assert.equal(first.baseline, true);
  assert.deepEqual(first.items, []);
  assert.equal(first.total, 2);

  const W49 = weekContaining(new Date('2026-12-02T04:00:00Z'));
  const grown = { items: [...catalog.items, { id: 'c', kind: 'skill', title: { zh: '丙' }, summary: { zh: '新的' }, url: 'https://t/c', sourceUrl: 'https://c' }] };
  const second = toolsSection({ catalog: grown, seen: first.seen, week: W49 });
  assert.equal(second.baseline, false);
  assert.deepEqual(second.items.map((i) => i.id), ['c']);
  // Building the same issue again lists the same entry; the issue after it does not.
  assert.deepEqual(toolsSection({ catalog: grown, seen: second.seen, week: W49 }).items.map((i) => i.id), ['c']);
  const W50 = weekContaining(new Date('2026-12-09T04:00:00Z'));
  assert.deepEqual(toolsSection({ catalog: grown, seen: second.seen, week: W50 }).items, []);
  assert.throws(() => toolsSection({ catalog: { nope: true }, seen: null, week: W48 }));
});

test('articles: dated ones go by date, undated ones by the issue that first saw them', () => {
  const articles = [
    { src: 'S', title: 'Dated in week', url: 'https://a/1', date: '2026-11-25' },
    { src: 'S', title: 'Dated earlier', url: 'https://a/2', date: '2026-11-10' },
    { src: 'S', title: 'Undated backlog', url: 'https://a/3', date: null },
  ];
  const first = articlesSection({ articles, seen: null, week: W48 });
  assert.deepEqual(first.items.map((i) => i.title), ['Dated in week']);
  const W49 = weekContaining(new Date('2026-12-02T04:00:00Z'));
  const second = articlesSection({ articles: [...articles, { src: 'S', title: 'Undated new', url: 'https://a/4' }], seen: first.seen, week: W49 });
  assert.deepEqual(second.items.map((i) => i.title), ['Undated new']);
});

const issue = (over = {}) => ({
  number: 7,
  week: W48,
  generatedAt: '2026-11-30T00:17:00Z',
  models: { status: 'ok', leader: { family: 'A', score: 64.8 }, leaderChanged: false, previousLeader: { family: 'A', score: 64.8 }, tier1: [{ family: 'A', score: 64.8 }], newEntries: [], promoted: [], demoted: [], popular: [] },
  docs: { status: 'ok', items: [] },
  articles: { status: 'ok', items: [] },
  tools: { status: 'ok', baseline: false, total: 36, items: [] },
  ...over,
});

test('a quiet section says so instead of disappearing', () => {
  const html = issueHtml(issue());
  for (const heading of ['模型梯队', 'Agent 文档', '官方文章', '新收录工具']) assert.ok(html.includes(`<h2>${heading}</h2>`), heading);
  assert.equal(html.split('本周没有变化').length - 1, 4);
});

test('one failed source leaves the other sections in place', () => {
  const html = issueHtml(issue({ models: { status: 'failed', error: 'x' }, tools: { status: 'failed', error: '404' } }));
  assert.ok(html.includes('<h2>模型梯队</h2>'));
  assert.ok(html.includes('这一节的数据本周没有取到'));
  assert.ok(html.includes('<h2>Agent 文档</h2>'));
  assert.ok(!html.includes('新收录工具'), 'the tools section is left out when its source fails');
  assert.ok(issueSummary(issue({ models: { status: 'failed' } })).length > 0);
  assert.ok(thread(issue({ models: { status: 'failed' }, tools: { status: 'failed' } })).length >= 2);
});

test('titles and links from the sources are escaped', () => {
  const html = issueHtml(issue({ articles: { status: 'ok', items: [{ src: 'S', title: '<script>x</script>', url: 'javascript:alert(1)', date: null }] } }));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('javascript:'));
});

test('the editor\'s note is rendered first and stays plain', () => {
  const html = issueHtml(issue(), '这周**值得看**的是 [梯队榜](https://models.wenworks.dev/)。\n\n- 一\n- 二 <b>x</b>');
  assert.ok(html.indexOf('编辑手记') < html.indexOf('模型梯队'));
  assert.ok(html.includes('<strong>值得看</strong>'));
  assert.ok(html.includes('<a href="https://models.wenworks.dev/">梯队榜</a>'));
  assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt;'));
  assert.equal(noteHtml('a\n\nb').split('<p>').length - 1, 2);
});

test('every line of the thread fits 140 Chinese characters', () => {
  const long = Array.from({ length: 30 }, (_, i) => ({ family: `特别长的模型名字 Model ${i}`, tier: 'T1', score: 60, from: 'T2', to: 'T1' }));
  const busy = issue({
    models: { status: 'ok', leader: { family: 'A', score: 64.8 }, leaderChanged: false, previousLeader: { family: 'A', score: 64.8 }, tier1: long, newEntries: long, promoted: long, demoted: long, popular: long.map((e, i) => ({ rank: i + 1, name: e.family, provider: 'P' })) },
    docs: { status: 'ok', items: long.map((e) => ({ date: '2026-11-24', agent: 'Claude Code', type: 'added', title: e.family, url: 'https://d/x' })) },
    articles: { status: 'ok', items: long.map((e) => ({ src: 'S', title: e.family, url: 'https://a/x', date: '2026-11-24' })) },
    tools: { status: 'ok', baseline: false, total: 60, items: long.map((e, i) => ({ id: String(i), kind: 'tool', title: e.family, summary: '', url: 'https://t/x' })) },
  });
  for (const candidate of [busy, issue(), issue({ models: { ...busy.models, leaderChanged: true, leader: { family: '一个非常非常非常长的新榜首模型名字'.repeat(6), score: 70 } } })]) {
    const tweets = thread(candidate);
    assert.ok(tweets.length >= 2 && tweets.length <= 5);
    assert.ok(tweets[0].includes('https://ai.wenworks.dev/weekly/7/'));
    for (const tweet of tweets) assert.ok(weight(tweet) <= TWEET_LIMIT, `${weight(tweet)}: ${tweet}`);
  }
  assert.equal(weight('汉字ab'), 3);
  assert.equal(weight('看 https://example.com/a/very/long/path?x=1'), 1 + 0.5 + 11.5);
});
