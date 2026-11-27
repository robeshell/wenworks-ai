// The front page: the three parts of the site with what is current in each,
// then what is being talked about, then the newest official articles and the
// latest weekly issue. All of it is put together from data at build time.
import { TOOL_KIND, esc, issueSummary } from './render.mjs';

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
export function newestArticles(articles, limit = 6) {
  return [...(articles ?? [])].filter((a) => a?.title && a?.url).sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, limit);
}

/** How many entries the tools catalog has, by kind, in the order the site shows them. */
export function catalogCounts(catalog) {
  const items = catalog?.items ?? [];
  if (!items.length) return null;
  return { total: items.length, kinds: Object.keys(TOOL_KIND).map((kind) => ({ kind, n: items.filter((i) => i.kind === kind).length })).filter((k) => k.n) };
}

function doors({ models, docs, catalog }) {
  const door = (href, name, what, body, links) => `<section class="door">
<h2><a href="${href}">${name}<span aria-hidden="true"> →</span></a></h2>
<p class="door-what">${what}</p>
${body}
<p class="door-links">${links.map(([url, text]) => link(url, text)).join('')}</p>
</section>`;
  return `<div class="doors">
${door('/models/', '模型', '按综合评测分档的大模型梯队榜，加上选型、价格和各项评测。',
    models
      ? `<dl class="door-fact"><dt>现在的榜首</dt><dd>${esc(models.leader.family)} <span class="num quiet">${score(models.leader.score)}</span></dd></dl>
<ul class="chips">${models.tier1.filter((e) => e !== models.leader).slice(0, 4).map((e) => `<li><span>${esc(e.family)}</span> <span class="num">${score(e.score)}</span></li>`).join('')}</ul>`
      : '',
    [['/models/', '梯队榜'], ['/models/pick/', '帮我选一个'], ['/models/models/', '价格']])}
${door('/agents/', 'Agent 导航', '四家编程 Agent 官方文档的中文导航：学习路线、上手清单、功能对照。',
    docs?.length ? `<ul class="door-list">${docs.map((d) => `<li>${link(d.url, d.name)}<span class="num quiet">${d.pages} 篇</span></li>`).join('')}</ul>` : '',
    [['/agents/compare/', '功能对照'], ['/agents/articles/', '官方文章'], ['/agents/updates/', '文档更新']])}
${door('/tools/', '工具精选', '挑过的 AI 工具、站点、技能、开源项目和提示词，每条一句话说清为什么收。',
    catalog ? `<ul class="door-list">${catalog.kinds.map((k) => `<li>${link(`/tools/?kind=${k.kind}`, TOOL_KIND[k.kind])}<span class="num quiet">${k.n} 条</span></li>`).join('')}</ul>` : '',
    [['/tools/', '全部收录'], ['/tools/en/', 'English']])}
</div>`;
}

const sec = (id, title, side, body) => `<section id="${id}"><div class="sec-head"><h2>${title}</h2>${side ? `<span class="count">${side}</span>` : ''}</div><div class="sec-body">\n${body}\n</div></section>`;

function hotHtml(hot) {
  const stories = hot?.hn?.items ?? [];
  const repos = hot?.github?.items ?? [];
  const cols = [];
  if (stories.length) cols.push(`<div><h3>Hacker News 上的 AI 话题<span class="quiet"> · 近三天</span></h3>
<ol class="rows hot">${stories.map((s) => `<li><span>${link(s.url, s.title, ' rel="noopener"')}</span><span class="side quiet"><span class="num">${count(s.points)}</span> 分 · ${link(s.discussion, `${count(s.comments)} 条讨论`, ' rel="noopener"')}</span></li>`).join('')}</ol></div>`);
  if (repos.length) cols.push(`<div><h3>GitHub 上的新项目<span class="quiet"> · 近两周创建</span></h3>
<ol class="rows hot">${repos.map((r) => `<li><span>${link(r.url, r.name, ' rel="noopener"')}${r.description ? `<br><span class="quiet">${esc(r.description)}</span>` : ''}</span><span class="side quiet"><span class="num">★ ${count(r.stars)}</span></span></li>`).join('')}</ol></div>`);
  return cols.length ? `<div class="cols">${cols.join('\n')}</div>` : '';
}

function picksHtml(picks) {
  return `<ul class="rows">${picks.map((p) => `<li><span>${link(p.url, p.title || p.url, ' rel="noopener"')}${p.note ? `<br><span class="quiet">${esc(p.note)}</span>` : ''}</span><span class="side quiet">${esc(p.author || '')}${p.date ? ` · <span class="num">${esc(day(p.date))}</span>` : ''}</span></li>`).join('')}</ul>`;
}

/**
 * The body of the front page.
 *   models   modelsNow(...) or null        docs      [{ name, url, pages }]
 *   catalog  catalogCounts(...) or null    hot       data/hot.json or null
 *   picks    hand-picked links (X posts)   articles  newestArticles(...)
 *   issue    the latest weekly issue or null
 */
export function frontHtml({ models, docs, catalog, hot, picks = [], articles = [], issue }) {
  const parts = [];
  const hotBody = hotHtml(hot);
  if (picks.length) parts.push(sec('picks', '值得看的讨论', `${picks.length} 条`, picksHtml(picks)));
  if (hotBody) parts.push(sec('hot', '热点', hot.updatedAt ? `${day(hot.updatedAt)}更新` : '', hotBody));
  if (articles.length) parts.push(sec('articles', '官方文章', '最新发布', `<ul class="rows">${articles.map((a) => `<li><span>${link(a.url, a.title, ' rel="noopener"')}</span><span class="side quiet">${esc(a.src)}${a.date ? ` · <span class="num">${esc(day(a.date))}</span>` : ''}</span></li>`).join('')}</ul>
<p class="more">${link('/agents/articles/', '看全部文章 →')}</p>`));
  if (models) parts.push(sec('tiers', '模型梯队', `${day(models.updatedAt)}更新`, `<p>${models.moves ? `最近一次更新有 <span class="num">${models.moves}</span> 项变动。` : '最近一次更新没有变动。'}前五档共 <span class="num">${models.total}</span> 个模型，第一梯队 <span class="num">${models.tier1.length}</span> 个。</p>
<p class="more">${link('/models/', '看完整梯队榜 →')}</p>`));
  if (issue) parts.push(sec('weekly', '每周动态', `第 ${issue.number} 期`, `<p>${link(`/weekly/${issue.number}/`, issue.week.label)}：${esc(issueSummary(issue))}</p>
<p class="more">${link('/weekly/', '往期 →')}${link('/feed.xml', 'RSS 订阅')}</p>`));
  return `<section class="hero">
<h1>选模型、学 Agent、找工具</h1>
<p class="lede">大模型梯队榜和选型，编程 Agent 官方文档的中文导航，挑过的 AI 工具。下面是三个入口，和现在大家在聊的事。</p>
</section>
${doors({ models, docs, catalog })}
<div class="issue front">
${parts.join('\n')}
</div>`;
}
