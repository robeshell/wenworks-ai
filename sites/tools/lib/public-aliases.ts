import fs from "node:fs";
import path from "node:path";
import type { CuratorIngestBlock } from "./curator-client";
import type { Locale } from "./types";
import { localePath } from "./i18n";

type Alias = { blockType: CuratorIngestBlock; slug: string; targetBlockType: CuratorIngestBlock; targetSlug: string; targetId: string };
export function publicAliases(block: string): Alias[] {
  const file = path.join(process.env.CURATOR_OUTPUT_ROOT || process.cwd(), "data", "route-aliases.json");
  if (!fs.existsSync(file)) return [];
  return (JSON.parse(fs.readFileSync(file, "utf8")) as Alias[]).filter((a) => a.blockType === block && (a.slug !== a.targetSlug || a.blockType !== a.targetBlockType));
}
export function publicAliasHref(block: string, slug: string, locale: Locale) {
  const alias = publicAliases(block).find((a) => a.slug === slug);
  if (!alias) return null;
  return alias.targetBlockType === "tool" ? localePath(locale, `/?kind=tool#resource-${encodeURIComponent(alias.targetId)}`) : localePath(locale, `/${alias.targetBlockType}s/${encodeURIComponent(alias.targetSlug)}/`);
}
