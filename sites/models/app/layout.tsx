import type { Metadata } from "next";
import "./globals.css";

// Absolute site URL (set by the Pages workflow). Link previews on X need an
// absolute image URL, so the share card is only declared when it is known.
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
const shareImage = siteUrl ? `${siteUrl}/share/tiers-latest.png` : null;

export const metadata: Metadata = {
  title: {
    default: "Wenworks AI · 大模型梯队榜",
    template: "Wenworks AI · %s",
  },
  description: "大模型梯队榜：按与榜首的差距分档，同档按价格排，附价格与使用热度",
  ...(shareImage
    ? {
        openGraph: {
          title: "大模型梯队榜",
          description: "按与榜首的差距每 5 分一档，同档按价格从低到高",
          images: [{ url: shareImage, width: 1200, height: 675 }],
        },
        twitter: {
          card: "summary_large_image",
          title: "大模型梯队榜",
          images: [shareImage],
        },
      }
    : {}),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className="h-full"
      suppressHydrationWarning
    >
      <head>
        {/* Fonts load in the browser, like the other parts of the site; the build does not download them. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* This is the root layout of the App Router, so the font reaches every page; the rule is about pages/_document. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
      </head>
      <body className="min-h-full font-sans antialiased">
        {children}
        {process.env.NODE_ENV === "production" ? (
          // Cloudflare Web Analytics (site: ai.wenworks.app, shared by every part of the site). No cookies.
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon='{"token": "4dff1f86a3894509bbdf147ef75e6487"}'
          />
        ) : null}
      </body>
    </html>
  );
}
