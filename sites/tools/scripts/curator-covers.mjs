import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { collectResourceCover } from "./curator-cover.mjs";
import { createContentRepository, openContentDb } from "./curator-db.mjs";
import { exportContent } from "./curator-export.mjs";

/**
 * Backfill cover images for published items.
 *
 *   npm run curator:covers                      # plan only
 *   npm run curator:covers -- --write           # capture missing covers
 *   npm run curator:covers -- --write --force   # recapture all
 *   npm run curator:covers -- --write --only claude,cursor
 *   npm run curator:covers -- --write --source claude=https://claude.com/
 *   npm run curator:covers -- --write --og hugeicons
 *
 * `--source` shoots a different page than the item's own link, for products
 * whose link is an app behind a login or bot wall. `--og` skips the screenshot
 * and uses the page's share image, for sites that refuse automated visits.
 * Neither is stored.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DB_FILE = path.resolve(process.env.CURATOR_CONTENT_DB || path.join(ROOT, ".curator", "content.sqlite"));
const COVER_BLOCKS = ["tool", "site", "skill", "project"];

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const values = (flag) => args.flatMap((arg, i) => (arg === flag && args[i + 1] ? [args[i + 1]] : []));
const write = has("--write");
const force = has("--force");
const only = new Set(values("--only").flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean));
const ogFirst = new Set(values("--og").flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean));
const sources = new Map(values("--source").map((v) => {
  const at = v.indexOf("=");
  return [v.slice(0, at), v.slice(at + 1)];
}));

export function coverPageUrl(item) {
  const p = item.payload || {};
  return p.url || item.sourceUrl || p.links?.find((l) => l.kind === "official" || l.kind === "repository")?.url || p.links?.[0]?.url || "";
}

async function main() {
  const db = await openContentDb({ file: DB_FILE });
  const repo = createContentRepository(db);
  const publishedRevision = new Map(db.prepare("SELECT item_id, revision_id FROM content_publications").all().map((r) => [r.item_id, Number(r.revision_id)]));

  const targets = [];
  for (const item of repo.list({ status: "active" })) {
    if (!COVER_BLOCKS.includes(item.blockType)) continue;
    if (only.size && !only.has(item.id) && !only.has(item.slug)) continue;
    if (item.payload.cover && !force) continue;
    const url = sources.get(item.id) || sources.get(item.slug) || coverPageUrl(item);
    if (!url) { console.log(`跳过 ${item.slug}：没有可截图的链接`); continue; }
    // Saving would publish any unpublished edits along with the cover.
    if (publishedRevision.get(item.id) !== item.revision?.id) { console.log(`跳过 ${item.slug}：有未发布的修改`); continue; }
    targets.push({ item, url, prefer: ogFirst.has(item.id) || ogFirst.has(item.slug) ? "og-image" : undefined });
  }

  if (!write) {
    for (const { item, url } of targets) console.log(`${item.blockType}\t${item.slug}\t${url}`);
    console.log(`\n共 ${targets.length} 条待采集。加 --write 执行。`);
    return;
  }

  const results = [];
  const queue = [...targets];
  await Promise.all(Array.from({ length: 3 }, async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const { item, url, prefer } = next;
      try {
        const { cover, method } = await collectResourceCover({ pageUrl: url, id: item.id, outputRoot: ROOT, prefer });
        results.push({ item, cover, method });
        console.log(`✓ ${item.slug}\t${method}\t${cover}`);
      } catch (error) {
        console.log(`✗ ${item.slug}\t${error.message}`);
      }
    }
  }));

  if (!results.length) return;
  repo.saveMany(results.map(({ item, cover }) => ({
    item: { ...item, payload: { ...item.payload, cover } },
    note: "采集封面图",
  })));
  await exportContent({ outputRoot: ROOT, dbFile: DB_FILE, write: true });
  console.log(`\n已保存 ${results.length} 条，失败 ${targets.length - results.length} 条，并已导出公开数据。`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
