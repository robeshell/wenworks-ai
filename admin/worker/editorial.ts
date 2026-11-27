// The agents part's hand-written content (sites/agents/data/editorial.json).
//
// The admin keeps a working copy in settings. It follows the repository until it
// is edited here; once edited, a change made to the file outside the admin (a
// pull request, say) is a conflict: publishing stops for that file and the page
// offers to reload from the repository instead of overwriting it.
import { AGENT_IDS, EDITORIAL_FILE, docsIndex, editorialFile, gitBlobSha, type DocPage, type Editorial } from '../shared/content.mjs';
import type { Env } from './env';
import { HttpError } from './github';

const SECTIONS = ['agents', 'cmp', 'cmp2', 'must', 'start', 'pick', 'price'] as const;
export type Section = (typeof SECTIONS)[number];

function headers(env: Env, raw = false): Record<string, string> {
  return {
    'user-agent': 'wenworks-admin',
    accept: raw ? 'application/vnd.github.raw' : 'application/vnd.github+json',
    ...(env.GITHUB_TOKEN ? { authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}),
  };
}

/** The file on the branch: its blob id and text. */
async function repoFile(env: Env, path: string): Promise<{ sha: string; text: string }> {
  const res = await fetch(`${env.GITHUB_API || 'https://api.github.com'}/repos/${env.GITHUB_REPO}/contents/${path}?ref=${env.GITHUB_BRANCH}`, { headers: headers(env) });
  if (!res.ok) {
    // Without a token the API allows few requests; the raw file host has no such limit (it may lag by a few minutes).
    const raw = await fetch(`https://raw.githubusercontent.com/${env.GITHUB_REPO}/${env.GITHUB_BRANCH}/${path}`);
    if (!raw.ok) throw new HttpError(502, `读取仓库里的 ${path} 失败（${res.status}）。`);
    const text = await raw.text();
    return { sha: await gitBlobSha(text), text };
  }
  const body = await res.json<{ sha: string; content: string; encoding: string }>();
  const bytes = Uint8Array.from(atob(body.content.replace(/\n/g, '')), (c) => c.charCodeAt(0));
  return { sha: body.sha, text: new TextDecoder().decode(bytes) };
}

async function read(env: Env): Promise<Record<string, string>> {
  const { results } = await env.DB.prepare("SELECT key, value FROM settings WHERE key IN ('editorial', 'editorial_base', 'editorial_dirty', 'editorial_at', 'editorial_by')").all<{ key: string; value: string }>();
  return Object.fromEntries(results.map((r) => [r.key, r.value]));
}

const put = (env: Env, key: string, value: string) => env.DB.prepare('INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT (key) DO UPDATE SET value = ?2').bind(key, value);

/** Takes the repository's file as the working copy, dropping edits made here. */
export async function reload(env: Env): Promise<void> {
  const file = await repoFile(env, EDITORIAL_FILE);
  JSON.parse(file.text);
  await env.DB.batch([put(env, 'editorial', file.text), put(env, 'editorial_base', file.sha), put(env, 'editorial_dirty', '0')]);
}

/** The working copy, brought up to date with the repository when it has no edits of its own. */
export async function getEditorial(env: Env) {
  let s = await read(env);
  let repoSha: string | null = null;
  try {
    repoSha = (await repoFile(env, EDITORIAL_FILE)).sha;
  } catch {
    /* offline or rate-limited: show the working copy as it is */
  }
  if (!s.editorial || (repoSha && repoSha !== s.editorial_base && s.editorial_dirty !== '1')) {
    await reload(env);
    s = await read(env);
  }
  return {
    data: JSON.parse(s.editorial) as Editorial,
    edited: s.editorial_dirty === '1',
    conflict: Boolean(repoSha && repoSha !== s.editorial_base && s.editorial_dirty === '1'),
    editedAt: s.editorial_at || null,
    editedBy: s.editorial_by || null,
  };
}

/** Basic shape checks per section, so a bad save cannot break the agents page. */
function check(section: Section, v: any) {
  const fail = (why: string) => { throw new HttpError(400, why); };
  const str = (x: any) => typeof x === 'string';
  const link = (x: any) => Array.isArray(x) && x.length === 2 && str(x[0]) && str(x[1]);
  const cell = (x: any) => str(x) || typeof x === 'number' || link(x);
  if (section === 'must') {
    if (!Array.isArray(v)) fail('推荐文章应该是列表。');
    for (const [i, m] of v.entries()) if (!AGENT_IDS.includes(m?.a) || !str(m.t) || !m.t.trim() || !/^https?:\/\//.test(m.u) || !str(m.w)) fail(`推荐文章第 ${i + 1} 条：要选 Agent，填标题和 http 开头的链接。`);
  } else if (section === 'start') {
    for (const id of AGENT_IDS) if (!Array.isArray(v?.[id]) || !v[id].every((x: any) => link(x) && x[0].trim() && x[1].trim())) fail('上手清单每一步都要有名称和页面。');
  } else if (section === 'agents') {
    for (const id of AGENT_IDS) {
      const a = v?.[id];
      if (!a || !str(a.name) || !str(a.maker) || !/^https?:\/\//.test(a.base) || !str(a.key) || !Array.isArray(a.stages)) fail(`${id} 的基本信息不完整。`);
      for (const st of a.stages) if (!str(st?.n) || !st.n.trim() || !str(st.d) || !Array.isArray(st.p) || !st.p.every(str)) fail(`${a.name} 的学习路线有阶段缺名称或页面。`);
      if (a.news && (!Array.isArray(a.news) || !a.news.every(link))) fail(`${a.name} 的动态格式不对。`);
    }
  } else if (section === 'pick' || section === 'price') {
    if (!Array.isArray(v)) fail('表格应该是列表。');
    for (const r of v) if (!Array.isArray(r) || !str(r[0]) || !r[0].trim() || typeof r[1] !== 'object' || !AGENT_IDS.every((id) => cell(r[1][id]))) fail(`「${r?.[0] || '某一行'}」每一格都要有内容（文字或链接）。`);
  } else if (section === 'cmp') {
    if (!Array.isArray(v) || !v.every((r: any) => Array.isArray(r) && r.length === 5 && r.every(str) && r[0].trim())) fail('功能对照表格式不对。');
  } else if (section === 'cmp2') {
    if (typeof v !== 'object' || Array.isArray(v)) fail('功能对照表格式不对。');
  }
}

/** Saves some sections, keeping the file's key order; the previous copy goes into revisions. */
export async function saveSections(env: Env, values: Partial<Record<Section, unknown>>, user: string, now: string) {
  const s = await read(env);
  if (!s.editorial) throw new HttpError(409, '还没有载入，请刷新页面。');
  const data = JSON.parse(s.editorial);
  for (const [k, v] of Object.entries(values)) {
    if (!SECTIONS.includes(k as Section)) throw new HttpError(400, `没有 ${k} 这一块。`);
    check(k as Section, v);
    data[k] = v;
  }
  const text = editorialFile(data);
  await env.DB.batch([
    env.DB.prepare('INSERT INTO revisions (entry_id, saved_at, saved_by, snapshot) VALUES (?, ?, ?, ?)').bind('editorial', now, user, s.editorial),
    put(env, 'editorial', text), put(env, 'editorial_dirty', '1'), put(env, 'editorial_at', now), put(env, 'editorial_by', user),
  ]);
}

/** For publishing: the file to write, or why it is held back. */
export async function editorialForPublish(env: Env, repoSha: string | undefined): Promise<{ content?: string; conflict?: string }> {
  const s = await read(env);
  if (!s.editorial || s.editorial_dirty !== '1') return {};
  if (repoSha && repoSha !== s.editorial_base) return { conflict: '仓库里的 editorial.json 在后台之外被改过。到「Agent 导航」页选择以仓库为准重新载入，或者先把那边的改动合进来。' };
  return { content: editorialFile(JSON.parse(s.editorial)) };
}

/** After a publish that wrote the file: it now matches the repository. */
export async function editorialPublished(env: Env, content: string) {
  await env.DB.batch([put(env, 'editorial_base', await gitBlobSha(content)), put(env, 'editorial_dirty', '0')]);
}

let docsCache: { at: number; docs: Record<string, DocPage[]> } | null = null;

/** Each agent's docs index, for choosing pages by title. */
export async function agentDocs(env: Env): Promise<Record<string, DocPage[]>> {
  if (docsCache && Date.now() - docsCache.at < 10 * 60_000) return docsCache.docs;
  const files: Record<string, string> = { claude: 'claude', codex: 'codex', antigravity: 'antigravity', grok: 'grok' };
  const docs: Record<string, DocPage[]> = {};
  await Promise.all(Object.entries(files).map(async ([id, name]) => {
    const res = await fetch(`https://raw.githubusercontent.com/${env.GITHUB_REPO}/${env.GITHUB_BRANCH}/sites/agents/data/${name}.txt`);
    docs[id] = res.ok ? docsIndex(await res.text()) : [];
  }));
  docsCache = { at: Date.now(), docs };
  return docs;
}
