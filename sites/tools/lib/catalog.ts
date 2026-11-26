import { loadResources } from "./data";
import { localePath } from "./i18n";
import { loadPublicContent } from "./public-content";
import { absoluteUrl } from "./seo";
import type { Localized } from "./types";

/**
 * The public list served at /catalog.json. The Wenworks AI weekly digest reads
 * it every week and compares ids with the week before to find new entries, so:
 *
 * - it holds exactly what the site shows: the five boards, published entries only;
 * - an entry's `id` must never change. It is the Curator id, which stays the
 *   same when an entry is renamed, re-slugged or moved to another board.
 */
export type CatalogItem = {
  id: string;
  kind: "tool" | "site" | "skill" | "project" | "prompt";
  slug: string;
  category: string;
  tags: string[];
  title: Localized;
  /** The one line shown on the entry's card. */
  summary: Localized;
  /** Chinese page for the entry on this site. Tools have no page of their own, so theirs is the board. */
  url: string;
  /** Official site or repository. */
  sourceUrl: string | null;
};

export type Catalog = { updatedAt: string; items: CatalogItem[] };

const KIND_ORDER: CatalogItem["kind"][] = ["tool", "site", "skill", "project", "prompt"];

export function buildCatalog(now = new Date()): Catalog {
  const tools: CatalogItem[] = loadResources().map((tool) => ({
    id: tool.id,
    kind: "tool",
    slug: tool.slug,
    category: tool.category,
    tags: tool.tags,
    title: { zh: tool.name, en: tool.name },
    summary: tool.verdict,
    url: absoluteUrl(localePath("zh", `/?kind=tool#resource-${encodeURIComponent(tool.id)}`)),
    sourceUrl: tool.url || null,
  }));

  const content: CatalogItem[] = loadPublicContent().map((item) => ({
    id: item.id,
    kind: item.blockType,
    slug: item.slug,
    category: item.category,
    tags: item.tags,
    title: { zh: item.title, en: item.title },
    summary: item.summary,
    url: absoluteUrl(localePath("zh", `/${item.blockType}s/${item.slug}/`)),
    sourceUrl: item.sourceUrl || item.url || null,
  }));

  const items = [...tools, ...content].sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.id.localeCompare(b.id),
  );

  // The digest keys on id alone; two entries sharing one would hide a new entry.
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) throw new Error(`catalog.json: id "${item.id}" is used by more than one entry`);
    seen.add(item.id);
  }

  return { updatedAt: now.toISOString(), items };
}
