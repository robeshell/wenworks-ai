// The hand-picked articles ("值得读的官方文章") live in the agents part's page
// template as `const MUST=[...]`. Read them from there so the list has one home.
import vm from 'node:vm';

const AGENT_NAME = { claude: 'Claude Code', codex: 'Codex', antigravity: 'Antigravity CLI', grok: 'Grok' };

/** The MUST list from the template text, or [] when it cannot be found or read. */
export function readMust(template) {
  const start = template.indexOf('const MUST=[');
  if (start < 0) return [];
  const end = template.indexOf('\n];', start);
  if (end < 0) return [];
  try {
    // A plain array literal of strings; evaluated in an empty context with a time limit.
    const list = vm.runInNewContext(`(${template.slice(start + 'const MUST='.length, end + 2)})`, {}, { timeout: 100 });
    return Array.isArray(list) ? list.filter((m) => m && typeof m.t === 'string' && /^https?:\/\//.test(m.u)) : [];
  } catch {
    return [];
  }
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
