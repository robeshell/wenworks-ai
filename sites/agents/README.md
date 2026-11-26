# Wenworks AI · Agent 导航

[Wenworks AI](https://ai.wenworks.app) 的 `/agents/` 部分，线上地址 https://ai.wenworks.app/agents/ 。

非官方的中文导航，整理 Claude Code、Codex、Antigravity CLI、Grok 的官方文档：学习路线、快速上手清单、功能对照和每日文档变化。只收录标题和链接，所有链接指向官方原文，不转载正文。与 Anthropic、OpenAI、Google、xAI 无关。

## 结构

- `src/template.html`：页面本体（样式、脚本、学习路线和对照表的数据）。站内地址都从脚本里的 `BASE='/agents'` 拼出来
- `data/*.txt`：每家的文档目录（`# 分类`、`## 分组`、`标题|路径`）
- `data/snapshot.json`、`data/updates.json`：每日比对用的快照和变化记录
- `data/articles.json`：各家官方文章列表
- `scripts/update.mjs`：抓取各家公开的文档索引（llms.txt），和快照比对
- `scripts/articles.mjs`：更新官方文章列表
- `scripts/build.mjs`：生成 `docs/`（构建产物，不提交），并用无头 Chrome 预渲染每个页面

每天的抓取由仓库根目录的 `.github/workflows/update-agents.yml` 运行；发布由 `deploy.yml` 负责。

## 本地

```bash
node scripts/update.mjs   # 可选：抓一次最新索引
node scripts/build.mjs    # 生成 docs/，最后一行应该是 built 9 pages (9 prerendered)
```

没有依赖。页面地址带 `/agents` 前缀，所以要看效果请在仓库根目录构建整站（`node scripts/build-all.mjs --only=agents`），再给 `dist/` 起一个静态服务器。维护规则见 [AGENTS.md](AGENTS.md)。
