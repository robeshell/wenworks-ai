<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 维护说明（模型部分，/models/）

这是 Wenworks AI（https://ai.wenworks.app）的 `/models/` 部分。整站的结构、上线方式和检查命令见仓库根目录的 `AGENTS.md`；这里只写这个部分特有的规则。

## 路径

- `next.config.ts` 固定 `basePath: /models`。`next/link` 会自动加前缀；普通 `<a>`、`<img>`、`history.replaceState` 不会，要用 `process.env.NEXT_PUBLIC_BASE_PATH` 或 `window.location.pathname`。
- 页头里的品牌和三个入口是指向整站的普通链接（`/`、`/models/`、`/agents/`、`/tools/`），不要换成 `next/link`。
- 数据由仓库根目录的 `.github/workflows/refresh-models.yml` 每天刷新两次并提交。

## 数据

- `data/*.json`、`data/history/`、`data/tier-post.txt` 都由 `scripts/` 生成，不要手改。
- Artificial Analysis 的免费 API 每天只能请求 100 次，定时任务已经在用这个额度。没有必要不要在本地或 CI 里额外跑 `npm run fetch`，它还需要 `AA_API_KEY`。
- 免费 API 不给新模型的上下文长度和单项基准分，这些字段是 `null`。任何排序、打分、展示都不能把 `null` 当成 0；缺分时退回综合分，并在界面上标"暂无该项评测"。
- Coding 和 Agentic 两项指数 Artificial Analysis 已经停发，现在全部为空。

## 代码约定

- 梯队规则在 `lib/tiers.ts`（每 5 分一档，同档按混合单价排）。这个文件不能有运行时 import，数据脚本用 Node 直接加载它。
- 选型逻辑在 `lib/pick.ts`，全部在浏览器里算，不加后端或 API 路由。它用带 `.ts` 后缀的相对路径 import，这样 `node --test` 才能直接跑。
- 页头样式来自仓库根目录的 `shared/site-header.css`，不要直接改 `app/globals.css` 里带标记的那一段。视觉规范在根目录 `design/`。
- `app/layout.tsx` 里的统计脚本用的是整站共用的那个令牌，保留。

## 改完要做的检查

```bash
npm run lint
npm test
npm run build
```

`npm run build` 会先生成分享图，再静态导出到 `out/`，里面的地址都带 `/models` 前缀，所以要用根目录的 `node scripts/build-all.mjs --only=models` 拼进 `dist/` 再看。
