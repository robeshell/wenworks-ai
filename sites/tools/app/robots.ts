import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

// Static export: written once to out/robots.txt at build time. Cloudflare's
// managed content signals, if enabled on the zone, are added in front of it.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/curator/" },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
