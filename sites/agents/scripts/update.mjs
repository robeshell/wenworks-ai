// Fetch each vendor's public docs index, diff it against the last snapshot,
// and prepend any changes to data/updates.json. Only titles and URLs are stored.
import fs from 'node:fs';
const SOURCES = {
  claude: { name: 'Claude Code', url: 'https://code.claude.com/docs/_llms/zh-cn.txt', keep: u => u.includes('code.claude.com/docs/zh-CN/') },
  codex: { name: 'Codex', url: 'https://learn.chatgpt.com/docs/llms.txt', keep: u => u.includes('learn.chatgpt.com/') && !/llms(-full)?\.txt$/.test(u) },
  antigravity: { name: 'Antigravity CLI', url: 'https://antigravity.google/llms.txt', base: 'https://antigravity.google', keep: u => /antigravity\.google\/docs(\/|$)/.test(u) },
  grok: { name: 'Grok', url: 'https://docs.x.ai/llms.txt', base: 'https://docs.x.ai', keep: u => /docs\.x\.ai\/(build|grok-bot)(\/|$)/.test(u) },
};
const file = f => new URL('../data/' + f, import.meta.url);
const load = (f, d) => { try { return JSON.parse(fs.readFileSync(file(f), 'utf8')); } catch { return d; } };

export function normalize(u, base) {
  try {
    const x = new URL(u, base);
    x.protocol = 'https:'; x.hash = ''; x.search = '';
    x.pathname = x.pathname.replace(/\.md$/, '').replace(/\/+$/, '');
    return x.toString();
  } catch { return null; }
}
export function parse(text, src) {
  const pages = {};
  const re = src.headingsOnly ? /^#{1,3}\s*\[([^\]\n]+)\]\(([^)\s]+)\)/gm : /\[([^\]\n]+)\]\(([^)\s]+)\)/g;
  for (const m of text.matchAll(re)) {
    const url = normalize(m[2], src.base || src.url);
    if (url && src.keep(url) && !(url in pages)) pages[url] = m[1].trim().slice(0, 200);
  }
  // fallback for "- Title: https://…" style lines
  for (const m of text.matchAll(/^\s*[-*]\s+(.+?):\s+(https?:\/\/\S+)\s*$/gm)) {
    const url = normalize(m[2], src.base || src.url);
    if (url && src.keep(url) && !(url in pages)) pages[url] = m[1].trim().slice(0, 200);
  }
  return pages;
}
export function priceTokens(html) {
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
  return [...new Set(text.match(/\$\s?\d[\d,]*(?:\.\d+)?/g) || [])].map(t => t.replace(/\s/g, '')).sort();
}
export function diff(before, after, agent, date) {
  const out = [];
  for (const [url, title] of Object.entries(after)) {
    if (!(url in before)) out.push({ date, agent, type: 'added', title, url });
    else if (before[url] !== title) out.push({ date, agent, type: 'renamed', title, url });
  }
  for (const [url, title] of Object.entries(before)) if (!(url in after)) out.push({ date, agent, type: 'removed', title, url });
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const snapshot = load('snapshot.json', {});
  let updates = load('updates.json', []);
  const date = new Date().toISOString().slice(0, 10);
  const fresh = [];
  for (const [id, src] of Object.entries(SOURCES)) {
    try {
      const res = await fetch(src.url, { headers: { 'user-agent': 'agent-nav-index-check (+https://ai.wenworks.app/agents/)' }, signal: AbortSignal.timeout(60000) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const pages = parse(await res.text(), src);
      const n = Object.keys(pages).length, old = snapshot[id] && Object.keys(snapshot[id]).length;
      if (n < 5) throw new Error(`only ${n} pages parsed`);
      if (old && n < old * 0.5) throw new Error(`page count fell from ${old} to ${n}; skipping as a likely fetch or format problem`);
      if (old) fresh.push(...diff(snapshot[id], pages, src.name, date));
      snapshot[id] = pages;
      console.log(`${id}: ${n} pages${old ? '' : ' (first snapshot)'}`);
    } catch (e) { console.warn(`${id}: skipped — ${e.message}`); }
  }
  // ---- pricing pages: flag when the set of dollar amounts on an official pricing page changes ----
  const PRICING = {
    'Claude Code': 'https://claude.com/pricing',
    'Codex': 'https://learn.chatgpt.com/docs/pricing.md',
    'Antigravity CLI': 'https://antigravity.google/pricing',
    'Grok': 'https://x.ai/pricing',
  };
  const prices = load('prices.json', {});
  for (const [agent, url] of Object.entries(PRICING)) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'agent-nav-index-check (+https://ai.wenworks.app/agents/)' }, signal: AbortSignal.timeout(60000) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const tokens = priceTokens(await res.text());
      if (tokens.length < 2) throw new Error('no prices found in the page text');
      const before = prices[agent]?.tokens;
      if (before && before.join() !== tokens.join()) fresh.push({ date, agent, type: 'price', title: '官方定价页上的价格数字有变化，本站价格表可能需要更新', url: url.replace(/\.md$/, '') });
      prices[agent] = { tokens, checked: date };
      console.log(`${agent} pricing: ${tokens.length} amounts${before ? '' : ' (first snapshot)'}`);
    } catch (e) { console.warn(`${agent} pricing: skipped — ${e.message}`); }
  }
  fs.writeFileSync(file('prices.json'), JSON.stringify(prices, null, 1));
  updates = [...fresh, ...updates].slice(0, 500);
  fs.writeFileSync(file('snapshot.json'), JSON.stringify(snapshot, null, 1));
  fs.writeFileSync(file('updates.json'), JSON.stringify(updates, null, 1));
  console.log(`${fresh.length} new change(s)`);
}
