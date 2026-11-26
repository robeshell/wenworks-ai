"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, Burger, Drawer } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { BrandMark } from "@/components/BrandMark";
import { curatorRequest, type BuildJob } from "@/lib/curator-client";
import { useBuildJob } from "@/components/curator/useBuildJob";
import { ShipButton } from "@/components/curator/ShipButton";
import { useInboxCount } from "@/components/curator/useInboxCount";

const links = [
  { href: "/curator/", label: "收件箱", match: ["/curator/", "/curator/ingest/"], badge: true },
  { href: "/curator/resources/", label: "资源库", match: ["/curator/resources/", "/curator/editor/", "/curator/skills/", "/curator/projects/", "/curator/prompts/"] },
  { href: "/curator/settings/", label: "设置", match: ["/curator/settings/"] },
];

function pathMatches(pathname: string, link: (typeof links)[number]) {
  const current = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return link.match.some((prefix) => prefix === "/curator/" ? current === prefix : current.startsWith(prefix));
}

export function CuratorChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/curator/";
  const [service, setService] = useState<"checking" | "online" | "offline">("checking");
  const { build, setBuild } = useBuildJob();
  const [menuOpen, { open: openMenu, close: closeMenu }] = useDisclosure(false);
  const inboxCount = useInboxCount();

  useEffect(() => {
    let active = true;
    curatorRequest<{ ok: boolean; build?: BuildJob }>("/health")
      .then((payload) => {
        if (!active) return;
        setService("online");
        if (payload.build) setBuild(payload.build);
      })
      .catch(() => { if (active) setService("offline"); });
    return () => { active = false; };
  }, [setBuild]);

  const navigation = <nav className="curator-sidebar-nav" aria-label="工作区导航">
    {links.map((link) => <Link key={link.href} href={link.href} className="curator-sidebar-link"
      aria-current={pathMatches(pathname, link) ? "page" : undefined} onClick={closeMenu}>
      {link.label}{link.badge && inboxCount ? <span className="curator-nav-badge">{inboxCount}</span> : null}
    </Link>)}
  </nav>;

  return <div className="curator-root curator-workspace">
    <a className="curator-skip" href="#curator-main">跳到工作区</a>
    <aside className="curator-sidebar">
      <Link href="/curator/" className="curator-sidebar-brand"><BrandMark size={28} /><span>Wenworks AI<small>Curator</small></span></Link>
      {navigation}
      <div className="curator-sidebar-footer">
        <Link href="/" className="curator-sidebar-utility">查看公开站 <span aria-hidden="true">↗</span></Link>
        <div className="curator-service" data-state={service} role="status"><i aria-hidden="true" />{service === "online" ? "已连接" : service === "offline" ? "本地服务未启动" : "正在连接"}</div>
        {build.status === "running" ? <span className="curator-service">构建校验中…</span> : null}
      </div>
    </aside>
    <header className="curator-mobile-header"><Link href="/curator/" className="curator-sidebar-brand"><BrandMark size={26} /><span>Wenworks AI</span></Link><ShipButton /><Burger opened={menuOpen} onClick={menuOpen ? closeMenu : openMenu} size="sm" aria-label="菜单" /></header>
    <Drawer opened={menuOpen} onClose={closeMenu} title="Wenworks AI" position="left" size="xs">
      {navigation}<Link href="/" className="curator-sidebar-utility">查看公开站 ↗</Link>
    </Drawer>
    <main id="curator-main" tabIndex={-1} className="curator-workspace-main">
      {service === "offline" ? <Alert color="yellow" title="Curator 服务未启动" role="status" mb="md">运行 <code>npm run curator</code> 后重试。</Alert> : null}
      <div className="curator-topbar"><ShipButton /></div>
      <div className="curator-page-container">{children}</div>
    </main>
  </div>;
}
