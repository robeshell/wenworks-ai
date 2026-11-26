"use client";

import { useEffect } from "react";
import { ViewTransition } from "react";
import { usePathname } from "next/navigation";
import { CatalogProvider } from "@/components/CatalogNavigation";
import { SiteHeader } from "@/components/SiteHeader";
import { loadSite } from "@/lib/data";
import { localePath, ui } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export function SiteChrome({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const t = ui(locale);
  const site = loadSite();
  const home = localePath(locale);
  const pathname = usePathname() || home;

  const isHome = pathname.replace(/\/$/, "") === home.replace(/\/$/, "");

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale]);

  return (
    <CatalogProvider>
    <div id="site-root" className={isHome ? "catalog-home" : undefined}>
      <a href="#main" className="skip-link">
        {t.skip}
      </a>
      <SiteHeader
        locale={locale}
        pathname={pathname}
        isHome={isHome}
      />
      <main
        id="main"
        className="site-content"
        style={{ scrollMarginTop: "var(--header-height)" }}
      >
        <ViewTransition
          key={pathname}
          enter={{
            "nav-forward": "nav-forward",
            "nav-back": "nav-back",
            default: "none",
          }}
          exit={{
            "nav-forward": "nav-forward",
            "nav-back": "nav-back",
            default: "none",
          }}
          default="none"
        >
          {children}
        </ViewTransition>
      </main>
      <footer className="site-footer">
        {isHome ? null : <span className="footer-note">{t.footerNote}</span>}
        <span className="footer-updated">{t.updatedLabel} {site.updatedAt.replaceAll("-", ".")}</span>
      </footer>
    </div>
    </CatalogProvider>
  );
}
