// The header is the same on every part of the site. Its styles live once, in
// shared/site-header.css, and are copied into each part's stylesheet between
// two marker comments.
//
//   node scripts/sync-shared.mjs           copy the shared block into every part
//   node scripts/sync-shared.mjs --check   fail if any copy differs (used in CI)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const START = '/* ---- Wenworks AI 共用页头 ----';
const END = '/* ---- 共用页头结束 ---- */';
const TARGETS = ['sites/home/src/styles.css', 'sites/models/app/globals.css', 'sites/tools/app/globals.css', 'sites/agents/src/template.html'];

const shared = fs.readFileSync(path.join(ROOT, 'shared/site-header.css'), 'utf8').trim();
if (!shared.startsWith(START) || !shared.endsWith(END)) throw new Error('shared/site-header.css must start and end with its marker comments');

const check = process.argv.includes('--check');
let stale = 0;
for (const target of TARGETS) {
  const file = path.join(ROOT, target);
  const text = fs.readFileSync(file, 'utf8');
  const from = text.indexOf(START);
  const to = text.indexOf(END);
  if (from < 0 || to < 0) throw new Error(`${target} has no shared header block`);
  const next = text.slice(0, from) + shared + text.slice(to + END.length);
  if (next === text) continue;
  stale += 1;
  if (check) console.error(`${target}: header block differs from shared/site-header.css`);
  else {
    fs.writeFileSync(file, next);
    console.log(`updated ${target}`);
  }
}
if (check && stale) {
  console.error('Run: node scripts/sync-shared.mjs');
  process.exit(1);
}
if (!stale) console.log('shared header is in sync');
