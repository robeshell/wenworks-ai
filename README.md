# Wenworks AI

https://ai.wenworks.app ：一个站，四个部分。

| 地址 | 目录 | 内容 |
|---|---|---|
| `/` | `sites/home` | 本周动态：梯队变化、官方文章、新收录的工具，每周一更新 |
| `/models/` | `sites/models` | 大模型梯队榜、选型、价格、评测 |
| `/agents/` | `sites/agents` | Claude Code、Codex 等编程 Agent 官方文档的中文导航 |
| `/tools/` | `sites/tools` | AI 工具、站点、技能、开源项目、提示词精选（另有英文版 `/tools/en/`） |

四个部分各自构建，由 `scripts/build-all.mjs` 拼进 `dist/`，用 GitHub Actions 发布到 GitHub Pages。它们原来是四个仓库、四个子域名，现在合在这里。

## 目录

```
sites/home/      零依赖 Node 脚本，生成首页、往期、RSS、X 推文串
sites/models/    Next.js 静态导出，basePath 是 /models
sites/agents/    零依赖：一个 HTML 模板加构建脚本，预渲染需要 Chrome
sites/tools/     Next.js 静态导出，basePath 是 /tools；含本地管理界面 Curator
shared/          四个部分共用的东西，目前是页头样式 site-header.css
scripts/         build-all.mjs（整站构建）、sync-shared.mjs（同步共用页头）
.github/         四个工作流，加一个共用的安装步骤 actions/setup
design/          视觉规范
```

每个部分自己的说明在 `sites/<部分>/README.md` 和 `sites/<部分>/AGENTS.md`。

## 本地

```bash
npm run check                             # 测试和 lint（CI 跑的就是这一条）
node scripts/build-all.mjs                # 构建整个站到 dist/（npm run build）
node scripts/build-all.mjs --only=home    # 只构建某几个部分（逗号分隔）
npm run serve                             # 在 http://localhost:4500 看 dist/
```

- 两个 Next.js 部分第一次构建会自动 `npm ci`。
- Agent 导航的预渲染需要 Chrome；不在默认位置时用 `CHROME=/path/to/chrome`。
- 改共用页头：改 `shared/site-header.css`，然后 `node scripts/sync-shared.mjs`。

## 自动任务

| 工作流 | 什么时候 | 做什么 |
|---|---|---|
| `deploy.yml` | 合并到 `main`；两个数据任务跑完之后 | 测试、构建整个站、发布。推送到其他分支时只构建，产物在 Artifacts 里 |
| `refresh-models.yml` | 每天 UTC 00:00、12:00 | 刷新模型数据并提交。需要仓库 Secret `AA_API_KEY` |
| `update-agents.yml` | 每天 UTC 22:17 | 比对各家官方文档目录、更新官方文章列表并提交 |
| `weekly.yml` | 每周一 UTC 00:17（台北 08:17） | 汇总上一周的动态，提交并发布。手动触发可以只预览 |

## 约束

- 不转载正文，只放标题、来源和链接。Agent 导航页脚"与 Anthropic、OpenAI、Google、xAI 无关"的声明保留。
- 动态页全部由数据拼出来，不调用需要密钥的接口，不用大模型；评论只来自 `sites/home/notes/` 里的编辑手记。
- 工具精选的内容由站长在本地用 Curator 维护，见 `sites/tools/AGENTS.md` 里"不要动内容数据链路"一节。
