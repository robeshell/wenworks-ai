"use client";

import { useEffect, useState } from "react";
import { CatalogNavigation, useCatalog } from "@/components/CatalogNavigation";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { ui } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

// Shared Wenworks AI header: brand | 模型 · Agent 导航 · 工具精选 | this section's boards.
// Its styles come from shared/site-header.css at the repository root (scripts/sync-shared.mjs).
const SITES = [
  { href: "/models/", key: "siteModels", current: false },
  { href: "/agents/", key: "siteAgents", current: false },
  { href: "/tools/", key: "siteTools", current: true },
] as const;

export function SiteHeader({
  locale,
  pathname,
  isHome = false,
}: {
  locale: Locale;
  pathname: string;
  isHome?: boolean;
}) {
  const t = ui(locale);
  const { activeKind } = useCatalog();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="site-header" style={{ viewTransitionName: "site-header" }}>
      <div className="site-header-inner">
        {/* The brand goes to the home of the whole site, not of this section, so it is a plain link. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- "/" is the whole site's home, outside this app's basePath */}
        <a href="/" className="site-brand">
          {t.brand}
        </a>
        <nav className="site-switch" aria-label={t.siteSwitch}>
          {SITES.map((site) => (
            <a key={site.href} href={site.href} aria-current={site.current ? "page" : undefined}>
              {t[site.key]}
            </a>
          ))}
        </nav>
        <span className="site-sep" aria-hidden="true" />
        <CatalogNavigation locale={locale} isHome={isHome} open={open} onNavigate={() => setOpen(false)}>
          <LocaleSwitch locale={locale} pathname={isHome ? `${pathname}?kind=${activeKind}` : pathname} />
        </CatalogNavigation>
        <button
          type="button"
          className="site-menu-button"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((value) => !value)}
        >
          {t.menu}
        </button>
      </div>
    </header>
  );
}
