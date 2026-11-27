// Build out/: the front page (the three parts of the site, what is being talked
// about, the newest articles), the weekly archive with one page per issue, the
// RSS feed and one X thread per issue. Plain static files, no framework.
//
// The front page reads the neighbouring parts' data straight from the repository
// and data/hot.json (refreshed by scripts/hot.mjs).
//
//   node scripts/build.mjs
//
// PRODUCTION=1 adds the page-view beacon; local and preview builds leave it out.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogCounts, frontHtml, modelsNow, newestArticles, withTranslations } from './lib/front.mjs';
import { pickMust, readMust } from './lib/must.mjs';
import { SITES, esc, issueFacts, issueHtml, issueSummary, issueTitle, issueUrl, thread } from './lib/render.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'out');
const PRODUCTION = process.env.PRODUCTION === '1';
const SITE_NAME = 'Wenworks AI';
const DESCRIPTION = 'Wenworks AI：大模型梯队榜和选型、编程 Agent 官方文档的中文导航、挑过的 AI 工具，加上每天更新的 AI 热点。';
// The other parts live next to this one; the tools catalog is a build product of the tools part.
const MODELS_DIR = path.resolve(ROOT, process.env.MODELS_DIR || '../models');
const AGENTS_DIR = path.resolve(ROOT, process.env.AGENTS_DIR || '../agents');
const TOOLS_CATALOG_FILE = path.resolve(ROOT, process.env.TOOLS_CATALOG_FILE || '../../dist/tools/catalog.json');
const AGENT_DOCS = [['claude', 'Claude Code', 'claude-code'], ['codex', 'Codex', 'codex'], ['antigravity', 'Antigravity CLI', 'antigravity-cli'], ['grok', 'Grok', 'grok']];
const SHARE_IMAGE = 'https://ai.wenworks.app/models/share/tiers-latest.png';
const BEACON = `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "4dff1f86a3894509bbdf147ef75e6487"}'></script>`;

const write = (file, content) => {
  const full = path.join(OUT, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
};

const readJson = (file, fallback = null) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
};

/** Everything the front page shows besides the issues. A source that cannot be read leaves its block out. */
function loadFront() {
  const historyDir = path.join(MODELS_DIR, 'data', 'history');
  const latestSnapshot = fs.existsSync(historyDir) ? fs.readdirSync(historyDir).filter((f) => /^tiers-.*\.json$/.test(f)).sort().at(-1) : null;
  const docs = AGENT_DOCS.map(([file, name, slug]) => {
    try {
      const pages = fs.readFileSync(path.join(AGENTS_DIR, 'data', `${file}.txt`), 'utf8').split('\n').filter((line) => line.includes('|') && !line.startsWith('#')).length;
      return { name, url: `/agents/${slug}/`, pages };
    } catch {
      return null;
    }
  }).filter(Boolean);
  const hot = readJson(path.join(ROOT, 'data', 'hot.json'));
  return {
    models: modelsNow(latestSnapshot ? readJson(path.join(historyDir, latestSnapshot)) : null, readJson(path.join(MODELS_DIR, 'data', 'tier-changes.json'))),
    docs,
    catalog: catalogCounts(readJson(TOOLS_CATALOG_FILE)),
    hot,
    picks: readJson(path.join(ROOT, 'data', 'picks.json'), []),
    articles: withTranslations(newestArticles(readJson(path.join(AGENTS_DIR, 'data', 'articles.json'), [])), hot),
    recommended: withTranslations(pickMust(readMust(readJson(path.join(AGENTS_DIR, 'data', 'editorial.json')))), hot),
  };
}

function loadIssues() {
  const dir = path.join(ROOT, 'data', 'issues');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d{4}\.json$/.test(f))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
    .sort((a, b) => b.number - a.number);
}

function loadNote(issue) {
  const file = path.join(ROOT, 'notes', `${issue.week.isoWeek}.md`);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

/** Every link in the page body opens in a new tab; the header keeps moving within the site. */
const newTabs = (html) => html.replace(/<a (?![^>]*\btarget=)/g, '<a target="_blank" rel="noopener" ');

function page({ title, description, pathName, body, ogType = 'website', active = '' }) {
  const nav = [['front', '/', '首页'], ['archive', '/weekly/', '每周动态'], ['feed', '/feed.xml', 'RSS']];
  const url = `${SITES.home}${pathName}`;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<link rel="alternate" type="application/rss+xml" title="${esc(SITE_NAME)} 动态" href="/feed.xml">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${esc(SITE_NAME)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${SHARE_IMAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="675">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SHARE_IMAGE}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<header class="site-header">
  <div class="site-header-inner">
    <a href="/" class="site-brand">Wenworks AI</a>
    <nav class="site-switch" aria-label="Wenworks AI 站点"><a href="/models/">模型</a><a href="/agents/">Agent 导航</a><a href="/tools/">工具精选</a></nav>
    <span class="site-sep" aria-hidden="true"></span>
    <nav id="site-nav" class="site-nav" aria-label="首页" data-open="false">${nav.map(([key, href, label]) => `<a href="${href}"${key === active ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
    <button type="button" class="site-menu-button" id="site-menu" aria-expanded="false" aria-controls="site-nav">菜单</button>
  </div>
</header>
<main class="site-content">
${newTabs(body)}
</main>
<footer class="site-foot"><p>本页由数据自动生成：三个部分的最新内容，加上 Hacker News 和 GitHub 的公开数据。只列标题和链接，不转载正文。</p></footer>
<script>{const n=document.getElementById('site-nav'),b=document.getElementById('site-menu'),set=o=>{n.dataset.open=o;b.setAttribute('aria-expanded',o)};b.addEventListener('click',()=>set(n.dataset.open!=='true'));document.addEventListener('keydown',e=>{if(e.key==='Escape')set(false)})}</script>
${PRODUCTION ? BEACON : ''}
</body>
</html>
`;
}

/** Masthead of an issue: number, dates and a one-line summary. */
function hero(issue) {
  const title = `本周动态 <em>${esc(issue.week.label.replace(/^\d+ 年 /, ''))}</em>`;
  return `<section class="hero">
<p class="eyebrow num"><b>WENWORKS AI</b><span>每周一更新</span><span>第 ${issue.number} 期</span></p>
<h1>${title}</h1>
<p class="lede">${esc(issueSummary(issue))}</p>
</section>`;
}

function pager(issue, latest) {
  return `<p class="pager">${issue.number > 1 ? `<a href="/weekly/${issue.number - 1}/">← 上一期</a>` : ''}<a href="/weekly/">往期列表</a>${issue.number < (latest?.number ?? 0) ? `<a href="/weekly/${issue.number + 1}/">下一期 →</a>` : ''}<a href="/feed.xml">RSS 订阅</a></p>`;
}

function issueArticle(issue) {
  return `<article class="issue">
${issueHtml(issue, loadNote(issue))}
</article>`;
}

const rfc822 = (iso) => new Date(iso).toUTCString();
const cdata = (html) => `<![CDATA[${html.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`;

function feed(issues) {
  const items = issues
    .map((issue) => {
      // Feed readers resolve links against the item link; make the few relative ones absolute.
      const html = issueHtml(issue, loadNote(issue)).replaceAll('href="/', `href="${SITES.home}/`);
      return `<item>
<title>${esc(issueTitle(issue))}（${esc(issue.week.label)}）</title>
<link>${issueUrl(issue.number)}</link>
<guid isPermaLink="true">${issueUrl(issue.number)}</guid>
<pubDate>${rfc822(issue.publishedAt || issue.generatedAt)}</pubDate>
<description>${esc(issueSummary(issue))}</description>
<content:encoded>${cdata(html)}</content:encoded>
</item>`;
    })
    .join('\n');
  const built = issues[0] ? rfc822(issues[0].publishedAt || issues[0].generatedAt) : rfc822(new Date().toISOString());
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
<title>${SITE_NAME} 动态</title>
<link>${SITES.home}/</link>
<atom:link href="${SITES.home}/feed.xml" rel="self" type="application/rss+xml"/>
<description>${esc(DESCRIPTION)}</description>
<language>zh-CN</language>
<lastBuildDate>${built}</lastBuildDate>
${items}
</channel>
</rss>
`;
}

function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  const issues = loadIssues();
  const latest = issues[0] ?? null;

  write('styles.css', fs.readFileSync(path.join(ROOT, 'src', 'styles.css'), 'utf8'));
  write('icon.svg', fs.readFileSync(path.join(ROOT, 'src', 'icon.svg'), 'utf8'));
  write('.nojekyll', '');

  write('index.html', page({
    title: `${SITE_NAME} · 选模型、学 Agent、找工具`,
    description: DESCRIPTION,
    pathName: '/',
    active: 'front',
    body: frontHtml({ ...loadFront(), issue: latest }),
  }));

  write('weekly/index.html', page({
    title: `${SITE_NAME} · 往期动态`,
    description: DESCRIPTION,
    pathName: '/weekly/',
    active: 'archive',
    body: `<section class="hero"><p class="eyebrow num"><b>WEEKLY</b><span>每周一更新</span></p><h1>往期动态</h1><p class="lede">共 ${issues.length} 期 · <a href="/feed.xml">RSS 订阅</a></p></section>
${issues.length ? `<ol class="archive">${issues.map((issue) => `<li><a href="/weekly/${issue.number}/"><b class="num n">第 ${issue.number} 期</b><b>${esc(issue.week.label)}</b><span>${esc(issueSummary(issue))}</span></a></li>`).join('')}</ol>` : '<p class="quiet">还没有发布过。</p>'}`,
  }));

  for (const issue of issues) {
    write(`weekly/${issue.number}/index.html`, page({
      title: `${SITE_NAME} · 动态第 ${issue.number} 期`,
      description: `${issue.week.label}：${issueSummary(issue)}`,
      pathName: `/weekly/${issue.number}/`,
      ogType: 'article',
      body: `${hero(issue)}\n${issueFacts(issue)}\n${issueArticle(issue)}\n${pager(issue, latest)}`,
    }));
    write(`x/${issue.number}.txt`, thread(issue).join('\n\n') + '\n');
  }

  write('feed.xml', feed(issues));
  write('404.html', page({ title: `${SITE_NAME} · 没有这个页面`, description: DESCRIPTION, pathName: '/404.html', body: '<section class="hero"><p class="eyebrow num"><b>404</b></p><h1>没有这个页面</h1><p class="lede"><a href="/">回到首页</a> · <a href="/weekly/">往期</a></p></section>' }));
  // This section owns the root of the site, so it also writes robots.txt for the whole of it.
  write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /tools/curator/\nSitemap: ${SITES.home}/sitemap.xml\nSitemap: ${SITES.agents}sitemap.xml\nSitemap: ${SITES.tools}sitemap.xml\n`);
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['/', '/weekly/', ...issues.map((i) => `/weekly/${i.number}/`), '/models/', '/models/pick/', '/models/models/', '/models/rankings/', '/models/popularity/'].map((p) => `<url><loc>${SITES.home}${p}</loc></url>`).join('\n')}\n</urlset>\n`);

  console.log(`built ${issues.length} issue(s)${latest ? `, latest is #${latest.number}` : ''}; beacon ${PRODUCTION ? 'on' : 'off'}`);
}

main();
