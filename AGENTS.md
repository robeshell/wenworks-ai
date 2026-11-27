# 维护说明（Wenworks AI）

线上地址 https://ai.wenworks.app 。一个仓库、一个站、四个部分：`/`（`sites/home`）、`/models/`（`sites/models`）、`/agents/`（`sites/agents`）、`/tools/`（`sites/tools`）。结构和命令见 `README.md`，视觉规范见 `design/wenworks-ai-design.md`。

动手改某个部分之前，先读那个部分自己的 `sites/<部分>/AGENTS.md`，里面有只适用于它的规则。两个 Next.js 部分（models、tools）用的 Next.js 版本有破坏性变更，写代码前先看各自 `node_modules/next/dist/docs/`。

## 上线方式

- 合并到 `main` 就上线：`deploy.yml` 构建整个站并发布到 GitHub Pages。不要直接推 `main`，在分支上改，开 PR。
- 推送到其他分支会跑同样的测试和构建但不发布，产物在那次运行的 Artifacts 里。
- 自定义域名在仓库的 Pages 设置里绑定，不需要 CNAME 文件。
- 三个定时任务会自己往 `main` 提交数据（模型数据、文档索引、每周动态）。它们提交前会先 `git pull --rebase`。

## 四个部分怎么拼在一起

- 每个部分构建到自己的输出目录，`scripts/build-all.mjs` 把它们放进 `dist/` 的对应路径。首页部分拥有根路径。
- models 和 tools 的 `next.config.ts` 固定带 basePath（`/models`、`/tools`）。站内跳转用 `next/link`，它会自动加前缀；**普通的 `<a>`、`<img>` 和 `history.replaceState` 不会**，要自己用 `process.env.NEXT_PUBLIC_BASE_PATH` 或 `window.location.pathname`。
- agents 的模板里所有站内地址都从 `BASE='/agents'` 拼出来。
- 页头里"Wenworks AI"指向 `/`，三个入口指向 `/models/`、`/agents/`、`/tools/`，都是普通链接。
- 整个站只有一个统计代码（Cloudflare Web Analytics），只在发布构建里出现。

## 管理后台

`admin/` 是管理后台（admin.wenworks.app），单独部署到 Cloudflare，不参与网站构建。它在"发布"时往 `main` 提交工具精选的内容文件（提交说明以 `content:` 开头），和定时任务一样属于数据提交。改它之前先读 `admin/AGENTS.md`。

## 共用页头

页头样式只有一份：`shared/site-header.css`。四个部分的样式文件里各有一段带标记的副本，由 `node scripts/sync-shared.mjs` 写入。不要直接改副本；CI 会用 `--check` 检查它们是否一致。

## 改完要做的检查

```bash
npm run check                 # 共用页头是否一致 + 三个部分的测试 + 两个 Next.js 部分的 lint
node scripts/build-all.mjs    # 或 npm run build
```

构建后把 `dist/` 起一个静态服务器，用浏览器看改到的页面，至少看 1280px 和 375px。跨部分的改动（页头、路径）要四个部分都点一遍，并留意请求里有没有 404：最常见的错误是某个资源路径漏了 `/models` 或 `/tools` 前缀。

## 不能做的

- 不要在没有本地数据库的环境里运行 Curator 的任何命令（见 `sites/tools/AGENTS.md`）。
- 不要额外运行 `npm run fetch`：Artificial Analysis 的免费 API 每天只有 100 次。
- 不要给 `sites/home` 和 `sites/agents` 加依赖或构建工具。
