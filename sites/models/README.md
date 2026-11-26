# Wenworks AI · 模型

大模型对比站，线上地址 https://models.wenworks.app 。和 Agent 导航（https://agents.wenworks.app ）同属 Wenworks AI。数据来自 [Artificial Analysis](https://artificialanalysis.ai/) 和 [OpenRouter](https://openrouter.ai/)，GitHub Actions 每天刷新两次，以静态站形式部署到 GitHub Pages。

## 功能

- **梯队榜**（首页）：按 Intelligence Index 与榜首的差距分档，每差 5 分为一档，共五档；同一档内按混合单价（输入 : 输出 = 3 : 1）从低到高排。同一模型的不同推理强度合并为一个家族，取最高分
- **分享图**：每次构建生成一张 1200×675 的梯队榜图片（`/share/tiers-latest.png`），用作链接预览，也可以在首页下载
- **梯队变化记录**：每次刷新数据后和上一份快照比对，记下新上榜、升档、降档的模型，显示在梯队榜下方
- **选型**（`/pick`）：选使用场景（编程、Agent / 工具调用、通用对话与写作、长文本、低成本批量处理）和预算，可以只看开源或只看热门，给出 3–5 个推荐，每个带梯队、综合分、相关单项分、混合单价和一句由数据算出的理由。条件写在 URL 参数里，结果链接可以直接分享
- **模型目录**：精选 / 主流 / 开源 / 全部视图，模型家族折叠，价格、上下文长度和场景标签
- **模型评测**：Intelligence Index 以及 GPQA、HLE、SciCode、LCR 等单项基准
- **模型对比**：在目录或评测里勾选模型，并排看价格、上下文和各项分数
- **使用排行**：OpenRouter 近 7 天模型使用排行
- **自定义榜单**：拖拽模型、编辑等级，导出图片

## 本地运行

```bash
npm install
export AA_API_KEY=你的key   # Artificial Analysis 官方 API key（价格与评测需要）
npm run fetch      # 抓取价格、评测与使用排行 → data/*.json
npm run dev        # http://localhost:3000
```

| 命令 | 说明 |
|------|------|
| `npm run fetch` | 同时更新价格 + 评测 + 使用排行 |
| `npm run fetch:prices` | 仅价格 |
| `npm run fetch:rankings` | 仅排行 |
| `npm run fetch:popularity` | 仅使用排行 |
| `npm run build` | 静态导出到 `out/`（GitHub Pages 同配置） |

## 数据说明

| 页面 | 来源 | 内容 |
|------|------|------|
| `/` | Artificial Analysis + OpenRouter | 梯队榜、分享图、梯队变化记录 |
| `/pick` | Artificial Analysis + OpenRouter | 选型：在浏览器里按场景、预算和可选条件算出推荐 |
| `/models` | Artificial Analysis | 模型目录：家族、价格、上下文、类型与能力标签 |
| `/rankings` | Artificial Analysis | 模型评测：综合分与各项基准分 |
| `/compare` | 本地选择状态 + Artificial Analysis | 已选模型的价格、上下文与能力对比 |
| `/popularity` | OpenRouter | 近 7 天模型使用排行 |
| `/custom-ranking` | 本地浏览器状态 | 自定义等级榜单与图片导出 |
| `/prices` | — | 兼容旧链接，自动跳转到 `/models` |

数据文件都在 `data/` 下，构建时打进静态页：

| 文件 | 内容 |
|------|------|
| `prices.json` | 价格、上下文长度、是否开源 |
| `rankings.json` | Intelligence Index 与单项基准分 |
| `popularity.json` | OpenRouter 近 7 天使用排行 |
| `history/tiers-*.json` | 每次刷新后的梯队快照 |
| `tier-changes.json` | 相邻两份快照之间的梯队变化 |
| `tier-post.txt` | 最近一次梯队更新的文字摘要 |

几点限制：

- Artificial Analysis 免费 API 每天只能请求 100 次，所以每天只刷新两次
- 免费 API 不含上下文长度和单项基准分（GPQA、HLE、SciCode、LCR）。已有模型沿用上次的值，新模型这些列为空
- Artificial Analysis 已不再发布 Coding 和 Agentic 两项指数，这两列目前全部为空
- 梯队只看 Intelligence Index。相邻模型的分数常常相差不到 1 分，所以按档分组，不给出逐个名次
- 选型页的排序规则（`lib/pick.ts`）：
  - 通用、Agent 场景按综合分排。Agentic 指数已停发，Agent 场景标"暂无该项评测"
  - 编程参考 SciCode，长文本参考 LCR：有单项分的模型，按它比同综合分水平的模型高或低多少，在综合分上加减最多 5 分（一档）；没有单项分的模型不加不减，直接用综合分，并标"暂无该项评测"，不按 0 分计
  - 低成本批量处理按性价比排：价格每便宜一半，相当于综合分多 5 分；计算时价格最低按 $0.1 算
  - 设了预算时，没有价格的模型不参与
- 厂商 logo 来自 Artificial Analysis 的公开资源，保存在 `public/logos/`

## GitHub Pages

仓库已配置：

1. **Deploy GitHub Pages**（`.github/workflows/pages.yml`）  
   - 触发：推送到 `main`，或手动 Run workflow  
   - 构建静态站并部署到 GitHub Pages  

2. **Refresh market data**（`.github/workflows/refresh-data.yml`）  
   - 触发：每天 UTC `00:00` / `12:00`（北京时间约 **08:00 / 20:00**），或手动  
   - 执行 `npm run fetch`，若 `data/` 有变更则 commit 并 push  
   - push 后会自动触发上面的 Pages 部署  

首次发布后请在仓库打开：

**Settings → Pages → Build and deployment → Source: GitHub Actions**

站点使用自定义域名 `models.wenworks.app`（`public/CNAME`），挂在根路径下，不设 basePath。域名本身在 **Settings → Pages → Custom domain** 里配置。

## 定时更新怎么做？

已经用 GitHub Actions 的 `schedule` 做了定时，无需额外服务器：

```yaml
# .github/workflows/refresh-data.yml
on:
  schedule:
    - cron: "0 0,12 * * *"   # 每天两次（UTC）
  workflow_dispatch:         # 也可在 Actions 页手动点一次
```

想改频率，编辑该 cron 即可，例如每 6 小时：

```yaml
- cron: "0 */6 * * *"
```

注意：

- 免费仓库的 schedule 可能有延迟，属 GitHub 正常行为  
- Actions 必须保持启用；长期无仓库活动时，schedule 有时会被暂停，偶尔手动 Run 一下即可  
- 价格与评测来自 Artificial Analysis 官方免费 API（每天 100 次请求），需在仓库 **Settings → Secrets and variables → Actions** 添加 `AA_API_KEY`
- 免费 API 不含上下文长度和单项基准分（GPQA、HLE 等），已有模型沿用上次的值，新模型这些列为空
- 若某次失败，可看 Actions 日志并手动重跑  

本机也可用 cron（可选）：

```bash
0 */6 * * * cd /path/to/llm-model-comparison && npm run fetch && git add data && git commit -m "chore: refresh data" && git push
```

## 技术栈

- Next.js（`output: "export"` 静态导出）+ React + TypeScript + Tailwind CSS 4  
- 抓取脚本：Node 原生 `fetch`（`scripts/`）

## 许可

按需自行补充 License。数据版权归各数据源与模型厂商，本站仅作聚合展示。
