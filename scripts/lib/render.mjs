// Turns an issue (data/issues/NNNN.json) into HTML and into an X thread.
// Everything is assembled from the data; the only prose that is not comes from
// the optional editor's note in notes/<ISO week>.md.
import { TIER_LABEL } from './sections.mjs';

export const SITES = {
  home: 'https://ai.wenworks.dev',
  models: 'https://models.wenworks.dev/',
  agents: 'https://agents.wenworks.dev/',
  tools: 'https://tools.wenworks.dev/',
};

export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const safeUrl = (url) => (/^https?:\/\//.test(String(url)) ? String(url) : '#');
const link = (url, text) => `<a href="${esc(safeUrl(url))}">${esc(text)}</a>`;
const score = (n) => Number(n).toFixed(1);
const NO_CHANGE = '本周没有变化。';
const FAILED = '这一节的数据本周没有取到，下期补上。';
const KIND_LABEL = { added: '新增', removed: '移除', renamed: '改名', price: '价格' };
const TOOL_KIND = { tool: '工具', site: '站点', skill: '技能', project: '开源项目', prompt: '提示词' };

export function issueUrl(number) {
  return `${SITES.home}/weekly/${number}/`;
}

export function issueTitle(issue) {
  return `Wenworks AI 周报 · 第 ${issue.number} 期`;
}

/** A small, safe subset of Markdown for the editor's note: paragraphs, lists, links, bold, code. */
export function noteHtml(markdown) {
  const inline = (text) =>
    esc(text)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
  return String(markdown)
    .replace(/\r/g, '')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n');
      if (lines.every((line) => /^[-*]\s+/.test(line))) return `<ul>${lines.map((line) => `<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`).join('')}</ul>`;
      if (/^#{1,6}\s+/.test(block)) return `<h3>${inline(block.replace(/^#{1,6}\s+/, ''))}</h3>`;
      return `<p>${inline(lines.join(' '))}</p>`;
    })
    .join('\n');
}

function modelsHtml(m) {
  if (m.status !== 'ok') return `<p class="quiet">${FAILED}</p>`;
  const quiet = !m.leaderChanged && !m.newEntries.length && !m.promoted.length && !m.demoted.length;
  const leader = m.leaderChanged
    ? `<p><span class="mark">榜首更换</span>${esc(m.leader.family)}（<span class="num">${score(m.leader.score)}</span>）成为新的榜首，上一期是 ${esc(m.previousLeader.family)}。</p>`
    : `<p>榜首没有变化：${esc(m.leader.family)}（<span class="num">${score(m.leader.score)}</span>）。</p>`;
  const list = (title, items, row) => `<h3>${title}</h3>${items.length ? `<ul>${items.map((item) => `<li>${row(item)}</li>`).join('')}</ul>` : `<p class="quiet">${NO_CHANGE}</p>`}`;
  const move = (item) => `${esc(item.family)}：${TIER_LABEL[item.from] ?? item.from} → ${TIER_LABEL[item.to] ?? item.to}（<span class="num">${score(item.score)}</span>）`;
  return [
    leader,
    quiet ? `<p class="quiet">梯队${NO_CHANGE}</p>` : '',
    `<h3>第一梯队</h3><ul>${m.tier1.map((e) => `<li>${esc(e.family)} <span class="num">${score(e.score)}</span></li>`).join('')}</ul>`,
    quiet ? '' : list('新进前五档', m.newEntries, (e) => `${esc(e.family)}：${TIER_LABEL[e.tier] ?? e.tier}（<span class="num">${score(e.score)}</span>）`),
    quiet ? '' : list('升档', m.promoted, move),
    quiet ? '' : list('降档', m.demoted, move),
    m.popular.length ? `<h3>使用量前五（OpenRouter 近 7 天）</h3><ol>${m.popular.map((p) => `<li>${esc(p.name)} <span class="quiet">${esc(p.provider || '')}</span></li>`).join('')}</ol>` : '',
    `<p class="more">${link(SITES.models, '看完整梯队榜 →')}</p>`,
  ].join('\n');
}

function docsHtml(d) {
  if (d.status !== 'ok') return `<p class="quiet">${FAILED}</p>`;
  if (!d.items.length) return `<p class="quiet">${NO_CHANGE}</p>\n<p class="more">${link(`${SITES.agents}updates/`, '看文档更新记录 →')}</p>`;
  const groups = new Map();
  for (const item of d.items) groups.set(item.agent, [...(groups.get(item.agent) ?? []), item]);
  return [...groups].map(([agent, items]) => `<h3>${esc(agent)}</h3><ul>${items.map((i) => `<li><span class="quiet">${esc(KIND_LABEL[i.type] ?? i.type)}</span> ${link(i.url, i.title)}</li>`).join('')}</ul>`).join('\n') + `\n<p class="more">${link(`${SITES.agents}updates/`, '看文档更新记录 →')}</p>`;
}

function articlesHtml(a) {
  if (a.status !== 'ok') return `<p class="quiet">${FAILED}</p>`;
  if (!a.items.length) return `<p class="quiet">${NO_CHANGE}</p>`;
  return `<ul>${a.items.map((i) => `<li>${link(i.url, i.title)} <span class="quiet">${esc(i.src)}${i.date ? ` · <span class="num">${esc(i.date)}</span>` : ''}</span></li>`).join('')}</ul>\n<p class="more">${link(`${SITES.agents}articles/`, '看全部文章 →')}</p>`;
}

function toolsHtml(t) {
  if (t.baseline) return `<p class="quiet">从这一期开始记录，下期起列出新收录的条目。目前共收录 <span class="num">${t.total}</span> 条。</p>\n<p class="more">${link(SITES.tools, '看全部收录 →')}</p>`;
  if (!t.items.length) return `<p class="quiet">${NO_CHANGE}</p>\n<p class="more">${link(SITES.tools, '看全部收录 →')}</p>`;
  return `<ul>${t.items.map((i) => `<li><span class="mark">新</span>${link(i.url, i.title)} <span class="quiet">${esc(TOOL_KIND[i.kind] ?? i.kind)}</span>${i.summary ? `<br><span class="quiet">${esc(i.summary)}</span>` : ''}</li>`).join('')}</ul>\n<p class="more">${link(SITES.tools, '看全部收录 →')}</p>`;
}

/** The body of one issue. `note` is the editor's note in Markdown, or null. */
export function issueHtml(issue, note = null) {
  const parts = [];
  if (note) parts.push(`<section class="note"><h2>编辑手记</h2>\n${noteHtml(note)}</section>`);
  parts.push(`<section><h2>模型梯队</h2>\n${modelsHtml(issue.models)}</section>`);
  parts.push(`<section><h2>Agent 文档</h2>\n${docsHtml(issue.docs)}</section>`);
  parts.push(`<section><h2>官方文章</h2>\n${articlesHtml(issue.articles)}</section>`);
  // The tools list is the one section that is left out when its source cannot be read.
  if (issue.tools.status === 'ok') parts.push(`<section><h2>新收录工具</h2>\n${toolsHtml(issue.tools)}</section>`);
  return parts.join('\n');
}

/** One sentence for lists, the feed description and og:description. */
export function issueSummary(issue) {
  const bits = [];
  const m = issue.models;
  if (m.status === 'ok') {
    if (m.leaderChanged) bits.push(`榜首换成 ${m.leader.family}`);
    else bits.push(`榜首 ${m.leader.family}（${score(m.leader.score)}）`);
    const moves = m.newEntries.length + m.promoted.length + m.demoted.length;
    bits.push(moves ? `梯队变动 ${moves} 项` : '梯队没有变化');
  }
  if (issue.docs.status === 'ok') bits.push(issue.docs.items.length ? `文档变化 ${issue.docs.items.length} 条` : '文档没有变化');
  if (issue.articles.status === 'ok') bits.push(`官方文章 ${issue.articles.items.length} 篇`);
  if (issue.tools.status === 'ok' && !issue.tools.baseline) bits.push(`新收录 ${issue.tools.items.length} 条`);
  return bits.join('，') + '。';
}

// ---------------------------------------------------------------------------
// X thread

/** Length the way a 140-Chinese-character limit is felt: CJK counts 1, Latin 0.5, a link 11.5. */
export function weight(text) {
  let total = 0;
  for (const part of String(text).split(/(https?:\/\/\S+)/)) {
    if (/^https?:\/\//.test(part)) {
      total += 11.5;
      continue;
    }
    for (const ch of part) total += /[ᄀ-ￜ\u{20000}-\u{3ffff}]/u.test(ch) ? 1 : 0.5;
  }
  return total;
}

/** The limit for a whole tweet, numbering included. */
export const TWEET_LIMIT = 140;
/** What the text may use: the limit less room for the "3/5" line. */
const BUDGET = TWEET_LIMIT - 4;

/** Joins as many names as fit, then says how many were left out. */
function fitList(prefix, names, suffix, limit) {
  let shown = names.length;
  for (;;) {
    const rest = names.length - shown;
    const text = `${prefix}${names.slice(0, shown).join('、')}${rest > 0 ? ` 等 ${names.length} 项` : ''}${suffix}`;
    if (weight(text) <= limit || shown <= 1) return text;
    shown -= 1;
  }
}

function clip(text, limit = BUDGET) {
  if (weight(text) <= limit) return text;
  let out = '';
  for (const ch of text) {
    if (weight(out + ch + '…') > limit) break;
    out += ch;
  }
  return out + '…';
}

/** The lines of the thread, first the week's most important change. */
export function thread(issue) {
  const m = issue.models;
  const url = issueUrl(issue.number);
  const tail = `\nWenworks AI 周报第 ${issue.number} 期 → ${url}`;
  const room = BUDGET - weight(tail);
  const newTools = issue.tools.status === 'ok' && !issue.tools.baseline ? issue.tools.items : [];
  const articles = issue.articles.status === 'ok' ? issue.articles.items : [];

  let lead;
  if (m.status === 'ok' && m.leaderChanged) lead = `本周大模型榜首易主：${m.leader.family}（${score(m.leader.score)}）超过 ${m.previousLeader.family}。`;
  else if (m.status === 'ok' && m.newEntries.some((e) => e.tier === 'T1')) lead = fitList('本周新进第一梯队：', m.newEntries.filter((e) => e.tier === 'T1').map((e) => e.family), `。榜首仍是 ${m.leader.family}。`, room);
  else if (m.status === 'ok' && m.newEntries.length + m.promoted.length + m.demoted.length > 0) lead = `本周大模型梯队有 ${m.newEntries.length + m.promoted.length + m.demoted.length} 项变动，榜首仍是 ${m.leader.family}（${score(m.leader.score)}）。`;
  else if (newTools.length) lead = fitList(`本周工具精选新收录 ${newTools.length} 条：`, newTools.map((t) => t.title), '。', room);
  else if (articles.length) lead = `本周官方文章 ${articles.length} 篇，梯队和文档没有大的变化。`;
  else if (m.status === 'ok') lead = `本周大模型梯队没有变化，榜首仍是 ${m.leader.family}（${score(m.leader.score)}），第一梯队 ${m.tier1.length} 个模型。`;
  else lead = '这一周三个站的变化都整理好了。';

  const tweets = [clip(lead, room) + tail];

  if (m.status === 'ok') {
    const bits = [];
    if (m.newEntries.length) bits.push(`新进前五档 ${m.newEntries.map((e) => e.family).join('、')}`);
    if (m.promoted.length) bits.push(`升档 ${m.promoted.map((e) => e.family).join('、')}`);
    if (m.demoted.length) bits.push(`降档 ${m.demoted.map((e) => e.family).join('、')}`);
    if (!bits.length) bits.push('梯队没有变化');
    const popular = m.popular.length ? `。使用量前三：${m.popular.slice(0, 3).map((p) => p.name).join('、')}` : '';
    const link2 = `\n${SITES.models}`;
    tweets.push(clip(`模型：${bits.join('；')}${popular}。`, BUDGET - weight(link2)) + link2);
  }
  if (issue.docs.status === 'ok') {
    const link3 = `\n${SITES.agents}updates/`;
    const text = issue.docs.items.length
      ? fitList(`Agent 文档本周有 ${issue.docs.items.length} 条变化：`, issue.docs.items.map((i) => `${i.agent}〈${i.title}〉`), '。', BUDGET - weight(link3))
      : 'Agent 文档：本周没有变化。';
    tweets.push(clip(text, BUDGET - weight(link3)) + link3);
  }
  if (issue.articles.status === 'ok') {
    const link4 = `\n${SITES.agents}articles/`;
    const text = articles.length ? fitList(`官方文章 ${articles.length} 篇：`, articles.map((a) => `〈${a.title}〉`), '。', BUDGET - weight(link4)) : '官方文章：本周没有变化。';
    tweets.push(clip(text, BUDGET - weight(link4)) + link4);
  }
  if (issue.tools.status === 'ok') {
    const link5 = `\n${SITES.tools}`;
    const text = issue.tools.baseline
      ? `工具精选目前收录 ${issue.tools.total} 条，下期起每周列出新收录的。`
      : newTools.length
        ? fitList(`工具精选新收录 ${newTools.length} 条：`, newTools.map((t) => t.title), '。', BUDGET - weight(link5))
        : '工具精选：本周没有变化。';
    tweets.push(clip(text, BUDGET - weight(link5)) + link5);
  }
  return tweets.map((text, index) => `${index + 1}/${tweets.length}\n${text}`);
}
