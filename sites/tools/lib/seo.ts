import type { Metadata } from "next";
import { localePath } from "./i18n";
import { LOCALES, type Locale } from "./types";

/**
 * Absolute origin for canonical links, hreflang alternates, Open Graph and the
 * sitemap. Crawlers and link previews need full URLs; override with
 * NEXT_PUBLIC_SITE_URL for a preview deployment.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://ai.wenworks.app/tools").replace(/\/$/, "");
/** Brand shared by the three Wenworks AI sites; page titles read "Wenworks AI · <page>". */
export const BRAND = "Wenworks AI";
export const SITE_NAME = "Wenworks AI · 工具精选";
const SITE_NAME_BY_LOCALE: Record<Locale, string> = { zh: SITE_NAME, en: "Wenworks AI · Tools" };

export function siteName(locale: Locale): string {
  return SITE_NAME_BY_LOCALE[locale];
}

/** Shared share card for pages without a cover of their own (public/og.png). */
export const DEFAULT_OG_IMAGE = { url: "/og.png", width: 1200, height: 630, alt: SITE_NAME };

const HREFLANG: Record<Locale, string> = { en: "en", zh: "zh-CN" };
const OG_LOCALE: Record<Locale, string> = { en: "en_US", zh: "zh_CN" };

export function absoluteUrl(path: string): string {
  // SITE_URL ends in /tools; resolving "/x" against it with new URL() would drop that part.
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** hreflang map for a locale-neutral path such as "/" or "/projects/comfyui/". */
export function languageAlternates(path: string): Record<string, string> {
  return {
    ...Object.fromEntries(LOCALES.map((locale) => [HREFLANG[locale], absoluteUrl(localePath(locale, path))])),
    "x-default": absoluteUrl(localePath("zh", path)),
  };
}

type PageSeo = {
  locale: Locale;
  /** Locale-neutral path, e.g. "/" or "/sites/21st/". */
  path: string;
  title?: string;
  description: string;
  image?: { url: string; width?: number; height?: number; alt: string };
  type?: "website" | "article";
};

/**
 * Canonical, hreflang, Open Graph and Twitter fields for one page. Next merges
 * metadata shallowly per key, so every page sets these objects in full.
 */
export function pageSeo({ locale, path, title, description, image = DEFAULT_OG_IMAGE, type = "website" }: PageSeo): Metadata {
  const url = absoluteUrl(localePath(locale, path));
  const ogTitle = title ? `${BRAND} · ${title}` : siteName(locale);
  return {
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      type,
      url,
      siteName: siteName(locale),
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((other) => other !== locale).map((other) => OG_LOCALE[other]),
      title: ogTitle,
      description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [image.url],
    },
  };
}
