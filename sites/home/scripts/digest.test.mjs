import { test } from 'node:test';
import assert from 'node:assert/strict';
import { articlesSection, modelsSection, toolsSection } from './lib/sections.mjs';
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
  articles: { status: 'ok', items: [] },
  tools: { status: 'ok', baseline: false, total: 36, items: [] },
  ...over,
});

test('a quiet section says so instead of disappearing', () => {
  const html = issueHtml(issue());
  for (const heading of ['模型梯队', '官方文章', '新收录工具']) assert.ok(html.includes(`<h2>${heading}</h2>`), heading);
  assert.equal(html.split('本周没有变化').length - 1, 3);
});

test('one failed source leaves the other sections in place', () => {
  const html = issueHtml(issue({ models: { status: 'failed', error: 'x' }, tools: { status: 'failed', error: '404' } }));
  assert.ok(html.includes('<h2>模型梯队</h2>'));
  assert.ok(html.includes('这一节的数据本周没有取到'));
  assert.ok(html.includes('<h2>官方文章</h2>'));
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
  const html = issueHtml(issue(), '这周**值得看**的是 [梯队榜](https://ai.wenworks.app/models/)。\n\n- 一\n- 二 <b>x</b>');
  assert.ok(html.indexOf('编辑手记') < html.indexOf('模型梯队'));
  assert.ok(html.includes('<strong>值得看</strong>'));
  assert.ok(html.includes('<a href="https://ai.wenworks.app/models/">梯队榜</a>'));
  assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt;'));
  assert.equal(noteHtml('a\n\nb').split('<p>').length - 1, 2);
});

test('every line of the thread fits 140 Chinese characters', () => {
  const long = Array.from({ length: 30 }, (_, i) => ({ family: `特别长的模型名字 Model ${i}`, tier: 'T1', score: 60, from: 'T2', to: 'T1' }));
  const busy = issue({
    models: { status: 'ok', leader: { family: 'A', score: 64.8 }, leaderChanged: false, previousLeader: { family: 'A', score: 64.8 }, tier1: long, newEntries: long, promoted: long, demoted: long, popular: long.map((e, i) => ({ rank: i + 1, name: e.family, provider: 'P' })) },
    articles: { status: 'ok', items: long.map((e) => ({ src: 'S', title: e.family, url: 'https://a/x', date: '2026-11-24' })) },
    tools: { status: 'ok', baseline: false, total: 60, items: long.map((e, i) => ({ id: String(i), kind: 'tool', title: e.family, summary: '', url: 'https://t/x' })) },
  });
  for (const candidate of [busy, issue(), issue({ models: { ...busy.models, leaderChanged: true, leader: { family: '一个非常非常非常长的新榜首模型名字'.repeat(6), score: 70 } } })]) {
    const tweets = thread(candidate);
    assert.ok(tweets.length >= 2 && tweets.length <= 4);
    assert.ok(tweets[0].includes('https://ai.wenworks.app/weekly/7/'));
    for (const tweet of tweets) assert.ok(weight(tweet) <= TWEET_LIMIT, `${weight(tweet)}: ${tweet}`);
  }
  assert.equal(weight('汉字ab'), 3);
  assert.equal(weight('看 https://example.com/a/very/long/path?x=1'), 1 + 0.5 + 11.5);
});

// ---- front page ----
import { catalogCounts, day, frontHtml, modelsNow, newestArticles } from './lib/front.mjs';
import { aboutAi, pickRepos, pickStories } from './hot.mjs';

test('hot: only AI stories are kept, most points first, with a discussion link', () => {
  assert.ok(aboutAi('OpenAI cuts GPT usage'));
  assert.ok(aboutAi('Why AI agents fail'));
  assert.ok(!aboutAi('Maintaining a rail network'));
  assert.ok(!aboutAi('A new business model for trains'));
  const picked = pickStories([
    { objectID: '1', title: 'Rust 2.0 released', points: 900 },
    { objectID: '2', title: 'Claude writes a compiler', points: 100, url: 'https://example.com/a', num_comments: 5, created_at: '2026-11-26T01:00:00Z' },
    { objectID: '3', title: 'Ask HN: which LLM do you use?', points: 300 },
    { objectID: '3', title: 'Ask HN: which LLM do you use?', points: 300 },
  ]);
  assert.deepEqual(picked.map((s) => s.title), ['Ask HN: which LLM do you use?', 'Claude writes a compiler']);
  assert.equal(picked[0].url, 'https://news.ycombinator.com/item?id=3');
  assert.equal(picked[1].discussion, 'https://news.ycombinator.com/item?id=2');
});

test('hot: repositories are deduplicated, forks dropped, long descriptions clipped', () => {
  const repos = pickRepos([
    { full_name: 'a/one', html_url: 'https://github.com/a/one', stargazers_count: 10, description: 'x'.repeat(300) },
    { full_name: 'a/one', html_url: 'https://github.com/a/one', stargazers_count: 10 },
    { full_name: 'b/two', html_url: 'https://github.com/b/two', stargazers_count: 50, description: null },
    { full_name: 'c/fork', html_url: 'https://github.com/c/fork', stargazers_count: 99, fork: true },
  ]);
  assert.deepEqual(repos.map((r) => r.name), ['b/two', 'a/one']);
  assert.equal(repos[1].description.length, 110);
  assert.equal(repos[0].description, '');
});

test('front: reads the board, the newest articles and the catalog', () => {
  const now = modelsNow({ updatedAt: '2026-11-24T22:12:35Z', entries: [{ family: 'B', score: 60, tier: 'T1' }, { family: 'A', score: 64.8, tier: 'T1' }, { family: 'C', score: 40, tier: 'T3' }] }, { newEntries: [1], promoted: [], demoted: [1] });
  assert.equal(now.leader.family, 'A');
  assert.equal(now.tier1.length, 2);
  assert.equal(now.moves, 2);
  assert.equal(modelsNow(null, null), null);
  assert.deepEqual(newestArticles([{ title: 'old', url: 'https://x/1', date: '2026-01-01' }, { title: 'none', url: 'https://x/2' }, { title: 'new', url: 'https://x/3', date: '2026-11-01' }]).map((a) => a.title), ['new', 'old', 'none']);
  assert.deepEqual(catalogCounts({ items: [{ kind: 'site' }, { kind: 'tool' }, { kind: 'site' }] }), { total: 3, kinds: [{ kind: 'tool', n: 1 }, { kind: 'site', n: 2 }] });
  assert.equal(catalogCounts(null), null);
  assert.equal(day('2026-11-25'), '11月25日');
  assert.equal(day('2026-11-24T22:12:35Z'), '11月25日');
});

test('front: a missing source leaves its block out and titles are escaped', () => {
  const bare = frontHtml({ models: null, docs: [], catalog: null, hot: null, issue: null });
  assert.ok(bare.includes('href="/models/"') && bare.includes('href="/agents/"') && bare.includes('href="/tools/"'));
  assert.ok(!bare.includes('id="hot"') && !bare.includes('id="weekly"'));
  const full = frontHtml({ models: null, docs: [], catalog: null, issue: null, hot: { updatedAt: '2026-11-27T00:00:00Z', hn: { items: [{ title: '<b>AI</b>', url: 'javascript:alert(1)', discussion: 'https://news.ycombinator.com/item?id=1', points: 1200, comments: 3 }] }, github: { items: [] } } });
  assert.ok(full.includes('&lt;b&gt;AI&lt;/b&gt;') && !full.includes('javascript:'));
  assert.ok(full.includes('1,200'));
});
