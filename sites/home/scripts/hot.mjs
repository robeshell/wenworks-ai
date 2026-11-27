// Refresh data/hot.json: what people are talking about in AI right now, from
// sources that are public and need no key.
//
//   node scripts/hot.mjs
//
//   Hacker News   stories of the last three days about AI, by points
//   GitHub        repositories created in the last two weeks about AI, by stars
//
// Each source is read on its own. When one fails, the items it had last time
// are kept, so the page never loses a column because of one bad request.
// Only titles, numbers and links are stored.
//
// The newest official article titles (from the agents part's data/articles.json)
// and the hand-picked ones ("must" in its data/editorial.json) are translated here too,
// so the front page shows them in Chinese.
//
// Titles and repository descriptions are machine-translated into Chinese by
// Google Translate's keyless web endpoint, with MyMemory's free API (no key) as
// the fallback; neither is a language model and neither needs a key. Translations are cached in .cache/translations.json,
// which CI keeps between runs, so each run only sends what is new. When a
// translation fails the English stays.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { newestArticles } from './lib/front.mjs';
import { pickMust, readMust } from './lib/must.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'data', 'hot.json');
const CACHE = path.join(ROOT, '.cache', 'translations.json');
const ARTICLES = path.resolve(ROOT, process.env.AGENTS_DIR || '../agents', 'data', 'articles.json');
const EDITORIAL = path.resolve(ROOT, process.env.AGENTS_DIR || '../agents', 'data', 'editorial.json');
const DAY = 86400000;

// Case matters for the short ones: "AI" is a topic, "ai" is a syllable.
const EXACT = /\b(AI|AGI|LLMs?|GPTs?|RAG|MCP|xAI)\b/;
const LOOSE = /\b(chatgpt|openai|anthropic|claude|gemini|deepmind|mistral|llama|deepseek|qwen|grok|copilot|codex|cursor|hugging ?face|agentic|coding agents?|language models?|foundation models?|machine learning|deep learning|neural net\w*|transformers?|diffusion|fine-?tun\w*|prompt(s|ing| injection| engineering)?|embeddings?|inference|chatbots?|vibe cod\w*)\b/i;
export const aboutAi = (title) => EXACT.test(title) || LOOSE.test(title);

/** The AI stories among Hacker News hits, most points first. */
export function pickStories(hits, limit = 10) {
  const seen = new Set();
  return hits
    .filter((h) => h?.title && aboutAi(h.title))
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
    .filter((h) => !seen.has(h.objectID) && seen.add(h.objectID))
    .slice(0, limit)
    .map((h) => ({
      title: h.title,
      url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      discussion: `https://news.ycombinator.com/item?id=${h.objectID}`,
      points: h.points ?? 0,
      comments: h.num_comments ?? 0,
      date: (h.created_at || '').slice(0, 10),
    }));
}

/** The most starred of the repositories found, one row each. */
const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

export function pickRepos(repos, limit = 8) {
  const seen = new Set();
  return repos
    .filter((r) => r?.full_name && !r.fork && !r.archived)
    .sort((a, b) => (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0))
    .filter((r) => !seen.has(r.full_name) && seen.add(r.full_name))
    .slice(0, limit)
    .map((r) => ({
      name: r.full_name,
      url: r.html_url,
      // Kept whole so it translates as a sentence; the page cuts it to one line.
      description: clip((r.description || '').trim(), 300),
      stars: r.stargazers_count ?? 0,
      language: r.language || '',
      date: (r.created_at || '').slice(0, 10),
    }));
}

async function getJson(url, headers = {}) {
  const response = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'wenworks-ai-home', ...headers }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`${new URL(url).host} answered ${response.status}`);
  return response.json();
}

async function hackerNews(now) {
  const since = Math.floor((now - 3 * DAY) / 1000);
  const pages = await Promise.all([0, 1].map((page) => getJson(`https://hn.algolia.com/api/v1/search?tags=story&numericFilters=created_at_i%3E${since},points%3E%3D60&hitsPerPage=100&page=${page}`)));
  return pickStories(pages.flatMap((p) => p.hits ?? []));
}

async function github(now) {
  const since = new Date(now - 14 * DAY).toISOString().slice(0, 10);
  // The token GitHub Actions hands every run only raises the rate limit. A token
  // that is refused (a local one for another service, say) is dropped and the
  // request repeated without it.
  let headers = process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
  const search = (q) => getJson(`https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=15`, { accept: 'application/vnd.github+json', ...headers });
  const found = [];
  for (const topic of ['ai', 'llm', 'ai-agents', 'mcp', 'agent']) {
    const q = `topic:${topic} created:>${since} stars:>50`;
    const result = await search(q).catch((error) => {
      if (!headers.authorization) throw error;
      headers = {};
      return search(q);
    });
    found.push(...(result.items ?? []));
  }
  return pickRepos(found);
}

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#039;': "'" };
const decode = (text) => text.replace(/&(amp|lt|gt|quot|#0?39);/g, (m) => ENTITIES[m] ?? m);

/** A translation is usable when it is Chinese, differs from the source and is not a service warning. */
export function usable(text, source) {
  const t = decode(String(text ?? '')).trim();
  if (!t || t === source.trim() || /MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID/i.test(t)) return null;
  return /[\u4e00-\u9fff]/.test(t) ? t : null;
}

// Machine translation turns product names into words; put the names back.
const NAMES = [
  [/克劳德\s*代码/g, 'Claude Code'],
  [/克劳德/g, 'Claude'],
  [/人择/g, 'Anthropic'],
  [/双子座/g, 'Gemini'],
  [/开放人工智能/g, 'OpenAI'],
  [/拥抱脸/g, 'Hugging Face'],
  [/副驾驶/g, 'Copilot'],
  [/反重力/g, 'Antigravity'],
];
// A space goes between a restored name and the Chinese next to it, as in the rest of the site.
export const fixNames = (text) =>
  NAMES.reduce((t, [from, to]) => t.replace(from, `\u0000${to}\u0000`), text)
    .replace(/([\u4e00-\u9fff])\u0000/g, '$1 ')
    .replace(/\u0000([\u4e00-\u9fff])/g, ' $1')
    .replaceAll('\u0000', '');

/** Google's answer is nested arrays: [[[translated, source, ...], ...], ...]. */
export const readGoogle = (answer) => (Array.isArray(answer?.[0]) ? answer[0].map((part) => (Array.isArray(part) ? part[0] ?? '' : '')).join('') : '');
export const readMyMemory = (answer) => (Number(answer?.responseStatus) === 200 ? answer?.responseData?.translatedText : '');

const TRANSLATORS = [
  async (q) => readGoogle(await getJson(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(q)}`)),
  async (q) => readMyMemory(await getJson(`https://api.mymemory.translated.net/get?langpair=en%7Czh-CN&q=${encodeURIComponent(q)}`)),
];

async function translateOne(source) {
  for (const ask of TRANSLATORS) {
    try {
      const text = usable(await ask(source.slice(0, 450)), source);
      if (text) return text;
    } catch {}
  }
  return null;
}

/** Adds titleZh / descriptionZh to the items, using and refreshing the cache. */
async function translate(out) {
  let cache = {};
  try {
    cache = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  } catch {}
  const wanted = [
    ...out.hn.items.map((item) => [item, 'title', 'titleZh']),
    ...out.github.items.filter((item) => item.description).map((item) => [item, 'description', 'descriptionZh']),
    ...out.articles.items.map((item) => [item, 'title', 'titleZh']),
  ];
  let asked = 0;
  let failed = 0;
  for (const [item, from, to] of wanted) {
    const source = item[from];
    if (!cache[source] && failed < 3) {
      asked += 1;
      const text = await translateOne(source);
      if (text) cache[source] = text;
      else failed += 1;
    }
    if (cache[source]) item[to] = fixNames(cache[source]);
  }
  // Keep only what is on the page now, so the cache does not grow without end.
  const keep = Object.fromEntries(wanted.map(([item, from]) => item[from]).filter((s) => cache[s]).map((s) => [s, cache[s]]));
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  fs.writeFileSync(CACHE, JSON.stringify(keep, null, 2) + '\n');
  console.log(`translated: ${Object.keys(keep).length} of ${wanted.length} (${asked} asked, ${failed} failed)`);
  if (failed) console.log('::warning title=hot translation::some titles stay in English this time');
}

async function main() {
  const now = Date.now();
  let previous = {};
  try {
    previous = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {}
  const out = { updatedAt: new Date(now).toISOString() };
  for (const [key, read] of [['hn', hackerNews], ['github', github]]) {
    try {
      const items = await read(now);
      if (!items.length) throw new Error('no items came back');
      out[key] = { updatedAt: out.updatedAt, items };
    } catch (error) {
      console.log(`::warning title=hot ${key} kept as it was::${error instanceof Error ? error.message : error}`);
      out[key] = previous[key] ?? { updatedAt: null, items: [] };
    }
  }
  // The newest official articles: only url and title are kept, the front page matches them by url.
  let articles = [];
  try {
    articles = newestArticles(JSON.parse(fs.readFileSync(ARTICLES, 'utf8')), 8).map(({ url, title }) => ({ url, title }));
  } catch (error) {
    console.log(`::warning title=hot articles skipped::${error instanceof Error ? error.message : error}`);
  }
  // The hand-picked articles on the front page are translated the same way.
  try {
    for (const m of pickMust(readMust(JSON.parse(fs.readFileSync(EDITORIAL, 'utf8'))))) if (!articles.some((a) => a.url === m.url)) articles.push({ url: m.url, title: m.title });
  } catch {}
  out.articles = { items: articles };
  await translate(out);
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(out, null, 2) + '\n');
  console.log(`hot: ${out.hn.items.length} stories, ${out.github.items.length} repositories`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
