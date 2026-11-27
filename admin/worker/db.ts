import type { Entry, Kind, Status } from '../shared/content.mjs';

type Row = {
  id: string; kind: Kind; slug: string; title: string; status: Status; category: string; tags: string;
  source_url: string; payload: string; sort_order: number; created_at: string; updated_at: string; updated_by: string;
};

export const rowToEntry = (r: Row): Entry => ({
  id: r.id, kind: r.kind, slug: r.slug, title: r.title, status: r.status, category: r.category,
  tags: JSON.parse(r.tags || '[]'), sourceUrl: r.source_url, payload: JSON.parse(r.payload || '{}'),
  sortOrder: r.sort_order, createdAt: r.created_at, updatedAt: r.updated_at, updatedBy: r.updated_by,
});

export async function allEntries(db: D1Database): Promise<Entry[]> {
  const { results } = await db.prepare('SELECT * FROM entries ORDER BY sort_order, id').all<Row>();
  return results.map(rowToEntry);
}

export async function getEntry(db: D1Database, id: string): Promise<Entry | null> {
  const row = await db.prepare('SELECT * FROM entries WHERE id = ?').bind(id).first<Row>();
  return row ? rowToEntry(row) : null;
}

export async function aliasesForExport(db: D1Database) {
  const { results } = await db
    .prepare("SELECT a.kind, a.slug, a.target_id, e.kind AS target_kind, e.slug AS target_slug FROM aliases a JOIN entries e ON e.id = a.target_id WHERE e.status = 'active' ORDER BY a.rowid")
    .all<{ kind: string; slug: string; target_id: string; target_kind: string; target_slug: string }>();
  return results.map((a) => ({ blockType: a.kind, slug: a.slug, targetBlockType: a.target_kind, targetSlug: a.target_slug, targetId: a.target_id }));
}

/** The statements that save an entry and keep the previous version as a revision. */
export function saveStatements(db: D1Database, before: Entry | null, e: Entry, by: string, now: string) {
  const statements = [];
  if (before) statements.push(db.prepare('INSERT INTO revisions (entry_id, saved_at, saved_by, snapshot) VALUES (?, ?, ?, ?)').bind(e.id, now, by, JSON.stringify(before)));
  statements.push(
    db
      .prepare(
        `INSERT INTO entries (id, kind, slug, title, status, category, tags, source_url, payload, sort_order, created_at, updated_at, updated_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
         ON CONFLICT (id) DO UPDATE SET kind = ?2, slug = ?3, title = ?4, status = ?5, category = ?6, tags = ?7, source_url = ?8, payload = ?9, updated_at = ?12, updated_by = ?13`,
      )
      .bind(e.id, e.kind, e.slug, e.title, e.status, e.category, JSON.stringify(e.tags), e.sourceUrl, JSON.stringify(e.payload), e.sortOrder, e.createdAt || now, now, by),
  );
  return statements;
}
