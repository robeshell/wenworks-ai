// Collect one issue of the weekly digest: read the four public sources,
// compare them with the week before, and write data/issues/NNNN.json.
//
//   node scripts/collect.mjs                 the most recent complete week
//   node scripts/collect.mjs --week=2026-11-18   the week containing that date
//
// Every source is read on its own. If one fails, its section is marked failed
// and the others are still written. Nothing here needs a key or calls a model.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { articlesSection, modelsSection, toolsSection } from './lib/sections.mjs';
import { lastCompleteWeek, weekContaining } from './lib/week.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// The other three sections live next to this one in the same repository.
const MODELS_DIR = path.resolve(ROOT, process.env.MODELS_DIR || '../models');
const AGENTS_DIR = path.resolve(ROOT, process.env.AGENTS_DIR || '../agents');
// The tools catalog is a build product: read the freshly built file when there is one, else the live site.
const TOOLS_CATALOG_FILE = process.env.TOOLS_CATALOG_FILE || '';
const TOOLS_CATALOG_URL = process.env.TOOLS_CATALOG_URL || 'https://ai.wenworks.app/tools/catalog.json';

const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
};
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
};

export async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  const text = await response.text();
  if (!text.trim()) return [];
  return JSON.parse(text);
}

/** Runs one section; a failure is reported and kept out of the other sections. */
async function section(name, run) {
  try {
    return { status: 'ok', ...(await run()) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`::warning title=${name} skipped::${message}`);
    return { status: 'failed', error: message };
  }
}

function issueNumberFor(week, issuesDir) {
  const files = fs.existsSync(issuesDir) ? fs.readdirSync(issuesDir).filter((f) => /^\d{4}\.json$/.test(f)).sort() : [];
  const issues = files.map((f) => readJson(path.join(issuesDir, f), null)).filter(Boolean);
  const same = issues.find((issue) => issue.week?.isoWeek === week.isoWeek);
  if (same) return same.number; // building the same week again rewrites its issue
  return issues.reduce((max, issue) => Math.max(max, issue.number), 0) + 1;
}

async function main() {
  const weekArg = process.argv.find((arg) => arg.startsWith('--week='))?.slice(7);
  const now = new Date();
  const week = weekArg ? weekContaining(new Date(`${weekArg}T12:00:00+08:00`)) : lastCompleteWeek(now);
  if (Number.isNaN(new Date(week.start).getTime())) throw new Error(`--week=${weekArg} is not a date`);

  const issuesDir = path.join(ROOT, 'data', 'issues');
  const number = issueNumberFor(week, issuesDir);
  console.log(`Issue ${number}: ${week.label} (${week.isoWeek})`);

  const toolsSeenFile = path.join(ROOT, 'state', 'tools-seen.json');
  const articlesSeenFile = path.join(ROOT, 'state', 'articles-seen.json');

  const models = await section('models', async () => {
    const { diffTiers } = await import(pathToFileURL(path.join(MODELS_DIR, 'lib', 'tiers.ts')).href);
    const historyDir = path.join(MODELS_DIR, 'data', 'history');
    const snapshots = fs.readdirSync(historyDir).filter((f) => /^tiers-.*\.json$/.test(f)).map((f) => JSON.parse(fs.readFileSync(path.join(historyDir, f), 'utf8')));
    const popularity = readJson(path.join(MODELS_DIR, 'data', 'popularity.json'), null);
    return modelsSection({ snapshots, popularity, week, diffTiers });
  });

  const articles = await section('articles', async () => {
    const result = articlesSection({ articles: JSON.parse(fs.readFileSync(path.join(AGENTS_DIR, 'data', 'articles.json'), 'utf8')), seen: readJson(articlesSeenFile, null), week });
    writeJson(articlesSeenFile, result.seen);
    return { items: result.items };
  });

  const tools = await section('tools', async () => {
    const result = toolsSection({ catalog: TOOLS_CATALOG_FILE ? JSON.parse(fs.readFileSync(path.resolve(TOOLS_CATALOG_FILE), 'utf8')) : await fetchJson(TOOLS_CATALOG_URL), seen: readJson(toolsSeenFile, null), week });
    writeJson(toolsSeenFile, result.seen);
    return { baseline: result.baseline, total: result.total, items: result.items };
  });

  const issue = { number, week, generatedAt: now.toISOString(), models, articles, tools };
  const file = path.join(issuesDir, `${String(number).padStart(4, '0')}.json`);
  // Keep the first publication time when an issue is rebuilt, so its feed entry does not move.
  const existing = readJson(file, null);
  if (existing?.publishedAt) issue.publishedAt = existing.publishedAt;
  else issue.publishedAt = now.toISOString();
  writeJson(file, issue);
  console.log(`wrote ${path.relative(ROOT, file)}: models ${models.status}, articles ${articles.status}, tools ${tools.status}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
