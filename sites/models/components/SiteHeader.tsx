"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// 共用页头：Wenworks AI ｜ 模型 · Agent 导航 · 工具精选 ｜ 本部分的栏目。
// 样式来自仓库根目录的 shared/site-header.css，由 scripts/sync-shared.mjs 同步进 globals.css。
const sites = [
  { href: "/models/", label: "模型", current: true },
  { href: "/agents/", label: "Agent 导航", current: false },
  { href: "/tools/", label: "工具精选", current: false },
] as const;

const links = [
  { href: "/", label: "梯队榜", key: "tiers" },
  { href: "/pick", label: "选型", key: "pick" },
  { href: "/models", label: "模型目录", key: "models" },
  { href: "/rankings", label: "模型评测", key: "rankings" },
  { href: "/popularity", label: "使用排行", key: "popularity" },
  { href: "/custom-ranking", label: "自定义榜单", key: "custom-ranking" },
] as const;

export function SiteHeader({
  active,
}: {
  active?: "tiers" | "pick" | "models" | "prices" | "rankings" | "popularity" | "custom-ranking";
}) {
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
    <header className="site-header">
      <div className="site-header-inner">
        {/* 品牌回到整个站的首页，不是模型这一部分的首页，所以用普通链接（Link 会自动加上 /models）。 */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- "/" is the whole site's home, outside this app's basePath */}
        <a href="/" className="site-brand">
          Wenworks AI
        </a>
        <nav className="site-switch" aria-label="Wenworks AI 站点">
          {sites.map((site) => (
            <a
              key={site.href}
              href={site.href}
              aria-current={site.current ? "page" : undefined}
            >
              {site.label}
            </a>
          ))}
        </nav>
        <span className="site-sep" aria-hidden="true" />
        <nav
          id="site-nav"
          className="site-nav"
          aria-label="本站栏目"
          data-open={open}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active === link.key ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          className="site-menu-button"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((value) => !value)}
        >
          菜单
        </button>
      </div>
    </header>
  );
}
