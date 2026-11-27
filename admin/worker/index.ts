// Wenworks AI admin API. Everything under /api/ needs a signed-in user; the rest
// of the paths are the interface's static files (dist/).
import { KINDS, entryIssues, planPublishBySha, publicFiles, type Entry, type Kind, type Status } from '../shared/content.mjs';
import { currentUser } from './auth';
import { aliasesForExport, allEntries, getEntry, saveStatements } from './db';
import type { Env } from './env';
import { HttpError, commitChanges, repoState } from './github';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const STATUSES: Status[] = ['draft', 'active', 'archived'];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const summary = (e: Entry) => ({
  id: e.id, kind: e.kind, slug: e.slug, title: e.title, status: e.status, category: e.category, tags: e.tags,
  updatedAt: e.updatedAt, updatedBy: e.updatedBy, cover: e.payload.cover || '', logo: e.payload.logo || '',
  line: e.payload.tagline?.zh || e.payload.summary?.zh || '', issues: entryIssues(e),
});

async function body<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError(400, '请求内容不是合法的 JSON。');
  }
}

/** Checks an edited entry and returns it cleaned up. */
function validate(input: Partial<Entry>, existing: Entry | null): Entry {
  const kind = (existing?.kind ?? input.kind) as Kind;
  if (!KINDS.includes(kind)) throw new HttpError(400, '板块不对。');
  const slug = String(input.slug ?? existing?.slug ?? '').trim();
  if (!SLUG.test(slug)) throw new HttpError(400, '地址名只能用小写字母、数字和连字符。');
  const title = String(input.title ?? existing?.title ?? '').trim();
  if (!title) throw new HttpError(400, '标题不能为空。');
  const status = (input.status ?? existing?.status ?? 'draft') as Status;
  if (!STATUSES.includes(status)) throw new HttpError(400, '状态不对。');
  const tags = Array.isArray(input.tags ?? existing?.tags) ? [...new Set((input.tags ?? existing?.tags ?? []).map(String).filter(Boolean))] : [];
  const payload = input.payload ?? existing?.payload ?? {};
  if (typeof payload !== 'object' || Array.isArray(payload)) throw new HttpError(400, 'payload 必须是对象。');
  return {
    id: existing?.id ?? slug,
    kind, slug, title, status,
    category: String(input.category ?? existing?.category ?? ''),
    tags,
    sourceUrl: String(input.sourceUrl ?? existing?.sourceUrl ?? '').trim(),
    payload,
    sortOrder: existing?.sortOrder ?? 0,
    createdAt: existing?.createdAt,
  };
}

async function publishPlan(env: Env) {
  const [entries, aliases, repo] = await Promise.all([allEntries(env.DB), aliasesForExport(env.DB), repoState(env)]);
  const changes = await planPublishBySha(publicFiles(entries, aliases), repo.files);
  // Which entries each changed file comes from, so the page can name them.
  const byPath = new Map<string, { id: string; title: string; kind: Kind }[]>();
  for (const e of entries) {
    const md = `sites/tools/content/${e.kind}s/${e.slug}.md`;
    if (e.kind !== 'tool') byPath.set(md, [...(byPath.get(md) ?? []), { id: e.id, title: e.title, kind: e.kind }]);
  }
  return { repo, changes, describe: (path: string) => byPath.get(path) ?? [] };
}

async function api(request: Request, env: Env, user: string, url: URL): Promise<Response> {
  const { pathname } = url;
  const method = request.method;
  const now = new Date().toISOString();

  if (pathname === '/api/me') return json({ email: user });

  if (pathname === '/api/overview' && method === 'GET') {
    const entries = await allEntries(env.DB);
    const last = await env.DB.prepare('SELECT * FROM publishes ORDER BY id DESC LIMIT 1').first();
    const counts = Object.fromEntries(KINDS.map((k) => [k, { draft: 0, active: 0, archived: 0 }]));
    for (const e of entries) counts[e.kind][e.status] += 1;
    const sinceLast = last ? entries.filter((e) => (e.updatedAt ?? '') > String(last.published_at)).length : entries.length;
    const todo = entries.filter((e) => e.status !== 'archived').map(summary).filter((e) => e.issues.length).slice(0, 50);
    const recent = [...entries].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0, 8).map(summary);
    return json({ counts, total: entries.length, todo, recent, lastPublish: last, editedSinceLastPublish: sinceLast, publishReady: Boolean(env.GITHUB_TOKEN) });
  }

  if (pathname === '/api/taxonomy') {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'taxonomy'").first<{ value: string }>();
    return json(row ? JSON.parse(row.value) : { categories: [], tags: [] });
  }

  if (pathname === '/api/entries' && method === 'GET') {
    const entries = await allEntries(env.DB);
    return json(entries.map(summary));
  }

  if (pathname === '/api/entries' && method === 'POST') {
    const input = await body<Partial<Entry>>(request);
    const entry = validate({ ...input, status: 'draft' }, null);
    if (await getEntry(env.DB, entry.id)) throw new HttpError(409, `已经有地址名为 ${entry.id} 的条目了。`);
    const max = await env.DB.prepare('SELECT COALESCE(MAX(sort_order), 0) AS n FROM entries').first<{ n: number }>();
    entry.sortOrder = (max?.n ?? 0) + 1;
    try {
      await env.DB.batch(saveStatements(env.DB, null, entry, user, now));
    } catch {
      throw new HttpError(409, `${entry.kind} 板块里已经有地址名 ${entry.slug} 了。`);
    }
    return json(await getEntry(env.DB, entry.id), 201);
  }

  if (pathname === '/api/entries/batch' && method === 'POST') {
    const { ids, status } = await body<{ ids: string[]; status: Status }>(request);
    if (!STATUSES.includes(status) || !Array.isArray(ids) || !ids.length) throw new HttpError(400, '批量操作的参数不对。');
    const statements = [];
    for (const id of ids) {
      const before = await getEntry(env.DB, id);
      if (before && before.status !== status) statements.push(...saveStatements(env.DB, before, { ...before, status }, user, now));
    }
    if (statements.length) await env.DB.batch(statements);
    return json({ changed: statements.length / 2 });
  }

  const one = pathname.match(/^\/api\/entries\/([^/]+)(\/revisions(?:\/(\d+)\/restore)?)?$/);
  if (one) {
    const id = decodeURIComponent(one[1]);
    const before = await getEntry(env.DB, id);
    if (!before) throw new HttpError(404, '没有这个条目。');
    if (one[2] && !one[3] && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT id, saved_at, saved_by, snapshot FROM revisions WHERE entry_id = ? ORDER BY id DESC LIMIT 30').bind(id).all<{ id: number; saved_at: string; saved_by: string; snapshot: string }>();
      return json(results.map((r) => ({ id: r.id, savedAt: r.saved_at, savedBy: r.saved_by, entry: JSON.parse(r.snapshot) })));
    }
    if (one[3] && method === 'POST') {
      const rev = await env.DB.prepare('SELECT snapshot FROM revisions WHERE id = ? AND entry_id = ?').bind(Number(one[3]), id).first<{ snapshot: string }>();
      if (!rev) throw new HttpError(404, '没有这条修改记录。');
      const restored = validate(JSON.parse(rev.snapshot), before);
      await env.DB.batch(saveStatements(env.DB, before, restored, user, now));
      return json(await getEntry(env.DB, id));
    }
    if (method === 'GET') return json({ ...before, issues: entryIssues(before) });
    if (method === 'PUT') {
      const entry = validate(await body<Partial<Entry>>(request), before);
      const clash = await env.DB.prepare('SELECT id FROM entries WHERE kind = ? AND slug = ? AND id != ?').bind(entry.kind, entry.slug, id).first();
      if (clash) throw new HttpError(409, `这个板块里已经有地址名 ${entry.slug} 了。`);
      await env.DB.batch(saveStatements(env.DB, before, entry, user, now));
      return json({ ...(await getEntry(env.DB, id)), issues: entryIssues(entry) });
    }
    if (method === 'DELETE') {
      if (before.status === 'active') throw new HttpError(409, '已发布的条目不能直接删除，先归档。');
      await env.DB.batch([
        env.DB.prepare('INSERT INTO revisions (entry_id, saved_at, saved_by, snapshot) VALUES (?, ?, ?, ?)').bind(id, now, user, JSON.stringify(before)),
        env.DB.prepare('DELETE FROM entries WHERE id = ?').bind(id),
      ]);
      return json({ deleted: id });
    }
  }

  if (pathname === '/api/publish' && method === 'GET') {
    const { repo, changes, describe } = await publishPlan(env);
    return json({ head: repo.head, changes: changes.map(({ path, change }) => ({ path, change, entries: describe(path) })) });
  }

  if (pathname === '/api/publish' && method === 'POST') {
    const { message, head } = await body<{ message?: string; head?: string }>(request);
    const { repo, changes } = await publishPlan(env);
    if (!changes.length) throw new HttpError(409, '没有需要发布的改动。');
    if (head && head !== repo.head) throw new HttpError(409, '仓库在你预览之后有了新提交，请刷新后再发布。');
    const text = `content: ${String(message || '').trim() || `后台发布 ${changes.length} 个文件`}\n\n由 Wenworks AI 管理后台发布（${user}）。`;
    const sha = await commitChanges(env, repo.head, repo.tree, changes, text);
    await env.DB.prepare('INSERT INTO publishes (published_at, published_by, commit_sha, message, files) VALUES (?, ?, ?, ?, ?)')
      .bind(now, user, sha, String(message || ''), JSON.stringify(changes.map(({ path, change }) => ({ path, change }))))
      .run();
    return json({ sha, files: changes.length, url: `https://github.com/${env.GITHUB_REPO}/commit/${sha}` });
  }

  if (pathname === '/api/publishes' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM publishes ORDER BY id DESC LIMIT 50').all();
    return json(results.map((r: any) => ({ ...r, files: JSON.parse(r.files) })));
  }

  if (pathname === '/api/status') {
    return json({ repo: env.GITHUB_REPO, branch: env.GITHUB_BRANCH, site: env.SITE_URL, githubToken: Boolean(env.GITHUB_TOKEN), access: Boolean(env.ACCESS_AUD), dev: Boolean(env.DEV_USER) });
  }

  throw new HttpError(404, '没有这个接口。');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    const user = await currentUser(request, env);
    if (!user) return json({ error: '需要登录。' }, 401);
    try {
      return await api(request, env, user, url);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      console.error(error);
      return json({ error: '服务器出错了，请稍后再试。' }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
