// Build the whole site into dist/. Wenworks AI is one site made of four parts
// that are built separately and laid side by side:
//
//   /          sites/home    本周动态
//   /models/   sites/models  梯队榜、选型、价格
//   /agents/   sites/agents  Agent 官方文档导航
//   /tools/    sites/tools   工具精选
//
//   node scripts/build-all.mjs                 build everything
//   node scripts/build-all.mjs --only=home     build some parts (comma separated)
//   node scripts/build-all.mjs --collect       also collect this week's issue before building home
//   node scripts/build-all.mjs --week=2026-11-18   with --collect: the week containing that date
//   node scripts/build-all.mjs --hot           also refresh the front page's hot topics (Hacker News, GitHub) first
//
// PRODUCTION=1 turns the page-view beacon on. CHROME points at a Chrome binary
// for the agents prerender when `google-chrome` is not on the PATH.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const only = arg('only')?.split(',');
const wants = (part) => !only || only.includes(part);
const run = (cwd, command, args, env = {}) => {
  console.log(`\n[${path.relative(ROOT, cwd) || '.'}] ${command} ${args.join(' ')}`);
  execFileSync(command, args, { cwd, stdio: 'inherit', env: { ...process.env, ...env } });
};
const place = (from, to) => {
  fs.rmSync(to, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
};
const site = (name) => path.join(ROOT, 'sites', name);
const install = (dir) => {
  if (!fs.existsSync(path.join(dir, 'node_modules'))) run(dir, 'npm', ['ci']);
};

run(ROOT, 'node', ['scripts/sync-shared.mjs', '--check']);
fs.mkdirSync(DIST, { recursive: true });

if (wants('models')) {
  install(site('models'));
  run(site('models'), 'npm', ['run', 'build']);
  place(path.join(site('models'), 'out'), path.join(DIST, 'models'));
}

if (wants('tools')) {
  install(site('tools'));
  run(site('tools'), 'npm', ['run', 'build']);
  place(path.join(site('tools'), 'out'), path.join(DIST, 'tools'));
  // Curator is the local admin; it is never published.
  fs.rmSync(path.join(DIST, 'tools', 'curator'), { recursive: true, force: true });
}

if (wants('agents')) {
  run(site('agents'), 'node', ['scripts/build.mjs']);
  place(path.join(site('agents'), 'docs'), path.join(DIST, 'agents'));
}

if (wants('home')) {
  // The tools catalog is a build product; the home part reads the one just built when there is one.
  const catalog = path.join(DIST, 'tools', 'catalog.json');
  const env = fs.existsSync(catalog) ? { TOOLS_CATALOG_FILE: catalog } : {};
  if (process.argv.includes('--collect')) {
    const week = arg('week');
    run(site('home'), 'node', ['scripts/collect.mjs', ...(week ? [`--week=${week}`] : [])], env);
  }
  // A failed refresh keeps the items from last time, so it never stops the build.
  if (process.argv.includes('--hot')) run(site('home'), 'node', ['scripts/hot.mjs']);
  run(site('home'), 'node', ['scripts/build.mjs'], env);
  // The home part owns the root: copy its files in without touching the other parts.
  for (const entry of fs.readdirSync(path.join(site('home'), 'out'))) place(path.join(site('home'), 'out', entry), path.join(DIST, entry));
}

fs.writeFileSync(path.join(DIST, '.nojekyll'), '');
console.log(`\nbuilt ${only ? only.join(', ') : 'all four parts'} into dist/`);
