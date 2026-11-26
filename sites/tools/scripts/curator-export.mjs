import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createContentRepository, importLegacyCatalog, openContentDb } from "./curator-db.mjs";
import { attributeTags, categoryOf } from "./curator-tags.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DB_FILE = path.resolve(process.env.CURATOR_CONTENT_DB || path.join(ROOT, ".curator", "content.sqlite"));

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function legacyTool(item) {
  const payload = item.payload || {};
  return {
    id: item.id,
    slug: item.slug,
    name: item.title,
    url: String(payload.url || item.sourceUrl || ""),
    ...(payload.logo ? { logo: payload.logo } : {}),
    ...(payload.cover ? { cover: payload.cover } : {}),
    category: categoryOf(item),
    tags: attributeTags(item.tags || []),
    status: item.status,
    verdict: { zh: payload.tagline?.zh || payload.summary?.zh || "", en: payload.tagline?.en || payload.summary?.en || "" },
    summary: payload.summary,
    ...(payload.description ? { description: payload.description } : {}),
  };
}

function markdownDocument(item) {
  const payload = item.payload || {};
  const frontmatter = {
    id: item.id,
    slug: item.slug,
    blockType: item.blockType,
    title: item.title,
    status: item.status,
    category: categoryOf(item),
    tags: attributeTags(item.tags || []),
    ...(item.sourceUrl ? { sourceUrl: item.sourceUrl } : {}),
    payload,
  };
  // frontmatter 里两种语言都在；`---` 之后只写中文正文，让文件在编辑器里仍然可读。
  const body = typeof payload.body === "object" ? payload.body?.zh : payload.body;
  return `---\n${JSON.stringify(frontmatter, null, 2)}\n---\n\n${String(body || "").trim()}\n`;
}

async function ensureDb(file) {
  try {
    await fs.access(file);
  } catch {
    await importLegacyCatalog({ file, dryRun: false });
  }
  return openContentDb({ file });
}

export async function exportContent({ outputRoot = ROOT, dbFile = DB_FILE, includeDrafts = false, write = false } = {}) {
  const db = await ensureDb(dbFile);
  try {
  const repository = createContentRepository(db);
  const items = includeDrafts ? repository.list() : repository.published();
  // Drafts stay in SQLite. tools.json is a public artefact (and the cold-start
  // import source), so a rule-fallback draft must never land in it — the site
  // publishes every non-archived entry it finds there.
  const published = (item) => includeDrafts || item.status !== "draft";
  const tools = items.filter((item) => item.blockType === "tool" && published(item));
  const longForm = items.filter((item) => item.blockType !== "tool" && (includeDrafts || item.status === "active"));
  const aliases = repository.routeAliases().filter((a) => a.target.status === "active").map((a) => ({ blockType: a.blockType, slug: a.slug, targetBlockType: a.target.blockType, targetSlug: a.target.slug, targetId: a.itemId }));
  const files = [
    { path: path.join(outputRoot, "data/route-aliases.json"), content: `${JSON.stringify(aliases, null, 2)}\n` },
    { path: path.join(outputRoot, "data/tools.json"), content: `${JSON.stringify({ items: tools.map(legacyTool) }, null, 2)}\n` },
    ...longForm.map((item) => ({
      path: path.join(outputRoot, "content", `${item.blockType}s`, `${item.slug}.md`),
      content: markdownDocument(item),
    })),
  ];
  if (write) {
    // Preflight every output before touching any file. A failed export keeps the
    // saved publication in SQLite and can be retried after resolving conflicts.
    const manifestPath = path.join(outputRoot, ".curator", "export-manifest.json");
    const readManifest = (file) => fs.readFile(file, "utf8").then(JSON.parse).catch((error) => { if (error.code === "ENOENT") return {}; throw error; });
    const manifest = await readManifest(manifestPath);
    const journalPath = path.join(outputRoot, ".curator", "export-pending.json");
    const journal = await readManifest(journalPath);
    const hash = (text) => createHash("sha256").update(text).digest("hex");
    const changed = new Set();
    let git = false;
    try {
      const { stdout } = await promisify(execFile)("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--", "data", "content"], { cwd: outputRoot });
      git = true;
      for (const line of stdout.split("\0")) if (line) changed.add(line.slice(3));
    } catch { /* Standalone exports rely on the manifest. */ }
    const next = {}, conflicts = [];
    for (const file of files) {
      const relative = path.relative(outputRoot, file.path);
      const existing = await fs.readFile(file.path, "utf8").catch((error) => { if (error.code === "ENOENT") return null; throw error; });
      if (existing !== null && existing !== file.content && hash(existing) !== journal[relative] && (manifest[relative] ? hash(existing) !== manifest[relative] : !git || changed.has(relative))) conflicts.push(relative);
      next[relative] = hash(file.content);
    }
    const stale = [];
    // A first export after migration has no manifest yet. Known old routes and
    // archived publications are still owned outputs, but only clean files can
    // be removed. Unknown files in the same directories are never enumerated.
    const obsolete = [...repository.routeAliases().map((a) => ({ blockType: a.blockType, slug: a.slug, id: a.itemId })), ...items.filter((i) => i.status === "archived")];
    const prior = { ...manifest, ...journal };
    for (const item of obsolete) {
      if (item.blockType === "tool") continue;
      const relative = `content/${item.blockType}s/${item.slug}.md`;
      if (relative in next || relative in prior) continue;
      const existing = await fs.readFile(path.join(outputRoot, relative), "utf8").catch((error) => { if (error.code === "ENOENT") return null; throw error; });
      if (existing === null) continue;
      let owner;
      try { owner = JSON.parse(existing.match(/^---\n([\s\S]*?)\n---/)?.[1] || "{}").id; } catch { /* Invalid metadata is not safe to remove. */ }
      if (!git || changed.has(relative) || owner !== item.id) conflicts.push(relative);
      else prior[relative] = hash(existing);
    }
    for (const [relative, expected] of Object.entries(prior)) {
      if (relative in next || !/^(content\/(skills|projects|sites|prompts|courses|articles)\/[a-z0-9-]+\.md|data\/(tools|route-aliases)\.json)$/.test(relative)) continue;
      const existing = await fs.readFile(path.join(outputRoot, relative), "utf8").catch(() => null);
      if (existing !== null && hash(existing) !== expected && hash(existing) !== manifest[relative]) conflicts.push(relative);
      else if (existing !== null) stale.push(relative);
    }
    if (conflicts.length) { throw new Error(`公开文件存在未合并修改，已保留所有文件：${conflicts.join("、")}`); }
    await fs.mkdir(path.dirname(manifestPath), { recursive: true });
    await fs.writeFile(`${journalPath}.tmp`, JSON.stringify(next, null, 2));
    await fs.rename(`${journalPath}.tmp`, journalPath);
    for (const file of files) {
      await fs.mkdir(path.dirname(file.path), { recursive: true });
      const temporary = `${file.path}.curator-${process.pid}.tmp`;
      await fs.writeFile(temporary, file.content, "utf8");
      await fs.rename(temporary, file.path);
    }
    for (const relative of stale) await fs.rm(path.join(outputRoot, relative));
    await fs.mkdir(path.dirname(manifestPath), { recursive: true });
    await fs.writeFile(`${manifestPath}.tmp`, JSON.stringify(next, null, 2));
    await fs.rename(`${manifestPath}.tmp`, manifestPath);
    await fs.rm(journalPath, { force: true });
  }
  return {
    write,
    outputRoot,
    source: dbFile,
    items: items.length,
    tools: tools.length,
    longForm: longForm.length,
    draftsIncluded: includeDrafts,
    files: files.map((file) => path.relative(outputRoot, file.path)),
  };
  } finally { db.close(); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  exportContent({
    outputRoot: path.resolve(argValue("--out-dir", ROOT)),
    includeDrafts: process.argv.includes("--include-drafts"),
    write: process.argv.includes("--write"),
  })
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      if (!result.write) console.log("Dry run only. Use --write to update export files.");
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
