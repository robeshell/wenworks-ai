# Wenworks AI

Wenworks AI 的总入口 https://ai.wenworks.dev ，内容是每周自动生成的简报：把三个站这一周的变化汇总成一期，每周一发布。

- [模型](https://models.wenworks.dev/)：大模型梯队榜、选型、价格
- [Agent 导航](https://agents.wenworks.dev/)：Claude Code、Codex 等官方文档的导航
- [工具精选](https://tools.wenworks.dev/)：AI 工具和资源精选

Node 22 加零依赖脚本，生成纯静态 HTML，用 GitHub Actions 部署到 GitHub Pages。

## 一期简报里有什么

| 节 | 数据来源 | 怎么比对 |
|---|---|---|
| 模型梯队 | `robeshell/wenworks-ai-models` 的 `data/history/tiers-*.json` | 本周开始前最后一份快照对比本周结束前最后一份，用那个仓库 `lib/tiers.ts` 的 `diffTiers` 算出榜首、新进前五档、升档、降档 |
| 使用量前五 | 同一仓库的 `data/popularity.json` | 只有当前值，没有历史，所以只列名次 |
| Agent 文档 | `https://agents.wenworks.dev/updates.json` | 取日期落在本周的条目 |
| 官方文章 | `https://agents.wenworks.dev/articles.json` | 有日期的按日期；没日期的按"哪一期第一次见到"，记在 `state/articles-seen.json` |
| 新收录工具 | `https://tools.wenworks.dev/catalog.json` | 和 `state/tools-seen.json` 里见过的 id 比。第一次运行只建基线 |

- 一期覆盖周一 00:00 到周日 24:00（Asia/Taipei）。
- 任何一个数据源取不到，只影响它自己那一节；新收录工具取不到时整节不出现。
- 某一节没有变化时写"本周没有变化"，不会去掉。
- 全部由公开数据拼出来，不调用需要密钥的接口，不用大模型，不转载正文。

## 编辑手记

想在某一期最前面加几句话，就新建 `notes/<ISO 周>.md`，例如 `notes/2026-W48.md`。ISO 周写在每期数据的 `week.isoWeek` 里。支持段落、列表、链接、加粗和行内代码。合并到 `main` 后会自动重新发布。

## 产物

| 地址 | 内容 |
|---|---|
| `/` | 最新一期，下面是三个站的入口和各自的一个数字 |
| `/weekly/` | 往期列表 |
| `/weekly/N/` | 第 N 期 |
| `/feed.xml` | RSS，每期一条，全文 |
| `/x/N.txt` | 第 N 期的 X 推文串，手动发 |

## 自动任务

- `.github/workflows/weekly.yml`：每周一 08:17（台北时间）生成新一期，把 `data/issues/NNNN.json` 和 `state/` 提交回仓库，然后发布。手动触发时可以勾"只预览"，也可以指定要生成哪一周。推送到 `main` 以外的分支会自动跑一遍预览，产物在那次运行的 Artifacts 里。
- `.github/workflows/deploy.yml`：合并到 `main` 时，以及每天一次，用已有的各期重新生成并发布，不出新一期。每天那次是为了刷新首页入口卡片上的数字。

## 本地运行

```bash
git clone --depth 1 https://github.com/robeshell/wenworks-ai-models .sources/models
npm test            # node --test
npm run collect     # 生成上一个完整周的那一期；加 -- --week=2026-11-18 指定某一周
npm run build       # 生成 out/
```

`npm run collect` 会改 `data/issues/` 和 `state/`。只是想看效果的话，看完用 `git checkout data state` 还原。
