// Write seed.sql: the tools catalog as it is in the repository, for the admin's D1.
//
//   node scripts/seed.mjs                      writes .wrangler/seed.sql
//   npx wrangler d1 execute DB --local --file .wrangler/seed.sql
//   npx wrangler d1 execute DB --remote --file .wrangler/seed.sql   (once, on first deploy)
//
// It replaces what the tables hold, so run it only on an empty or throwaway database.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRepo } from './read-repo.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = path.resolve(HERE, '../.wrangler/seed.sql');

const q = (value) => `'${String(value).replaceAll("'", "''")}'`;
const { entries, aliases, taxonomy } = readRepo(ROOT);
const now = new Date().toISOString();
const lines = ['DELETE FROM entries;', 'DELETE FROM revisions;', 'DELETE FROM aliases;', "DELETE FROM settings WHERE key = 'taxonomy';"];
for (const e of entries) {
  lines.push(`INSERT INTO entries (id, kind, slug, title, status, category, tags, source_url, payload, sort_order, created_at, updated_at, updated_by) VALUES (${[e.id, e.kind, e.slug, e.title, e.status, e.category, JSON.stringify(e.tags), e.sourceUrl, JSON.stringify(e.payload)].map(q).join(', ')}, ${e.sortOrder}, ${q(now)}, ${q(now)}, ${q('导入')});`);
}
for (const a of aliases) lines.push(`INSERT INTO aliases (kind, slug, target_id) VALUES (${q(a.blockType)}, ${q(a.slug)}, ${q(a.targetId)});`);
lines.push(`INSERT INTO settings (key, value) VALUES ('taxonomy', ${q(taxonomy)});`);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, lines.join('\n') + '\n');
console.log(`seed.sql: ${entries.length} entries, ${aliases.length} aliases → ${path.relative(process.cwd(), OUT)}`);
