// First deploy only: when the remote database has no entries yet, import the
// tools catalog from the repository. Later runs see entries and do nothing, so
// edits made in the admin are never overwritten.
import { execFileSync } from 'node:child_process';

const wrangler = (...args) => execFileSync('npx', ['wrangler', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
const out = JSON.parse(wrangler('d1', 'execute', 'wenworks-admin', '--remote', '--json', '--command', 'SELECT COUNT(*) AS n FROM entries'));
const n = out?.[0]?.results?.[0]?.n ?? 0;
if (n > 0) {
  console.log(`database already has ${n} entries; not importing`);
} else {
  execFileSync('node', ['scripts/seed.mjs'], { stdio: 'inherit' });
  wrangler('d1', 'execute', 'wenworks-admin', '--remote', '--yes', '--file', '.wrangler/seed.sql');
  console.log('imported the catalog from the repository');
}
