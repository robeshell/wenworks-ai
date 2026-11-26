// Build out/ from data/issues/*.json: the home page, the archive, one page per
// issue, the RSS feed and one X thread per issue. Plain static files, no framework.
//
//   node scripts/build.mjs
//
// PRODUCTION=1 adds the page-view beacon; local and preview builds leave it out.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITES, esc, issueHtml, issueSummary, issueTitle, issueUrl, thread } from './lib/render.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'out');
const PRODUCTION = process.env.PRODUCTION === '1';
const SITE_NAME = 'Wenworks AI';
const DESCRIPTION = 'Wenworks AI 每周简报：大模型梯队、Agent 官方文档和 AI 工具精选这一周的变化，每周一更新。';
const SHARE_IMAGE = 'https://models.wenworks.dev/share/tiers-latest.png';
const BEACON = `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "39176fa04b684b35ad02b6c672a79986"}'></script>`;

const write = (file, content) => {
  const full = path.join(OUT, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
};

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

async function tryFetch(url, as = 'json') {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(String(response.status));
    return as === 'json' ? await response.json() : await response.text();
  } catch (error) {
    console.log(`::warning title=live number skipped::${url}: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

/** The three numbers on the entry cards. Each falls back to the latest issue, then to nothing. */
async function liveStats(latest) {
  const RAW = 'https://raw.githubusercontent.com/robeshell';
  const [changes, catalog, ...indexes] = await Promise.all([
    tryFetch(`${RAW}/wenworks-ai-models/main/data/tier-changes.json`),
    tryFetch('https://tools.wenworks.dev/catalog.json'),
    ...['claude', 'codex', 'antigravity', 'grok'].map((name) => tryFetch(`${RAW}/wenworks-ai-agents/main/data/${name}.txt`, 'text')),
  ]);
  const leader = changes?.leader ?? (latest?.models.status === 'ok' ? latest.models.leader : null);
  const docs = indexes.every((text) => typeof text === 'string') ? indexes.reduce((sum, text) => sum + text.split('\n').filter((line) => line.includes('|') && !line.startsWith('#')).length, 0) : null;
  const tools = Array.isArray(catalog?.items) ? catalog.items.length : latest?.tools.status === 'ok' ? latest.tools.total : null;
  return { leader, docs, tools };
}

function page({ title, description, pathName, body, ogType = 'website' }) {
  const url = `${SITES.home}${pathName}`;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<link rel="alternate" type="application/rss+xml" title="${esc(SITE_NAME)} 周报" href="/feed.xml">
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
    <a href="${SITES.home}/" class="site-brand">Wenworks AI</a>
    <nav class="site-switch" aria-label="Wenworks AI 站点"><a href="${SITES.models}">模型</a><a href="${SITES.agents}">Agent 导航</a><a href="${SITES.tools}">工具精选</a></nav>
  </div>
</header>
<main class="site-content">
${body}
</main>
<footer class="site-foot"><p><a href="/weekly/">往期周报</a> · <a href="/feed.xml">RSS</a> · 周报由三个站的公开数据自动生成，每周一更新；只列标题和链接，不转载正文。</p></footer>
${PRODUCTION ? BEACON : ''}
</body>
</html>
`;
}

function issueBlock(issue, { heading = 'h1', linkTitle = false } = {}) {
  const title = linkTitle ? `<a href="/weekly/${issue.number}/">${esc(issueTitle(issue))}</a>` : esc(issueTitle(issue));
  return `<div class="page-head"><${heading}>${title}</${heading}><p>${esc(issue.week.label)}</p></div>
<article class="issue">
${issueHtml(issue, loadNote(issue))}
</article>`;
}

function siteCards(stats) {
  const card = (href, name, text, stat) => `<a class="site-card" href="${href}"><b>${name}</b><span>${text}</span>${stat ? `<span class="stat">${stat}</span>` : ''}</a>`;
  return `<section class="sites">
<h2>三个站</h2>
${card(SITES.models, '模型', '大模型梯队榜、选型、价格', stats.leader ? `当前榜首 ${esc(stats.leader.family)} <span class="num">${Number(stats.leader.score).toFixed(1)}</span>` : '')}
${card(SITES.agents, 'Agent 导航', 'Claude Code、Codex 等官方文档的导航', stats.docs ? `收录文档 <span class="num">${stats.docs}</span> 篇` : '')}
${card(SITES.tools, '工具精选', 'AI 工具和资源精选', stats.tools ? `收录 <span class="num">${stats.tools}</span> 条` : '')}
</section>`;
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
<title>${SITE_NAME} 周报</title>
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

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  const issues = loadIssues();
  const latest = issues[0] ?? null;
  const stats = await liveStats(latest);

  write('styles.css', fs.readFileSync(path.join(ROOT, 'src', 'styles.css'), 'utf8'));
  write('icon.svg', fs.readFileSync(path.join(ROOT, 'src', 'icon.svg'), 'utf8'));
  write('.nojekyll', '');

  write('index.html', page({
    title: latest ? `${SITE_NAME} · 周报第 ${latest.number} 期` : SITE_NAME,
    description: latest ? `${latest.week.label}：${issueSummary(latest)}` : DESCRIPTION,
    pathName: '/',
    body: `${latest ? issueBlock(latest, { linkTitle: true }) : '<div class="page-head"><h1>Wenworks AI 周报</h1><p>第 1 期还没有发布。</p></div>'}\n${siteCards(stats)}`,
  }));

  write('weekly/index.html', page({
    title: `${SITE_NAME} · 往期周报`,
    description: DESCRIPTION,
    pathName: '/weekly/',
    body: `<div class="page-head"><h1>往期周报</h1><p>每周一更新 · <a href="/feed.xml">RSS</a></p></div>
${issues.length ? `<ol class="archive">${issues.map((issue) => `<li><a href="/weekly/${issue.number}/"><b class="num n">第 ${issue.number} 期</b><b>${esc(issue.week.label)}</b><span>${esc(issueSummary(issue))}</span></a></li>`).join('')}</ol>` : '<p class="quiet">还没有发布过。</p>'}`,
  }));

  for (const issue of issues) {
    write(`weekly/${issue.number}/index.html`, page({
      title: `${SITE_NAME} · 周报第 ${issue.number} 期`,
      description: `${issue.week.label}：${issueSummary(issue)}`,
      pathName: `/weekly/${issue.number}/`,
      ogType: 'article',
      body: `${issueBlock(issue)}\n<p class="quiet" style="margin-top:1.5rem;font-size:.875rem">${issue.number > 1 ? `<a href="/weekly/${issue.number - 1}/">← 上一期</a> · ` : ''}<a href="/weekly/">往期列表</a>${issue.number < (latest?.number ?? 0) ? ` · <a href="/weekly/${issue.number + 1}/">下一期 →</a>` : ''}</p>`,
    }));
    write(`x/${issue.number}.txt`, thread(issue).join('\n\n') + '\n');
  }

  write('feed.xml', feed(issues));
  write('404.html', page({ title: `${SITE_NAME} · 没有这个页面`, description: DESCRIPTION, pathName: '/404.html', body: '<div class="page-head"><h1>没有这个页面</h1><p><a href="/">回到首页</a> · <a href="/weekly/">往期周报</a></p></div>' }));
  write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITES.home}/sitemap.xml\n`);
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['/', '/weekly/', ...issues.map((i) => `/weekly/${i.number}/`)].map((p) => `<url><loc>${SITES.home}${p}</loc></url>`).join('\n')}\n</urlset>\n`);

  console.log(`built ${issues.length} issue(s)${latest ? `, latest is #${latest.number}` : ''}; beacon ${PRODUCTION ? 'on' : 'off'}; live numbers: leader ${stats.leader ? 'ok' : 'missing'}, docs ${stats.docs ?? 'missing'}, tools ${stats.tools ?? 'missing'}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
