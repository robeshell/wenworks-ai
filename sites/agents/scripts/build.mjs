// Build docs/ (served as the site root): the app page, one prerendered page per section
// so search engines and no-script readers get real content, plus feed, sitemap and data files.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
// Agent 导航是 https://ai.wenworks.app 这一个站里的 /agents/ 部分；docs/ 是它的构建产物，不提交。
const SITE = 'https://ai.wenworks.app/agents', NAME = 'Wenworks AI · Agent 导航';
const root = new URL('../', import.meta.url);
const read = f => fs.readFileSync(new URL(f, root), 'utf8');
const write = (f, s) => { const u = new URL(f, root); fs.mkdirSync(new URL('./', u), { recursive: true }); fs.writeFileSync(u, s); };
const xml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const json = f => { try { return JSON.parse(read(f)); } catch { return null; } };

let html = read('src/template.html');
// Page views: the same token as the rest of the site, only in the published build.
if (process.env.PRODUCTION === '1') html = html.replace('</body>', `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "4dff1f86a3894509bbdf147ef75e6487"}'></script>\n</body>`);
for (const id of ['claude', 'codex', 'antigravity', 'grok']) {
  const tag = '@@' + id.toUpperCase() + '@@';
  if (!html.includes(tag)) throw new Error('template is missing ' + tag);
  html = html.replace(tag, () => read(`data/${id}.txt`).trim());
}
html = html.replace('@@NOTES@@', () => JSON.stringify(json('data/notes.json') || {}).replace(/</g, '\\u003c'));
// Editorial content (learning paths, picked articles, checklists, comparison and price tables).
const editorial = json('data/editorial.json');
if (!editorial || !html.includes('@@EDITORIAL@@')) throw new Error('data/editorial.json or the @@EDITORIAL@@ tag is missing');
html = html.replace('@@EDITORIAL@@', () => JSON.stringify(editorial).replace(/</g, '\\u003c'));
write('docs/index.html', html);

const updates = json('data/updates.json') || [];
write('docs/updates.json', JSON.stringify(updates.slice(0, 200)));
const articles = json('data/articles.json') || [];
write('docs/articles.json', JSON.stringify(articles.slice(0, 120).map(({ src, title, url, date }) => ({ src, title, url, date }))));

// ---- prerender each section with headless Chrome (falls back to the bare app page) ----
const PAGES = [
  { path: '/', q: 'v=home', title: NAME, desc: 'Claude Code、Codex、Antigravity CLI、Grok 的官方文档导航：学习路线、快速上手、功能对照。非官方整理。' },
  { path: '/claude-code/', q: 'v=docs&a=claude', title: `Wenworks AI · Claude Code 文档导航与学习路线`, desc: 'Claude Code 官方中文文档的导航：五个阶段的学习路线、30 分钟上手清单和完整目录。' },
  { path: '/codex/', q: 'v=docs&a=codex', title: `Wenworks AI · Codex 文档导航与学习路线`, desc: 'OpenAI Codex 官方文档的中文导航：学习路线、每页一句话说明、上手清单和完整目录。' },
  { path: '/antigravity-cli/', q: 'v=docs&a=antigravity', title: `Wenworks AI · Antigravity CLI 文档导航与学习路线`, desc: 'Google Antigravity CLI（接替 Gemini CLI）官方文档的中文导航：学习路线、上手清单和完整目录。' },
  { path: '/grok/', q: 'v=docs&a=grok', title: `Wenworks AI · Grok 文档导航与学习路线`, desc: 'xAI Grok Build 和 Grok Bot 官方文档的中文导航：学习路线、上手清单和完整目录。' },
  { path: '/articles/', q: 'v=articles', title: `Wenworks AI · 值得读的官方文章`, desc: 'Anthropic、OpenAI、Google 官方博客里关于编程 agent 的文章：推荐先读的和最新发布的。' },
  { path: '/compare/', q: 'v=compare', title: `Wenworks AI · 几家编程 agent 的对比`, desc: 'Claude Code、Codex、Antigravity CLI、Grok 的基本情况、价格，以及同一类功能在各家文档里的位置。' },
  { path: '/updates/', q: 'v=updates', title: `Wenworks AI · 文档更新`, desc: '各家编程 agent 的官方更新日志，以及文档目录每天的变化。' },
  { path: '/about/', q: 'v=about', title: `Wenworks AI · 关于本站`, desc: '这个非官方导航站的说明、数据来源和源码。' },
];
const appFile = fileURLToPath(new URL('docs/index.html', root));
const dump = q => execFileSync(process.env.CHROME || 'google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--virtual-time-budget=4000', '--dump-dom', `file://${appFile}?${q}`], { encoding: 'utf8', timeout: 90000, maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] });
const grab = (dom, re) => (dom.match(re) || [])[1] || '';
let rendered = 0;
const pages = PAGES.map(p => {
  let page = html
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${xml(p.title)}</title>\n<link rel="canonical" href="${SITE}${p.path}">`)
    .replace(/(<meta name="description" content=")[^"]*(")/, (_, a, b) => a + xml(p.desc) + b);
  try {
    const modes = p.q.includes('v=docs') ? ['path', 'all'] : [''];
    const doms = modes.map(m => dump(p.q + (m ? '&m=' + m : '')));
    const out = doms.map(d => grab(d, /<main id="out"[^>]*>([\s\S]*?)<\/main>/)).join('\n');
    const h1 = grab(doms[0], /<h1 id="h1">([\s\S]*?)<\/h1>/), lede = grab(doms[0], /<p class="lede" id="lede"[^>]*>([\s\S]*?)<\/p>/);
    if (!out || !h1) throw new Error('empty render');
    page = page.replace('<main id="out" style="margin-top:18px"></main>', () => `<main id="out" style="margin-top:18px">${out}</main>`)
      .replace('<h1 id="h1"></h1>', () => `<h1 id="h1">${h1}</h1>`).replace('<p class="lede" id="lede"></p>', () => `<p class="lede" id="lede">${lede}</p>`);
    rendered++;
  } catch (e) { console.warn(`prerender skipped for ${p.path}: ${e.message.split('\n')[0]}`); }
  return { ...p, page };
});
for (const p of pages) write('docs' + p.path + 'index.html', p.page);

const KIND = { added: '新增', removed: '移除', renamed: '改名', price: '价格' };
const items = updates.slice(0, 60).map(u => `<item><title>${xml(`[${u.agent}] ${KIND[u.type] || ''}：${u.title}`)}</title><link>${xml(/^https?:/.test(u.url) ? u.url : SITE)}</link><guid isPermaLink="false">${xml(u.date + '|' + u.type + '|' + u.url)}</guid><pubDate>${new Date(u.date + 'T00:00:00Z').toUTCString()}</pubDate></item>`).join('\n');
write('docs/feed.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>${NAME} · 文档变化</title>
<link>${SITE}/updates/</link>
<description>Claude Code、Codex、Antigravity CLI、Grok 官方文档目录的每日变化（非官方整理）</description>
<language>zh-CN</language>
${items}
</channel></rss>
`);
write('docs/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PAGES.map(p => `<url><loc>${SITE}${p.path}</loc></url>`).join('\n')}\n</urlset>\n`);
write('docs/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`built ${PAGES.length} pages (${rendered} prerendered), ${updates.length} update entries, ${articles.length} articles`);
