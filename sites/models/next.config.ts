import type { NextConfig } from "next";

/**
 * 模型站是 Wenworks AI 这一个站里的 /models/ 部分（https://ai.wenworks.app/models/）。
 * 整个站由仓库根目录的 scripts/build-all.mjs 拼起来，所以这里固定带 basePath。
 * 单独调试时可以用 BASE_PATH= 覆盖成空。
 */
const basePath = (process.env.BASE_PATH ?? "/models").replace(/\/$/, "");
const siteUrl = (process.env.SITE_URL || "https://ai.wenworks.app/models").replace(/\/$/, "");

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_SITE_URL: siteUrl,
  },
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
