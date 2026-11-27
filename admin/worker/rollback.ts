// Rolling back a publish: put the files that publish changed back the way they
// were just before it, in the admin's database. Nothing is written to the
// repository here; the restored content goes out as an ordinary publish, so
// the branch only ever moves forward.
import {
  ALIASES_FILE, EDITORIAL_FILE, MARKDOWN_PATH, PICKS_FILE, TOOLS_FILE, TOOLS_ROOT,
  entryFromMarkdown, entryFromTool, type Entry,
} from '../shared/content.mjs';
import { allEntries, saveStatements } from './db';
import type { Env } from './env';
import { HttpError, gh } from './github';

type Record_ = { id: number; commit_sha: string; message: string; files: string };
type Changed = { path: string; change: string };

/** Which files a publish changed, and whether a later publish changed any of them. */
export async function rollbackCheck(env: Env, id: number) {
  const { results } = await env.DB.prepare('SELECT id, commit_sha, message, files FROM publishes WHERE id >= ? ORDER BY id').bind(id).all<Record_>();
  const record = results.find((r) => r.id === id);
  if (!record) throw new HttpError(404, '没有这次发布。');
  const files: Changed[] = JSON.parse(record.files);
  const paths = new Set(files.map((f) => f.path));
  const later = results.filter((r) => r.id > id && (JSON.parse(r.files) as Changed[]).some((f) => paths.has(f.path)));
  return { record, files, blockedBy: later.map((r) => r.id) };
}

/** A file as it was at a commit, or null when it did not exist there. */
async function fileAt(env: Env, path: string, ref: string): Promise<Uint8Array | null> {
  try {
    const body = await gh<{ content: string; encoding: string }>(env, `/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${ref}`);
    return Uint8Array.from(atob(body.content.replace(/\n/g, '')), (c) => c.charCodeAt(0));
  } catch (error) {
    if (error instanceof HttpError && /返回 404/.test(error.message)) return null;
    throw error;
  }
}

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

/**
 * Restores, in the database, every file the publish changed to its content in the
 * publish's parent commit. `pending` lists files with unpublished edits; those must
 * not be overwritten silently, so the caller refuses when they overlap.
 */
export async function rollback(env: Env, id: number, user: string, now: string, pending: string[]) {
  const { record, files, blockedBy } = await rollbackCheck(env, id);
  if (blockedBy.length) throw new HttpError(409, `这次发布之后又有发布改过同样的文件，回退会连带撤销那些修改。请从最近的一次开始回退。`);
  const overlap = files.map((f) => f.path).filter((p) => pending.includes(p));
  if (overlap.length) throw new HttpError(409, `这些文件有还没发布的改动，先发布或放弃它们再回退：${overlap.map((p) => p.replace(/^sites\//, '')).join('、')}`);

  const commit = await gh<{ parents: { sha: string }[] }>(env, `/git/commits/${record.commit_sha}`);
  const parent = commit.parents[0]?.sha;
  if (!parent) throw new HttpError(409, '这次发布没有上一个版本，无法回退。');

  const entries = await allEntries(env.DB);
  const byId = new Map(entries.map((e) => [e.id, e]));
  const statements: D1PreparedStatement[] = [];
  const touched = new Set<string>();
  const save = (before: Entry | null, after: Entry) => {
    // Same content (bookkeeping fields aside): leave it alone, no revision.
    const strip = (e: Entry) => JSON.stringify({ ...e, createdAt: 0, updatedAt: 0, updatedBy: 0, sortOrder: 0 });
    if (before && strip(before) === strip(after)) return;
    statements.push(...saveStatements(env.DB, before, { ...after, createdAt: before?.createdAt }, user, now));
    touched.add(after.id);
  };
  const summary = { entries: 0, drafted: 0, picks: false, editorial: false, images: 0 };

  // Files that existed before: take their content back.
  for (const f of files) {
    const before = await fileAt(env, f.path, parent);
    if (f.path === TOOLS_FILE) {
      if (!before) continue;
      const old = JSON.parse(text(before)).items.map((t: unknown, i: number) => entryFromTool(t, i));
      const oldIds = new Set(old.map((e: Entry) => e.id));
      for (const e of old) save(byId.get(e.id) ?? null, { ...e, sortOrder: byId.get(e.id)?.sortOrder ?? e.sortOrder });
      // Tools the publish brought in go back to being drafts.
      for (const e of entries) if (e.kind === 'tool' && !oldIds.has(e.id) && e.status !== 'draft') { save(e, { ...e, status: 'draft' }); summary.drafted += 1; }
    } else if (MARKDOWN_PATH.test(f.path)) {
      if (before) {
        const e = entryFromMarkdown(text(before), byId.get(entryFromMarkdown(text(before), 0).id)?.sortOrder ?? 0);
        save(byId.get(e.id) ?? null, e);
      } else {
        const [, kind, slug] = f.path.match(/content\/(\w+)s\/([a-z0-9-]+)\.md$/)!;
        const e = entries.find((x) => x.kind === kind && x.slug === slug);
        if (e && e.status === 'active') { save(e, { ...e, status: 'draft' }); summary.drafted += 1; }
      }
    } else if (f.path === PICKS_FILE) {
      const list = before ? (JSON.parse(text(before)) as { url: string; title?: string; author?: string; note?: string; date?: string }[]) : [];
      statements.push(env.DB.prepare('DELETE FROM picks'));
      list.forEach((p, i) => statements.push(env.DB.prepare('INSERT INTO picks (url, title, author, note, date, sort, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(p.url, p.title || '', p.author || '', p.note || '', p.date || '', i, now)));
      summary.picks = true;
    } else if (f.path === EDITORIAL_FILE) {
      if (!before) continue;
      const put = (k: string, v: string) => env.DB.prepare('INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT (key) DO UPDATE SET value = ?2').bind(k, v);
      const current = await env.DB.prepare("SELECT value FROM settings WHERE key = 'editorial'").first<{ value: string }>();
      if (current) statements.push(env.DB.prepare('INSERT INTO revisions (entry_id, saved_at, saved_by, snapshot) VALUES (?, ?, ?, ?)').bind('editorial', now, user, current.value));
      statements.push(put('editorial', text(before)), put('editorial_dirty', '1'), put('editorial_at', now), put('editorial_by', user));
      summary.editorial = true;
    } else if (f.path.startsWith(`${TOOLS_ROOT}/public/`)) {
      // A replaced image comes back; a newly added one simply stays unused in the repository.
      if (!before) continue;
      const path = f.path.slice(`${TOOLS_ROOT}/public`.length);
      const type = path.endsWith('.webp') ? 'image/webp' : path.endsWith('.png') ? 'image/png' : path.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg';
      statements.push(env.DB.prepare('INSERT INTO assets (path, content_type, data, size, created_at, created_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6) ON CONFLICT (path) DO UPDATE SET content_type = ?2, data = ?3, size = ?4, created_at = ?5, created_by = ?6').bind(path, type, before, before.byteLength, now, user));
      summary.images += 1;
    } else if (f.path === ALIASES_FILE) {
      // Old-address redirects follow the entries; nothing to restore on their own.
    }
  }
  summary.entries = touched.size;
  for (let i = 0; i < statements.length; i += 50) await env.DB.batch(statements.slice(i, i + 50));
  return { record: { id: record.id, sha: record.commit_sha, message: record.message }, ...summary };
}
