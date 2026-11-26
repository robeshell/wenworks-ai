"use client";

import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRovingKeys } from "@/components/Transitions";
import { localePath, ui } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export type PublicBoard = "tool" | "site" | "skill" | "project" | "prompt";

function boardFromLocation(): PublicBoard {
  const kind = new URLSearchParams(window.location.search).get("kind");
  return kind === "site" || kind === "skill" || kind === "project" || kind === "prompt" ? kind : "tool";
}

const CatalogContext = createContext<{
  activeKind: PublicBoard;
  selectKind: (kind: PublicBoard) => void;
} | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [activeKind, setActiveKind] = useState<PublicBoard>("tool");
  const pathname = usePathname();

  // Restore before paint: after a client navigation back to the gallery the
  // first frame must already show the board named in the URL, not the default.
  useLayoutEffect(() => {
    const restore = () => {
      setActiveKind(boardFromLocation());
      document.documentElement.removeAttribute("data-pending-board");
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [pathname]);

  function selectKind(kind: PublicBoard) {
    setActiveKind(kind);
    const url = new URL(window.location.href);
    url.searchParams.set("kind", kind);
    url.searchParams.delete("category");
    url.hash = "";
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  return <CatalogContext.Provider value={{ activeKind, selectKind }}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) throw new Error("Catalog components require CatalogProvider");
  return context;
}

const BOARD_SEGMENTS: Record<string, PublicBoard> = { sites: "site", skills: "skill", projects: "project", prompts: "prompt" };

/** Board tabs on the gallery; the same five entries as links on reading pages,
 *  so the header is identical everywhere and never jumps between pages. The
 *  children (the language switch) sit at the far end of the same row. */
export function CatalogNavigation({
  locale,
  isHome = true,
  open = false,
  onNavigate,
  children,
}: {
  locale: Locale;
  isHome?: boolean;
  open?: boolean;
  onNavigate?: () => void;
  children?: ReactNode;
}) {
  const { activeKind, selectKind } = useCatalog();
  const pathname = usePathname() || "";
  const barRef = useRef<HTMLDivElement>(null);
  useRovingKeys(barRef);
  const t = ui(locale);
  const kinds: Array<{ kind: PublicBoard; label: string }> = [
    { kind: "tool", label: t.kindTool },
    { kind: "site", label: t.kindSite },
    { kind: "skill", label: t.kindSkill },
    { kind: "project", label: t.kindOpenSource },
    { kind: "prompt", label: t.kindPrompt },
  ];

  if (!isHome) {
    // Chinese paths start with the board (/projects/x/), English ones with /en/.
    const segments = pathname.split("/").filter(Boolean);
    const current = BOARD_SEGMENTS[segments[locale === "en" ? 1 : 0] ?? ""];
    return (
      <nav id="site-nav" className="site-nav" aria-label={t.catalogKinds} data-open={open}>
        {kinds.map(({ kind, label }) => (
          <Link
            key={kind}
            href={localePath(locale, `/?kind=${kind}`)}
            aria-current={kind === current ? "page" : undefined}
            transitionTypes={["nav-back"]}
            onClick={onNavigate}
          >
            {label}
          </Link>
        ))}
        {children ? <span className="site-nav-end">{children}</span> : null}
      </nav>
    );
  }

  return (
    <nav id="site-nav" className="site-nav" aria-label={t.catalogKinds} data-open={open}>
      <div ref={barRef} className="site-nav-tabs" role="tablist" aria-label={t.catalogKinds}>
        {kinds.map(({ kind, label }) => (
          <button
            key={kind}
            id={`catalog-tab-${kind}`}
            type="button"
            role="tab"
            aria-selected={activeKind === kind}
            aria-controls="catalog-panel"
            tabIndex={activeKind === kind ? 0 : -1}
            onClick={() => {
              selectKind(kind);
              onNavigate?.();
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {children ? <span className="site-nav-end">{children}</span> : null}
    </nav>
  );
}
