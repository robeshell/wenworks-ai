<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 维护说明（工具精选部分，/tools/）

这是 Wenworks AI（https://ai.wenworks.app）的 `/tools/` 部分，原名 Vectortrove。整站的结构、上线方式和检查命令见仓库根目录的 `AGENTS.md`；这里只写这个部分特有的规则。

## 最重要的一条：不要动内容数据链路

`data/`、`content/`、`public/logos/`、`public/covers/` 是 Curator 从 `.curator/content.sqlite` 导出的。这个数据库不在仓库里，只在站长的电脑上。

在没有这个数据库的环境里，**不要运行**下面任何一条，否则 `content/` 下除工具以外的内容会被清空：

- `npm run curator`、`npm run curator:server`
- `npm run curator:migrate`、`npm run curator:export`、`npm run curator:db:import`，以及它们带 `:check` 的版本
- 任何带 `--write` 的 `scripts/curator-*.mjs`

内容的增删改由站长在本地用 Curator 完成。在这个仓库里做的任务默认只改代码；除非站长明确要求，不要手改上面四个目录里的文件。

`npm test` 是安全的，测试都在临时目录里跑。

## 路径

- `next.config.ts` 固定 `basePath: /tools`。`next/link` 会自动加前缀；普通 `<a>`、`<img>` 和 `next/image` 的 `src` 不会，要自己加 `process.env.NEXT_PUBLIC_BASE_PATH`（`lib/logo.ts` 里有现成的写法）。
- `lib/seo.ts` 的 `SITE_URL` 以 `/tools` 结尾，绝对地址用 `absoluteUrl()` 拼，不要用 `new URL(path, SITE_URL)`，那样会把 `/tools` 丢掉。
- 页头里的品牌和三个入口是指向整站的普通链接，不要换成 `next/link`。
- 管理界面 `/tools/curator/` 只在本地用，整站构建时会从产物里删掉。
- 本地跑 Curator 或单独调试时，用 `BASE_PATH= npm run dev` 把前缀去掉。
- Curator 的「上线」按钮提交内容并推送到这个仓库，随后 `deploy.yml` 重新发布整个站。

## 语言和路由

- 中文在这个部分的根（`/tools/`，`app/(zh)/`），英文在 `/tools/en/`（`app/en/`）。两个目录里都是一两行的薄壳，实际内容在 `components/SiteRoutes.tsx`。
- 所有站内路径都通过 `lib/i18n.ts` 的 `localePath` 生成；canonical、hreflang、sitemap 也从它算。不要在别处写死 `/en/` 或 `/zh/`。
- 旧域名 `vectortrove.com`、`tools.wenworks.app` 都已经停用，没有跳转。

## 公开清单 /catalog.json

`app/catalog.json/route.ts` 在构建时生成 `out/catalog.json`（线上是 `/tools/catalog.json`），内容来自 `lib/catalog.ts`。首页的每周动态（`sites/home`）每周读取它，按 `id` 和上一期比对，找出新收录的条目。

- 清单里的条目必须和网站上显示的一致：五个板块、只含已发布的。
- **`id` 不能变。** 它用的是 Curator 的条目 id，改名、改 slug、换板块都不会变。不要把它换成 slug 或加前缀，否则周报会把旧条目当成新收录。
- 字段有增无减：周报依赖 `id`、`kind`、`title`、`summary`、`url`、`sourceUrl`。

## 视觉

规范在仓库根目录 `design/wenworks-ai-design.md`，Curator 界面沿用同一套。页头样式来自根目录的 `shared/site-header.css`，不要直接改 `app/globals.css` 里带标记的那一段。

## 改完要做的检查

```bash
npm run lint
npm test
npm run build
```

- 构建后 `out/` 里应该有 68 个页面；条目数是工具 8、站点 9、技能 6、开源项目 12、提示词 1，两种语言相同。数字随内容增减会变，但改代码的 PR 不应该让它变。
- 涉及页面的改动，用根目录的 `node scripts/build-all.mjs --only=tools` 拼进 `dist/` 再看：中文和英文两版、1280px 和 375px，并点一遍语言切换。
