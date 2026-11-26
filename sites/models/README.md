# Wenworks AI · 模型

[Wenworks AI](https://ai.wenworks.app) 的 `/models/` 部分，线上地址 https://ai.wenworks.app/models/ 。数据来自 [Artificial Analysis](https://artificialanalysis.ai/) 和 [OpenRouter](https://openrouter.ai/)，GitHub Actions 每天刷新两次，和整站一起静态发布。

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
npm run dev        # http://localhost:3000/models/
```

| 命令 | 说明 |
|------|------|
| `npm run fetch` | 同时更新价格 + 评测 + 使用排行 |
| `npm run fetch:prices` | 仅价格 |
| `npm run fetch:rankings` | 仅排行 |
| `npm run fetch:popularity` | 仅使用排行 |
| `npm run build` | 生成分享图，静态导出到 `out/` |
| `npm run lint` / `npm test` | ESLint / 梯队与选型规则的单元测试 |

## 数据说明

下表的路径都在 `/models` 之下（`next.config.ts` 固定带这个 basePath）。

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

## 发布和定时刷新

都在仓库根目录的 `.github/workflows/` 里：

- `deploy.yml`：合并到 `main` 后构建整个站并发布；数据刷新完成后也会跑一次。
- `refresh-models.yml`：每天 UTC 00:00 和 12:00 运行 `npm run fetch`，把 `data/` 和 `public/logos/` 的变化提交到 `main`。需要仓库 Secret `AA_API_KEY`。

Artificial Analysis 的免费 API 每天只有 100 次请求，定时任务已经在用这个额度，所以不要调高频率，也不要在本地或 CI 里额外跑 `npm run fetch`。

## 技术栈

- Next.js（`output: "export"` 静态导出）+ React + TypeScript + Tailwind CSS 4  
- 抓取脚本：Node 原生 `fetch`（`scripts/`）

## 许可

按需自行补充 License。数据版权归各数据源与模型厂商，本站仅作聚合展示。
