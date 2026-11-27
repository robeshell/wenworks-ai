// The front page: the three parts of the site with what is current in each,
// then what is being talked about, then the newest official articles and the
// latest weekly issue. All of it is put together from data at build time.
import { TOOL_KIND, esc } from './render.mjs';

const safeUrl = (url) => (/^(https?:\/\/|\/)/.test(String(url)) ? String(url) : '#');
const link = (url, text, attrs = '') => `<a href="${esc(safeUrl(url))}"${attrs}>${esc(text)}</a>`;
const score = (n) => Number(n).toFixed(1);
const count = (n) => Number(n).toLocaleString('en-US');
/** "11月25日" from an ISO date or timestamp, read in Taipei time. */
export const day = (iso) => {
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00+08:00` : iso);
  if (Number.isNaN(date.getTime())) return '';
  const [, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(date).split('-');
  return `${Number(m)}月${Number(d)}日`;
};

/** What the tier board says now: the leader, the first tier, and when it last moved. */
export function modelsNow(snapshot, changes) {
  if (!snapshot?.entries?.length) return null;
  const ranked = [...snapshot.entries].sort((a, b) => b.score - a.score);
  const moves = changes ? (changes.newEntries?.length ?? 0) + (changes.promoted?.length ?? 0) + (changes.demoted?.length ?? 0) : 0;
  return { leader: ranked[0], tier1: ranked.filter((e) => e.tier === 'T1'), total: ranked.length, updatedAt: snapshot.updatedAt, moves };
}

/** The newest official articles, newest first. Undated ones go last. */
export function newestArticles(articles, limit = 4) {
  return [...(articles ?? [])].filter((a) => a?.title && a?.url).sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, limit);
}

/** Adds titleZh to articles from the translations hot.json carries, matched by url. */
export function withTranslations(articles, hot) {
  const zh = new Map((hot?.articles?.items ?? []).filter((a) => a.titleZh).map((a) => [a.url, a.titleZh]));
  return articles.map((a) => (zh.has(a.url) ? { ...a, titleZh: zh.get(a.url) } : a));
}

/** A link that shows the Chinese text when there is one, with the original on hover. */
const zhLink = (url, text, original) => (text && text !== original ? `<a href="${esc(safeUrl(url))}" title="${esc(original)}">${esc(text)}</a>` : link(url, original));

/** How many entries the tools catalog has, by kind, in the order the site shows them. */
export function catalogCounts(catalog) {
  const items = catalog?.items ?? [];
  if (!items.length) return null;
  return { total: items.length, kinds: Object.keys(TOOL_KIND).map((kind) => ({ kind, n: items.filter((i) => i.kind === kind).length })).filter((k) => k.n) };
}

/** The three parts as one slim row: a name and the one fact that is current. */
function doors({ models, docs, catalog }) {
  const pages = (docs ?? []).reduce((sum, d) => sum + d.pages, 0);
  const door = (href, name, fact) => `<a class="door" href="${href}"><b>${name}<span aria-hidden="true"> →</span></b><span>${fact}</span></a>`;
  return `<nav class="doors" aria-label="三个部分">
${door('/models/', '模型', models ? `榜首 ${esc(models.leader.family)} <span class="num">${score(models.leader.score)}</span>` : '梯队榜、选型、价格')}
${door('/agents/', 'Agent 导航', docs?.length ? `${docs.length} 家官方文档 · <span class="num">${pages}</span> 篇` : '官方文档的中文导航')}
${door('/tools/', '工具精选', catalog ? `挑过的 <span class="num">${catalog.total}</span> 条工具和资源` : '挑过的工具和资源')}
</nav>`;
}

const sec = (id, title, side, body) => `<section id="${id}"><div class="sec-head"><h2>${title}</h2>${side ? `<span class="count">${side}</span>` : ''}</div><div class="sec-body">\n${body}\n</div></section>`;

/** Hot topics: two short columns, one line per item. */
function hotHtml(hot, limit = 5) {
  const stories = (hot?.hn?.items ?? []).slice(0, limit);
  const repos = (hot?.github?.items ?? []).slice(0, limit);
  const col = (tag, what, rows) => `<div class="hot-col"><h3><b>${tag}</b><span>${what}</span></h3>\n<ol class="hot">${rows.join('')}</ol></div>`;
  const cols = [];
  if (stories.length) cols.push(col('Hacker News', '近三天的 AI 话题', stories.map((s) => `<li><span class="line">${zhLink(s.url, s.titleZh, s.title)}</span><span class="side num">${count(s.points)} 分</span></li>`)));
  if (repos.length) cols.push(col('GitHub', '近两周的新项目', repos.map((r) => `<li><span class="line">${link(r.url, r.name)}${r.description ? `<span class="desc" title="${esc(r.descriptionZh ? `${r.descriptionZh}\n${r.description}` : r.description)}">${esc(r.descriptionZh || r.description)}</span>` : ''}</span><span class="side num">★ ${count(r.stars)}</span></li>`)));
  return cols.length ? `<div class="cols">${cols.join('\n')}</div>` : '';
}

/** What changed lately, one sentence a line, newest first. */
export function recentLines({ models, articles = [], issue }) {
  const lines = [];
  if (models) lines.push({ date: models.updatedAt, tag: '模型', html: `梯队榜更新，榜首 ${link('/models/', models.leader.family)}${models.moves ? `，${models.moves} 项变动` : '，梯队没有变动'}` });
  for (const a of articles.slice(0, 1)) if (a.date) lines.push({ date: a.date, tag: '文章', html: `${esc(a.src)}：${zhLink(a.url, a.titleZh, a.title)}` });
  for (const t of (issue?.tools?.items ?? []).slice(0, 2)) lines.push({ date: issue.week.endDate, tag: '工具', html: `新收录 ${link(t.url, t.title)}${t.summary ? `，${esc(t.summary)}` : ''}` });
  const key = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T12:00:00+08:00` : d);
  return lines.sort((a, b) => new Date(key(b.date)) - new Date(key(a.date))).slice(0, 4);
}

function recentHtml(lines) {
  return lines.length ? `<ul class="recent" aria-label="最近更新">${lines.map((l) => `<li><span class="num">${esc(day(l.date))}</span><b>${l.tag}</b><span class="line">${l.html}</span></li>`).join('')}</ul>` : '';
}

function picksHtml(picks) {
  return `<ul class="rows">${picks.map((p) => `<li><span>${link(p.url, p.title || p.url)}${p.note ? `<br><span class="quiet">${esc(p.note)}</span>` : ''}</span><span class="side quiet">${esc(p.author || '')}${p.date ? ` · <span class="num">${esc(day(p.date))}</span>` : ''}</span></li>`).join('')}</ul>`;
}

/**
 * The body of the front page.
 *   models   modelsNow(...) or null        docs      [{ name, url, pages }]
 *   catalog  catalogCounts(...) or null    hot       data/hot.json or null
 *   picks    hand-picked links (X posts)   articles  newestArticles(...), for the recent lines
 *   recommended  pickMust(...): the hand-picked articles
 *   issue    the latest weekly issue or null
 */
export function frontHtml({ models, docs, catalog, hot, picks = [], articles = [], recommended = [], issue }) {
  const parts = [];
  const hotBody = hotHtml(hot);
  if (picks.length) parts.push(sec('picks', '值得看的讨论', `${picks.length} 条`, picksHtml(picks)));
  if (hotBody) parts.push(sec('hot', '热点', hot.updatedAt ? `${day(hot.updatedAt)}更新` : '', hotBody));
  if (recommended.length) parts.push(sec('recommended', '推荐文章', link('/agents/articles/', '全部 →'), `<ul class="rows picks">${recommended.map((a) => `<li><span>${zhLink(a.url, a.titleZh, a.title)}${a.why ? `<span class="why">${esc(a.why)}</span>` : ''}</span><span class="side quiet">${esc(a.src)}</span></li>`).join('')}</ul>`));
  return `<section class="hero front-hero">
<h1>选模型、学 Agent、找工具</h1>
</section>
${doors({ models, docs, catalog })}
${recentHtml(recentLines({ models, articles, issue }))}
<div class="issue front">
${parts.join('\n')}
</div>`;
}
