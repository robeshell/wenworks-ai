import type { Metadata } from "next";
import { BRAND, SITE_NAME, SITE_URL } from "@/lib/seo";
import "./globals.css";
import "./catalog.css";

export const metadata: Metadata = {
  metadataBase: new URL(`${SITE_URL}/`),
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: `${BRAND} · %s`,
  },
  description: "做东西的人真正值得用的工具、素材、技能和开源项目，按用途整理。",
};

// Page views: the whole site (ai.wenworks.app) shares one Cloudflare Web Analytics
// token. The host is not proxied by Cloudflare, so the beacon is added here; it
// is left out of development builds.
const BEACON_TOKEN = "4dff1f86a3894509bbdf147ef75e6487";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Fonts load in the browser, like the other parts of the site; the build does not download them. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* This is the root layout of the App Router, so the font reaches every page; the rule is about pages/_document. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      </head>
      <body>
        {children}
        {process.env.NODE_ENV === "production" ? (
          <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon={JSON.stringify({ token: BEACON_TOKEN })} />
        ) : null}
      </body>
    </html>
  );
}
