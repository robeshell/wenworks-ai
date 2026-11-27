// Wenworks AI admin API. Everything under /api/ needs a signed-in user; the rest
// of the paths are the interface's static files (dist/).
import { ASSET_PATH, EDITORIAL_FILE, KINDS, PICKS_FILE, assetRepoPath, entryFromDraft, entryIssues, normalizeDraft, picksFile, planPublishBySha, publicFiles, type Draft, type Entry, type Kind, type Pick, type Status } from '../shared/content.mjs';
import { draftFor, listModels } from './ai';
import { agentDocs, editorialForPublish, editorialPublished, getEditorial, reload as reloadEditorial, saveSections } from './editorial';
import { currentUser } from './auth';
import { aliasesForExport, allEntries, getEntry, saveStatements } from './db';
import type { Env } from './env';
import { HttpError, commitChanges, repoState } from './github';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const STATUSES: Status[] = ['draft', 'active', 'archived'];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

async function getSettings(env: Env): Promise<Record<string, string>> {
  const { results } = await env.DB.prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>();
  return Object.fromEntries(results.map((r) => [r.key, r.value]));
}

async function inboxRow(env: Env, id: number) {
  const r = await env.DB.prepare('SELECT * FROM inbox WHERE id = ?').bind(id).first<any>();
  return r ? { ...r, draft: r.draft ? JSON.parse(r.draft) : null } : null;
}

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
  const [entries, aliases, repo, picks, assets] = await Promise.all([
    allEntries(env.DB), aliasesForExport(env.DB), repoState(env),
    env.DB.prepare('SELECT * FROM picks').all<Pick>().then((r) => r.results),
    env.DB.prepare('SELECT path, data FROM assets').all<{ path: string; data: number[] | ArrayBuffer }>().then((r) => r.results),
  ]);
  const next: Record<string, string | Uint8Array> = { ...publicFiles(entries, aliases), [PICKS_FILE]: picksFile(picks) };
  // Uploaded images go in as they are; images already in the repository and unchanged drop out of the plan.
  const images: Record<string, string> = {};
  for (const a of assets) {
    const path = assetRepoPath(a.path);
    next[path] = new Uint8Array(a.data);
    if (path in repo.images) images[path] = repo.images[path];
  }
  // The agents' editorial file goes only when it was edited here, and never over a change made outside.
  const editorial = await editorialForPublish(env, repo.files[EDITORIAL_FILE]);
  if (editorial.content) next[EDITORIAL_FILE] = editorial.content;
  const current = { ...repo.files, ...images };
  if (!editorial.content) delete current[EDITORIAL_FILE];
  const changes = await planPublishBySha(next, current);
  const conflicts = editorial.conflict ? [{ path: EDITORIAL_FILE, reason: editorial.conflict }] : [];
  // Which entries each changed file comes from, so the page can name them.
  const byPath = new Map<string, { id: string; title: string; kind: Kind }[]>();
  for (const e of entries) {
    const md = `sites/tools/content/${e.kind}s/${e.slug}.md`;
    if (e.kind !== 'tool') byPath.set(md, [...(byPath.get(md) ?? []), { id: e.id, title: e.title, kind: e.kind }]);
  }
  for (const e of entries) for (const key of ['cover', 'logo']) {
    const img = e.payload[key];
    if (typeof img === 'string' && img) byPath.set(assetRepoPath(img), [...(byPath.get(assetRepoPath(img)) ?? []), { id: e.id, title: e.title, kind: e.kind }]);
  }
  byPath.set(EDITORIAL_FILE, []);
  return { repo, changes, conflicts, editorialContent: editorial.content, describe: (path: string) => byPath.get(path) ?? [] };
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
    const inbox = await env.DB.prepare("SELECT COUNT(*) AS n FROM inbox WHERE status IN ('new', 'drafted', 'failed')").first<{ n: number }>();
    return json({ counts, total: entries.length, todo, recent, lastPublish: last, editedSinceLastPublish: sinceLast, publishReady: Boolean(env.GITHUB_TOKEN), inbox: inbox?.n ?? 0 });
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

  // ---- images --------------------------------------------------------------
  const asset = pathname.match(/^\/api\/assets(\/(?:covers|logos)\/[^/]+)$/);
  if (asset) {
    const path = decodeURIComponent(asset[1]);
    if (!ASSET_PATH.test(path)) throw new HttpError(400, '图片路径不对：只能放在 /covers/ 或 /logos/ 下，扩展名是 webp、png、jpg 或 svg。');
    if (method === 'GET') {
      // D1 hands BLOB columns back as an array of byte values.
      const row = await env.DB.prepare('SELECT content_type, data FROM assets WHERE path = ?').bind(path).first<{ content_type: string; data: number[] | ArrayBuffer }>();
      // Not uploaded here: it is already on the site.
      if (!row) return Response.redirect(`${env.SITE_URL}/tools${path}`, 302);
      return new Response(new Uint8Array(row.data), { headers: { 'content-type': row.content_type, 'cache-control': 'private, max-age=300' } });
    }
    if (method === 'PUT') {
      const type = request.headers.get('content-type') || '';
      if (!/^image\/(webp|png|jpeg|svg\+xml)$/.test(type)) throw new HttpError(400, '只接受 webp、png、jpg 和 svg 图片。');
      const data = await request.arrayBuffer();
      if (!data.byteLength || data.byteLength > 1_500_000) throw new HttpError(400, '图片不能超过 1.5 MB。');
      await env.DB.prepare('INSERT INTO assets (path, content_type, data, size, created_at, created_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6) ON CONFLICT (path) DO UPDATE SET content_type = ?2, data = ?3, size = ?4, created_at = ?5, created_by = ?6')
        .bind(path, type, data, data.byteLength, now, user).run();
      return json({ path, size: data.byteLength });
    }
  }

  // ---- inbox ---------------------------------------------------------------
  if (pathname === '/api/inbox' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM inbox ORDER BY id DESC LIMIT 200').all<any>();
    return json(results.map((r) => ({ ...r, draft: r.draft ? JSON.parse(r.draft) : null })));
  }
  if (pathname === '/api/inbox' && method === 'POST') {
    const { urls, note } = await body<{ urls: string; note?: string }>(request);
    const list = [...new Set(String(urls || '').split(/\s+/).map((u) => u.trim()).filter((u) => /^https?:\/\/\S+$/.test(u)))].slice(0, 20);
    if (!list.length) throw new HttpError(400, '没有找到链接。每行一个，以 http 或 https 开头。');
    const entries = await allEntries(env.DB);
    const known = new Map<string, string>();
    for (const e of entries) for (const u of [e.payload.url, e.sourceUrl]) if (u) known.set(String(u).replace(/\/+$/, ''), e.title);
    const { results: open } = await env.DB.prepare("SELECT url FROM inbox WHERE status IN ('new', 'drafted', 'failed')").all<{ url: string }>();
    const queued = new Set(open.map((r) => r.url.replace(/\/+$/, '')));
    const added: string[] = [];
    const skipped: { url: string; reason: string }[] = [];
    for (const url of list) {
      const key = url.replace(/\/+$/, '');
      if (known.has(key)) skipped.push({ url, reason: `已经收录为「${known.get(key)}」` });
      else if (queued.has(key)) skipped.push({ url, reason: '已经在收件箱里' });
      else {
        await env.DB.prepare("INSERT INTO inbox (url, note, status, created_at, created_by, updated_at) VALUES (?, ?, 'new', ?, ?, ?)").bind(url, String(note || '').slice(0, 500), now, user, now).run();
        added.push(url);
      }
    }
    return json({ added, skipped });
  }
  const inboxItem = pathname.match(/^\/api\/inbox\/(\d+)\/(draft|accept|pick|dismiss)$/);
  if (inboxItem && method === 'POST') {
    const id = Number(inboxItem[1]);
    const item = await env.DB.prepare('SELECT * FROM inbox WHERE id = ?').bind(id).first<any>();
    if (!item) throw new HttpError(404, '收件箱里没有这一条。');
    const action = inboxItem[2];
    if (action === 'draft') {
      const settings = await getSettings(env);
      const tax = settings.taxonomy ? JSON.parse(settings.taxonomy) : { categories: [], tags: [] };
      const vocabulary = `二级分类（写入 category，必须且只能选一个，按板块）：\n${tax.categories.map((c: any) => `  ${c.id}（${c.label.zh}，用于 ${c.blocks.join('/')}）：${c.hint || ''}`).join('\n')}\n\n标签（写入 tags，平级多选）：\n${tax.tags.map((t: any) => `  ${t.id}（${t.label.zh}）：${t.hint || ''}`).join('\n')}`;
      const catalog = (await allEntries(env.DB)).map((e) => `- ${e.kind} ${e.slug}：${e.title} ${e.payload.url || e.sourceUrl || ''}`).join('\n');
      try {
        const { draft } = await draftFor(env, { url: item.url, note: item.note, model: settings.ai_model || '', vocabulary, catalog });
        await env.DB.prepare("UPDATE inbox SET status = 'drafted', draft = ?, error = '', updated_at = ? WHERE id = ?").bind(JSON.stringify(draft), now, id).run();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await env.DB.prepare("UPDATE inbox SET status = 'failed', error = ?, updated_at = ? WHERE id = ?").bind(message.slice(0, 500), now, id).run();
        throw error instanceof HttpError ? error : new HttpError(502, message);
      }
      return json(await inboxRow(env, id));
    }
    if (action === 'accept') {
      const { draft } = await body<{ draft: Draft }>(request);
      const entry = validate(entryFromDraft(normalizeDraft({ ...draft, name: draft.title, kind: draft.kind }, draft.url)), null);
      if (await getEntry(env.DB, entry.id)) throw new HttpError(409, `已经有地址名为 ${entry.id} 的条目了，改一个地址名再收录。`);
      const max = await env.DB.prepare('SELECT COALESCE(MAX(sort_order), 0) AS n FROM entries').first<{ n: number }>();
      entry.sortOrder = (max?.n ?? 0) + 1;
      await env.DB.batch([
        ...saveStatements(env.DB, null, entry, user, now),
        env.DB.prepare("UPDATE inbox SET status = 'accepted', entry_id = ?, draft = ?, updated_at = ? WHERE id = ?").bind(entry.id, JSON.stringify(draft), now, id),
      ]);
      return json({ entry: entry.id });
    }
    if (action === 'pick') {
      const { title, note, author } = await body<{ title?: string; note?: string; author?: string }>(request);
      const max = await env.DB.prepare('SELECT COALESCE(MAX(sort), 0) AS n FROM picks').first<{ n: number }>();
      await env.DB.batch([
        env.DB.prepare('INSERT INTO picks (url, title, author, note, date, sort, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(item.url, String(title || '').slice(0, 200), String(author || '').slice(0, 80), String(note || '').slice(0, 300), now.slice(0, 10), (max?.n ?? 0) + 1, now),
        env.DB.prepare("UPDATE inbox SET status = 'picked', updated_at = ? WHERE id = ?").bind(now, id),
      ]);
      return json(await inboxRow(env, id));
    }
    if (action === 'dismiss') {
      await env.DB.prepare("UPDATE inbox SET status = 'dismissed', updated_at = ? WHERE id = ?").bind(now, id).run();
      return json(await inboxRow(env, id));
    }
  }

  // ---- home picks ----------------------------------------------------------
  if (pathname === '/api/picks' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM picks ORDER BY sort, id').all();
    return json(results);
  }
  if (pathname === '/api/picks' && method === 'PUT') {
    // The whole list, in order: simplest for add, edit, delete and reorder from one page.
    const { picks } = await body<{ picks: Pick[] }>(request);
    if (!Array.isArray(picks) || picks.length > 50) throw new HttpError(400, '列表不对。');
    const clean = picks.map((p, i) => {
      if (!/^https?:\/\//.test(String(p.url || ''))) throw new HttpError(400, `第 ${i + 1} 条的链接不对。`);
      return [String(p.url), String(p.title || '').slice(0, 200), String(p.author || '').slice(0, 80), String(p.note || '').slice(0, 300), String(p.date || '').slice(0, 10), i];
    });
    await env.DB.batch([env.DB.prepare('DELETE FROM picks'), ...clean.map((c) => env.DB.prepare('INSERT INTO picks (url, title, author, note, date, sort, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(...c, now))]);
    return json({ saved: clean.length });
  }

  // ---- agents' editorial content -------------------------------------------
  if (pathname === '/api/editorial' && method === 'GET') return json(await getEditorial(env));
  if (pathname === '/api/editorial' && method === 'PUT') {
    const { sections } = await body<{ sections: Record<string, unknown> }>(request);
    await saveSections(env, sections ?? {}, user, now);
    return json(await getEditorial(env));
  }
  if (pathname === '/api/editorial/reload' && method === 'POST') {
    await reloadEditorial(env);
    return json(await getEditorial(env));
  }
  if (pathname === '/api/agents/docs' && method === 'GET') return json(await agentDocs(env));

  // ---- AI settings ---------------------------------------------------------
  if (pathname === '/api/settings/ai' && method === 'GET') {
    const s = await getSettings(env);
    return json({ model: s.ai_model || '', keyConfigured: Boolean(env.OPENROUTER_API_KEY) });
  }
  if (pathname === '/api/settings/ai' && method === 'PUT') {
    const { model } = await body<{ model: string }>(request);
    if (!/^[\w.:/-]{3,120}$/.test(String(model || ''))) throw new HttpError(400, '模型名不对。');
    await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('ai_model', ?1) ON CONFLICT (key) DO UPDATE SET value = ?1").bind(model).run();
    return json({ model });
  }
  if (pathname === '/api/models' && method === 'GET') return json(await listModels(env));

  if (pathname === '/api/publish' && method === 'GET') {
    const { repo, changes, conflicts, describe } = await publishPlan(env);
    return json({ head: repo.head, changes: changes.map(({ path, change }) => ({ path, change, entries: describe(path) })), conflicts });
  }

  if (pathname === '/api/publish' && method === 'POST') {
    const { message, head } = await body<{ message?: string; head?: string }>(request);
    const { repo, changes, editorialContent } = await publishPlan(env);
    if (!changes.length) throw new HttpError(409, '没有需要发布的改动。');
    if (head && head !== repo.head) throw new HttpError(409, '仓库在你预览之后有了新提交，请刷新后再发布。');
    const text = `content: ${String(message || '').trim() || `后台发布 ${changes.length} 个文件`}\n\n由 Wenworks AI 管理后台发布（${user}）。`;
    const sha = await commitChanges(env, repo.head, repo.tree, changes, text);
    if (editorialContent && changes.some((c) => c.path === EDITORIAL_FILE)) await editorialPublished(env, editorialContent);
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
    return json({ repo: env.GITHUB_REPO, branch: env.GITHUB_BRANCH, site: env.SITE_URL, githubToken: Boolean(env.GITHUB_TOKEN), openrouter: Boolean(env.OPENROUTER_API_KEY), access: Boolean(env.ACCESS_AUD), dev: Boolean(env.DEV_USER) });
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
