import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

/**
 * 工具精选是 Wenworks AI 这一个站里的 /tools/ 部分（https://ai.wenworks.app/tools/）。
 * 整个站由仓库根目录的 scripts/build-all.mjs 拼起来，所以这里固定带 basePath。
 * 本地跑 Curator 或单独调试时可以用 BASE_PATH= 覆盖成空。
 */
const basePath = (process.env.BASE_PATH ?? "/tools").replace(/\/$/, "");

export default function config(phase: string): NextConfig {
  return {
    // Static export only for builds. With `output: "export"` the dev server
    // throws on any path that generateStaticParams did not list (for example a
    // mistyped detail slug) instead of rendering not-found. In dev,
    // `dynamicParams = false` already turns those into 404s; export-only
    // restrictions are still enforced by `next build` (Curator 构建校验 and CI).
    ...(phase === PHASE_DEVELOPMENT_SERVER ? {} : { output: "export" as const }),
    trailingSlash: true,
    images: { unoptimized: true },
    env: {
      NEXT_PUBLIC_BASE_PATH: basePath,
    },
    ...(basePath
      ? {
          basePath,
          assetPrefix: basePath,
        }
      : {}),
  };
}
