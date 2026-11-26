# Wenworks AI · Agent 导航

非官方的中文导航站，整理 Claude Code、Codex、Antigravity CLI、Grok 的官方文档：学习路线、快速上手清单、功能对照和每日文档变化。只收录标题和链接，所有链接指向官方原文，不转载正文。与 Anthropic、OpenAI、Google、xAI 无关。

线上地址：https://agents.wenworks.app

## 结构

- `src/template.html`：页面本体（样式、脚本、学习路线和对照表的数据）
- `data/*.txt`：每家的文档目录（`# 分类`、`## 分组`、`标题|路径`）
- `data/snapshot.json`、`data/updates.json`：每日比对用的快照和变化记录
- `scripts/update.mjs`：抓取各家公开的文档索引（llms.txt），和快照比对
- `scripts/build.mjs`：生成 `docs/`（GitHub Pages 从这里发布）（`index.html`、`updates.json`、`feed.xml`）
- `.github/workflows/update.yml`：每天自动跑一次更新并提交

## 本地

```sh
node scripts/update.mjs   # 可选：抓一次最新索引
node scripts/build.mjs    # 生成 docs/
```

用任意静态服务器打开 `docs/` 即可，没有依赖。
