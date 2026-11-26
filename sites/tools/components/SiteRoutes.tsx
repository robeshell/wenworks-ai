import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Board } from "@/components/Board";
import { PublicAlias } from "@/components/PublicAlias";
import { PublicContentPage } from "@/components/PublicContentPage";
import { PublicContentLoading } from "@/components/PublicContentLoading";
import { SiteChrome } from "@/components/SiteChrome";
import { loadResources } from "@/lib/data";
import { ui } from "@/lib/i18n";
import { publicAliases, publicAliasHref } from "@/lib/public-aliases";
import { loadPublicContent, loadPublicContentItem } from "@/lib/public-content";
import { absoluteUrl, BRAND, pageSeo, siteName } from "@/lib/seo";
import { text, type Locale } from "@/lib/types";

/*
 * Chinese lives at the site root and English under /en/. Both route trees
 * (app/(zh) and app/en) are thin files over these shared pieces, so the two
 * languages cannot drift apart.
 */

export function localeMetadata(locale: Locale): Metadata {
  const copy = locale === "zh"
    ? { description: "做东西的人真正值得用的工具、素材、技能和开源项目，按用途整理。" }
    : { description: "Useful tools, assets, skills, projects and prompts for people who make things, sorted by what they help you do." };
  return {
    // `absolute` keeps the home title free of the root template ("Wenworks AI ·
    // Wenworks AI · …"); the template is restated so detail pages keep the brand.
    title: { absolute: siteName(locale), template: `${BRAND} · %s` },
    description: copy.description,
    ...pageSeo({ locale, path: "/", ...copy }),
  };
}

export function LocaleShell({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <div lang={locale === "zh" ? "zh-CN" : "en"} className={locale === "zh" ? "locale-zh" : undefined}>
      <SiteChrome locale={locale}>{children}</SiteChrome>
    </div>
  );
}

export function CatalogHome({ locale }: { locale: Locale }) {
  const t = ui(locale);
  return (
    <>
      <h1 className="sr-only">{t.compactIntroTitle}</h1>
      <section id="catalog" aria-label={t.catalogKinds}>
        <Board tools={loadResources()} content={loadPublicContent()} locale={locale} />
      </section>
    </>
  );
}

type DetailBlock = "project" | "prompt" | "site" | "skill";
type SlugParams = { params: Promise<{ slug: string }> };

/** Everything a detail route file exports, for one block in one language. */
export function detailRoute(block: DetailBlock, locale: Locale) {
  return {
    generateStaticParams() {
      // `output: export` rejects an empty param list for a dynamic segment, so
      // an unpublished block prerenders one placeholder that hits notFound().
      const params = [...loadPublicContent(block), ...publicAliases(block)].map((item) => ({ slug: item.slug }));
      return params.length ? params : [{ slug: "__empty__" }];
    },
    async generateMetadata({ params }: SlugParams): Promise<Metadata> {
      const { slug } = await params;
      const alias = publicAliasHref(block, slug, locale);
      // Moved resources keep a redirect page; point crawlers at the new address.
      if (alias) return { robots: { index: false, follow: true }, alternates: { canonical: absoluteUrl(alias) } };
      const item = loadPublicContentItem(block, slug);
      if (!item) return { robots: { index: false } };
      const description = text(item.summary, locale);
      return {
        title: item.title,
        description,
        ...pageSeo({
          locale,
          path: `/${block}s/${item.slug}/`,
          title: item.title,
          description,
          type: "article",
          ...(item.cover ? { image: { url: item.cover, alt: item.title } } : {}),
        }),
      };
    },
    async Page({ params }: SlugParams) {
      const { slug } = await params;
      const alias = publicAliasHref(block, slug, locale);
      if (alias) return <PublicAlias href={alias} locale={locale} />;
      const item = loadPublicContentItem(block, slug);
      if (!item) notFound();
      return <PublicContentPage item={item} locale={locale} />;
    },
    Loading() {
      return <PublicContentLoading block={block} />;
    },
  };
}
