import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { BRAND, SITE_NAME, SITE_URL } from "@/lib/seo";
import "./globals.css";
import "./catalog.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

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
    <html lang="zh-CN" className={`${plexSans.variable} ${plexMono.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        {children}
        {process.env.NODE_ENV === "production" ? (
          <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon={JSON.stringify({ token: BEACON_TOKEN })} />
        ) : null}
      </body>
    </html>
  );
}
