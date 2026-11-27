// The tools catalog as the admin stores it, and the files the public site reads.
//
// The admin keeps one row per entry (see migrations/). Publishing turns the
// rows back into exactly the files the tools part has always read:
//
//   sites/tools/data/tools.json          every tool that is not a draft
//   sites/tools/data/route-aliases.json  old addresses of moved entries
//   sites/tools/content/<kind>s/<slug>.md  every other entry that is published
//
// The format matches what Curator exported, byte for byte, so the first publish
// from the admin changes nothing. Plain JavaScript with no imports: the Worker,
// the import script and the tests all use it.

export const KINDS = ['tool', 'site', 'skill', 'project', 'prompt'];
export const KIND_LABEL = { tool: '工具', site: '站点', skill: '技能', project: '开源项目', prompt: '提示词' };
export const STATUS_LABEL = { draft: '草稿', active: '已发布', archived: '已归档' };

export const TOOLS_ROOT = 'sites/tools';
export const TOOLS_FILE = `${TOOLS_ROOT}/data/tools.json`;
export const ALIASES_FILE = `${TOOLS_ROOT}/data/route-aliases.json`;
export const TAXONOMY_FILE = `${TOOLS_ROOT}/data/taxonomy.json`;
export const markdownPath = (kind, slug) => `${TOOLS_ROOT}/content/${kind}s/${slug}.md`;
export const MARKDOWN_PATH = /^sites\/tools\/content\/(skills|projects|sites|prompts)\/[a-z0-9-]+\.md$/;
/** The home page's hand-picked links ("值得看的讨论"). */
export const PICKS_FILE = 'sites/home/data/picks.json';
/** Images live under the tools part's public/ folder; entries refer to them as /covers/x.webp, /logos/x.png. */
export const ASSET_PATH = /^\/(covers|logos)\/[A-Za-z0-9._-]+\.(webp|png|jpg|jpeg|svg)$/;
export const assetRepoPath = (path) => `${TOOLS_ROOT}/public${path}`;
/** The repository files the admin writes, apart from images. */
export const isOwnedFile = (path) => path === TOOLS_FILE || path === ALIASES_FILE || path === PICKS_FILE || MARKDOWN_PATH.test(path);

/** picks.json: the order shown, empty fields left out. */
export function picksFile(picks) {
  const list = [...picks]
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || (a.id ?? 0) - (b.id ?? 0))
    .map((p) => Object.fromEntries(['url', 'title', 'author', 'note', 'date'].filter((k) => p[k]).map((k) => [k, p[k]])));
  return `${JSON.stringify(list, null, 2)}\n`;
}

// ---------------------------------------------------------------------------
// Files -> entries (used once, to import what is in the repository)

/** A tools.json entry as an admin entry. */
export function entryFromTool(tool, sortOrder) {
  const payload = {};
  // Curator kept the card line as `tagline`; tools.json calls it `verdict`.
  if (tool.logo) payload.logo = tool.logo;
  if (tool.cover) payload.cover = tool.cover;
  payload.tagline = tool.verdict;
  payload.summary = tool.summary;
  if (tool.description) payload.description = tool.description;
  payload.url = tool.url;
  return {
    id: tool.id,
    kind: 'tool',
    slug: tool.slug,
    title: tool.name,
    status: tool.status,
    category: tool.category || '',
    tags: tool.tags || [],
    sourceUrl: '',
    payload,
    sortOrder,
  };
}

/** A content/<kind>s/<slug>.md file as an admin entry. */
export function entryFromMarkdown(text, sortOrder) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) throw new Error('missing frontmatter');
  const meta = JSON.parse(match[1]);
  return {
    id: meta.id,
    kind: meta.blockType,
    slug: meta.slug,
    title: meta.title,
    status: meta.status,
    category: meta.category || '',
    tags: meta.tags || [],
    sourceUrl: meta.sourceUrl || '',
    payload: meta.payload || {},
    sortOrder,
  };
}

// ---------------------------------------------------------------------------
// Entries -> files (what publishing writes)

function toolRecord(entry) {
  const p = entry.payload || {};
  return {
    id: entry.id,
    slug: entry.slug,
    name: entry.title,
    url: String(p.url || entry.sourceUrl || ''),
    ...(p.logo ? { logo: p.logo } : {}),
    ...(p.cover ? { cover: p.cover } : {}),
    category: entry.category || '',
    tags: entry.tags || [],
    status: entry.status,
    verdict: { zh: p.tagline?.zh || p.summary?.zh || '', en: p.tagline?.en || p.summary?.en || '' },
    summary: p.summary,
    ...(p.description ? { description: p.description } : {}),
  };
}

function markdownDocument(entry) {
  const payload = entry.payload || {};
  const frontmatter = {
    id: entry.id,
    slug: entry.slug,
    blockType: entry.kind,
    title: entry.title,
    status: entry.status,
    category: entry.category || '',
    tags: entry.tags || [],
    ...(entry.sourceUrl ? { sourceUrl: entry.sourceUrl } : {}),
    payload,
  };
  // Both languages are in the frontmatter; after `---` only the Chinese body, so the file reads well in an editor.
  const body = typeof payload.body === 'object' ? payload.body?.zh : payload.body;
  return `---\n${JSON.stringify(frontmatter, null, 2)}\n---\n\n${String(body || '').trim()}\n`;
}

const bySortOrder = (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || String(a.id).localeCompare(String(b.id));

/**
 * The public files for a set of entries, as { path: content }.
 * Tools that are not drafts all go into tools.json (archived ones too: the site
 * leaves them out itself); other kinds only get a file while published.
 */
export function publicFiles(entries, aliases = []) {
  const sorted = [...entries].sort(bySortOrder);
  const files = {
    [ALIASES_FILE]: `${JSON.stringify(aliases, null, 2)}\n`,
    [TOOLS_FILE]: `${JSON.stringify({ items: sorted.filter((e) => e.kind === 'tool' && e.status !== 'draft').map(toolRecord) }, null, 2)}\n`,
  };
  for (const entry of sorted) if (entry.kind !== 'tool' && entry.status === 'active') files[markdownPath(entry.kind, entry.slug)] = markdownDocument(entry);
  return files;
}

/**
 * What publishing would change, given the public files the repository has now.
 * Markdown files the admin owns but no longer produces (an entry was archived,
 * deleted or renamed) are removed.
 */
export function planPublish(next, current) {
  const changes = [];
  for (const [path, content] of Object.entries(next)) {
    if (!(path in current)) changes.push({ path, change: 'added', content });
    else if (current[path] !== content) changes.push({ path, change: 'modified', content });
  }
  for (const path of Object.keys(current)) if (MARKDOWN_PATH.test(path) && !(path in next)) changes.push({ path, change: 'removed' });
  return changes.sort((a, b) => a.path.localeCompare(b.path));
}

// ---------------------------------------------------------------------------
// AI drafts (inbox) -> entries

const KIND_OF = { tool: 'tool', skill: 'skill', 'open-source': 'project', project: 'project', site: 'site', prompt: 'prompt' };
const text = (v, max = 20000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const pair = (v, max) => ({ zh: text(v?.zh, max), en: text(v?.en, max) });

/** A draft from the model, cleaned into the fields an entry needs. Unknown or missing values become empty. */
export function normalizeDraft(raw, url) {
  const kind = KIND_OF[raw?.kind] || KIND_OF[raw?.blockType] || 'tool';
  const slug = String(raw?.slug || raw?.name || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  const links = Array.isArray(raw?.links) ? raw.links.filter((l) => l && /^https?:\/\//.test(l.url)).slice(0, 6).map((l) => ({ label: text(l.label, 80) || 'Link', url: text(l.url, 2000), kind: ['official', 'docs', 'repository', 'reference', 'other'].includes(l.kind) ? l.kind : 'other' })) : [];
  const body = typeof raw?.body === 'object' && raw?.body ? pair(raw.body) : { zh: text(raw?.body), en: text(raw?.bodyEn) };
  return {
    kind,
    title: text(raw?.name || raw?.title, 120),
    slug,
    category: text(raw?.category, 40),
    tags: Array.isArray(raw?.tags) ? [...new Set(raw.tags.map((t) => String(t).trim()).filter(Boolean))].slice(0, 12) : [],
    url: text(raw?.url, 2000) || url,
    verdict: pair(raw?.verdict, 200),
    summary: pair(raw?.summary, 400),
    description: raw?.description ? pair(raw.description, 2000) : { zh: '', en: '' },
    body,
    links,
    prompt: text(raw?.prompt, 16000),
    variables: Array.isArray(raw?.variables) ? raw.variables.filter((v) => v?.name).map((v) => ({ name: text(v.name, 80), description: text(v.description, 500), ...(v.example ? { example: text(v.example, 1000) } : {}) })) : [],
    examples: Array.isArray(raw?.examples) ? raw.examples.filter((e) => e?.input).map((e) => ({ input: text(e.input, 4000), output: text(e.output, 4000) })) : [],
    logoUrl: /^https?:\/\//.test(raw?.logoUrl || '') ? raw.logoUrl : '',
    rationale: text(raw?.rationale, 600),
    confidence: typeof raw?.confidence === 'number' ? raw.confidence : null,
  };
}

/** The entry a reviewed draft becomes (always a draft first). */
export function entryFromDraft(d) {
  const payload =
    d.kind === 'tool' ? { tagline: d.verdict, summary: d.summary, description: d.description, url: d.url }
    : d.kind === 'site' ? { summary: d.summary, description: d.description, url: d.url }
    : d.kind === 'prompt' ? { summary: d.summary, prompt: d.prompt, variables: d.variables, examples: d.examples, links: d.links }
    : { summary: d.summary, body: d.body, links: d.links };
  return {
    id: d.slug, kind: d.kind, slug: d.slug, title: d.title, status: 'draft', category: d.category, tags: d.tags,
    sourceUrl: d.kind === 'tool' || d.kind === 'site' ? '' : d.url, payload, sortOrder: 0,
  };
}

// ---------------------------------------------------------------------------
// Checks shown in the admin's to-do list

const filled = (value) => Boolean(value && String(value).trim());

/** What an entry is missing before it is fit to publish. Each issue is { code, label }. */
export function entryIssues(entry) {
  const p = entry.payload || {};
  const issues = [];
  const add = (code, label) => issues.push({ code, label });
  if (!filled(entry.title)) add('title', '缺标题');
  if (!/^[a-z0-9-]+$/.test(entry.slug || '')) add('slug', '地址名只能用小写字母、数字和连字符');
  if (!filled(entry.category)) add('category', '缺分类');
  if (!filled(p.summary?.zh)) add('summary-zh', '缺中文简介');
  if (!filled(p.summary?.en)) add('summary-en', '缺英文简介');
  if (entry.kind === 'tool') {
    if (!filled(p.tagline?.zh) || !filled(p.tagline?.en)) add('tagline', '缺双语一句话判断');
    if (!filled(p.url)) add('url', '缺官网地址');
  }
  if (entry.kind === 'site' && !filled(p.url)) add('url', '缺网址');
  if ((entry.kind === 'tool' || entry.kind === 'site') && !filled(p.cover)) add('cover', '缺封面');
  if ((entry.kind === 'skill' || entry.kind === 'project') && !filled(p.body?.zh)) add('body-zh', '缺中文正文');
  if ((entry.kind === 'skill' || entry.kind === 'project') && !filled(p.body?.en)) add('body-en', '缺英文正文');
  if (entry.kind === 'prompt' && !filled(p.prompt)) add('prompt', '缺提示词正文');
  return issues;
}

// ---------------------------------------------------------------------------
// Git blob ids, to compare files with the repository without downloading them

/** The id git gives a file's content: sha1("blob <bytes>\0<content>"), in hex. Text or bytes. */
export async function gitBlobSha(content) {
  const body = typeof content === 'string' ? new TextEncoder().encode(content) : content;
  const head = new TextEncoder().encode(`blob ${body.length}\0`);
  const all = new Uint8Array(head.length + body.length);
  all.set(head);
  all.set(body, head.length);
  const digest = await crypto.subtle.digest('SHA-1', all);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * planPublish against the repository's blob ids instead of its contents:
 * `current` is { path: sha } for the public files the repository has now.
 */
export async function planPublishBySha(next, current) {
  const changes = [];
  for (const [path, content] of Object.entries(next)) {
    if (!(path in current)) changes.push({ path, change: 'added', content });
    else if (current[path] !== (await gitBlobSha(content))) changes.push({ path, change: 'modified', content });
  }
  for (const path of Object.keys(current)) if (MARKDOWN_PATH.test(path) && !(path in next)) changes.push({ path, change: 'removed' });
  return changes.sort((a, b) => a.path.localeCompare(b.path));
}
