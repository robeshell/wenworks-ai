// Collect titles and links of posts from the vendors' official blogs into data/articles.json.
// Nothing but title, URL and date is stored; readers follow the link to the original.
import fs from 'node:fs';
const UA = { 'user-agent': 'agent-nav-index-check (+https://ai.wenworks.app/agents/)' };
const file = new URL('../data/articles.json', import.meta.url);
const get = async url => { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(45000) }); if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`); return r.text(); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
export const decode = s => String(s).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const day = s => { const d = new Date(s); return isNaN(d) ? null : d.toISOString().slice(0, 10); };
const clean = u => { try { const x = new URL(u); x.hash = ''; x.search = ''; x.pathname = x.pathname.replace(/\.md$/, ''); return x.toString(); } catch { return null; } };

export function parseFeed(xml) {
  const out = [];
  for (const m of xml.matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/g)) {
    const b = m[0];
    const title = decode((b.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || '');
    const link = (b.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/) || b.match(/<link[^>]*href=["']([^"']+)["']/) || b.match(/<link[^>]*>([\s\S]*?)<\/link>/) || [])[1];
    const date = day(decode((b.match(/<(pubDate|published|updated)[^>]*>([\s\S]*?)<\/\1>/) || [])[2] || ''));
    if (title && link) out.push({ title, url: clean(decode(link)), date });
  }
  return out.filter(x => x.url);
}

const SOURCES = [
  { src: 'OpenAI 开发者博客', async list() {
      const text = await get('https://developers.openai.com/blog/llms.txt');
      const posts = [...text.matchAll(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+\/blog\/[^)\s/]+)\)/g)].map(m => ({ title: m[1].trim(), url: clean(m[2]), date: null })).filter(p => p.url && !/llms(-full)?\.txt$/.test(p.url));
      try { // dates, when the official feed carries them
        const dates = Object.fromEntries(parseFeed(await get('https://developers.openai.com/rss.xml')).map(i => [i.url.split('/').pop(), i.date]));
        for (const p of posts) p.date = dates[p.url.split('/').pop()] || null;
      } catch (e) { console.warn('openai rss: ' + e.message); }
      return posts;
  } },
  { src: 'Anthropic 工程博客', async list(known) {
      const html = await get('https://www.anthropic.com/engineering');
      const urls = [...new Set([...html.matchAll(/href="(\/(?:engineering|research)\/[a-zA-Z0-9-]+)"/g)].map(m => 'https://www.anthropic.com' + m[1]))];
      const posts = [];
      for (const url of urls.filter(u => !known.has(u)).slice(0, 40)) {
        try {
          const page = await get(url);
          const title = decode((page.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/) || page.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || '').replace(/\s*[\\|\-–—]\s*Anthropic\s*$/, '');
          const date = day((page.match(/"datePublished"\s*:\s*"([^"]+)"/) || page.match(/property=["']article:published_time["'][^>]+content=["']([^"']+)["']/) || [])[1] || '');
          if (title) posts.push({ title, url, date });
        } catch (e) { console.warn('anthropic page: ' + e.message); }
        await sleep(400);
      }
      return posts;
  } },
  { src: 'Google 开发者博客', async list() {
      for (const feed of ['https://developers.googleblog.com/feeds/posts/default?alt=rss', 'https://developers.googleblog.com/en/rss/', 'https://developers.googleblog.com/rss/']) {
        try { const items = parseFeed(await get(feed)); if (items.length) return items.filter(i => /gemini cli|antigravity/i.test(i.title)); } catch (e) { console.warn('google: ' + e.message); }
      }
      throw new Error('no working feed');
  } },
];

if (import.meta.url === `file://${process.argv[1]}`) {
  let all = []; try { all = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  const first = all.length === 0, today = new Date().toISOString().slice(0, 10);
  const known = new Set(all.map(a => a.url));
  for (const s of SOURCES) {
    try {
      const posts = (await s.list(known)).filter(p => p.url && p.title && !known.has(p.url));
      for (const p of posts) { known.add(p.url); all.push({ src: s.src, title: p.title.slice(0, 200), url: p.url, date: p.date || (first ? null : today), seen: today }); }
      console.log(`${s.src}: ${posts.length} new`);
    } catch (e) { console.warn(`${s.src}: skipped — ${e.message}`); }
  }
  all.sort((a, b) => (b.date || '0').localeCompare(a.date || '0'));
  fs.writeFileSync(file, JSON.stringify(all.slice(0, 400), null, 1));
}
