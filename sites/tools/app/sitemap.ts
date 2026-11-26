import type { MetadataRoute } from "next";
import { localePath } from "@/lib/i18n";
import { loadPublicContent } from "@/lib/public-content";
import { absoluteUrl, languageAlternates } from "@/lib/seo";
import { LOCALES } from "@/lib/types";
import { loadSite } from "@/lib/data";

// Static export: written once to out/sitemap.xml at build time.
export const dynamic = "force-static";

/**
 * Every public page in both languages, each listing its translation as an
 * hreflang alternate. Tools have no detail pages; moved-resource aliases are
 * left out because they only redirect.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    { path: "/", lastModified: loadSite().updatedAt, priority: 1 },
    ...loadPublicContent()
      .sort((a, b) => a.blockType.localeCompare(b.blockType) || a.slug.localeCompare(b.slug))
      .map((item) => ({ path: `/${item.blockType}s/${item.slug}/`, lastModified: undefined, priority: 0.7 })),
  ];
  return paths.flatMap(({ path, lastModified, priority }) =>
    LOCALES.map((locale) => ({
      url: absoluteUrl(localePath(locale, path)),
      ...(lastModified ? { lastModified } : {}),
      priority,
      alternates: { languages: languageAlternates(path) },
    })),
  );
}
