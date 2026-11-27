// The hand-picked articles ("值得读的官方文章") live in the agents part's
// data/editorial.json under "must". Read them from there so the list has one home.
const AGENT_NAME = { claude: 'Claude Code', codex: 'Codex', antigravity: 'Antigravity CLI', grok: 'Grok' };

/** The picked articles from editorial.json's parsed content, or [] when there are none. */
export function readMust(editorial) {
  const list = editorial?.must;
  return Array.isArray(list) ? list.filter((m) => m && typeof m.t === 'string' && /^https?:\/\//.test(m.u)) : [];
}

/** A few picks, taking each agent's list in turn so one agent does not fill the block. */
export function pickMust(list, limit = 4) {
  const byAgent = new Map();
  for (const m of list) byAgent.set(m.a, [...(byAgent.get(m.a) ?? []), m]);
  const queues = [...byAgent.values()];
  const picks = [];
  for (let i = 0; picks.length < limit && queues.some((q) => q.length > i); i += 1) {
    for (const q of queues) if (q[i] && picks.length < limit) picks.push(q[i]);
  }
  return picks.map((m) => ({ title: m.t, url: m.u, why: m.w || '', src: AGENT_NAME[m.a] ?? m.a }));
}
