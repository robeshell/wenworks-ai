# Wenworks AI · 管理后台

`admin.wenworks.app`：在浏览器里维护网站内容，哪台电脑都能用。

- **工具精选**：五个板块的条目，编辑、修改记录、上传 logo 和封面。
- **收件箱**：贴链接，AI（经 OpenRouter）读网页按 `sites/tools/skills/curator-ingest/SKILL.md` 的口径起草；审核后收录成草稿，或放到首页讨论。
- **首页**：「值得看的讨论」那一栏（`sites/home/data/picks.json`）。
- **发布**：把以上改动一次提交到仓库。

## 怎么运转

```
后台（Cloudflare Worker） ──读写──> D1 数据库（条目、修改记录、发布记录）
        │
        └─ 点「发布」：把已发布的内容生成网站读的文件，一次提交到仓库 main
                         └─> deploy.yml 构建整站，约 3 分钟后上线
```

- **保存只改数据库**，网站不变；**发布**才写进仓库。仓库因此保留着每次发布的完整内容，也是一份备份。
- 发布写的文件：工具精选的 `tools.json`、`route-aliases.json`、`content/*.md`，上传的图片 `sites/tools/public/{covers,logos}/`，首页的 `sites/home/data/picks.json`。
- 生成的文件和 Curator 导出的格式逐字相同：`sites/tools/data/tools.json`、`data/route-aliases.json`、`content/<板块>s/<地址名>.md`。`npm test` 会检查"从仓库导入再导出，文件一个字不变"。
- 发布前会和仓库对比，只提交有变化的文件；如果预览后仓库又有了新提交，发布会被拒绝，刷新后再发。
- 每次保存前的版本都存在修改记录里，可以在编辑页恢复。

## 目录

```
worker/     接口（/api/*）：条目增删改、批量改状态、修改记录、发布预览和提交、登录校验
src/        界面：React + Mantine，工作台、内容列表、编辑页、发布、设置
shared/     条目和网站文件之间的转换，Worker、脚本和测试共用
migrations/ D1 表结构
scripts/    从仓库导入（seed.mjs、seed-if-empty.mjs）和测试
```

## 本地开发

```bash
npm install
cp .dev.vars.example .dev.vars          # 本地免登录
npx wrangler d1 migrations apply wenworks-admin --local
npm run seed && npx wrangler d1 execute wenworks-admin --local --file .wrangler/seed.sql
npm run build && npx wrangler dev       # http://localhost:8787
```

改界面时可以另开 `npm run dev`（http://localhost:5173，接口转给 8787）。

## 部署

Cloudflare Workers Builds 直接连着本仓库（Workers & Pages → wenworks-admin → Settings → Build）：`main` 有新提交就在 `admin/` 下构建并部署。

- 构建命令：`npm run build`
- 部署命令：`npx wrangler d1 migrations apply wenworks-admin --remote && node scripts/seed-if-empty.mjs && npx wrangler deploy`

部署命令依次做三件事：升级表结构；数据库为空时从仓库导入一次（以后不会再导入，不会覆盖后台的修改）；部署 Worker 和界面。

## 线上的设置

- **登录**：Cloudflare Zero Trust 团队 `wenworks.cloudflareaccess.com`，应用「Wenworks AI 管理后台」只放行站长的邮箱，用邮箱验证码登录，会话 30 天。团队域名和应用的 AUD 写在 `wrangler.jsonc` 的 `vars` 里，不是密钥。不要打开 Workers & Pages 页面右侧"Cloudflare Access"那个账户级开关，它会把账户里所有 Worker 都锁上。
- **发布**：Worker 密钥 `GITHUB_TOKEN`，GitHub 细粒度令牌，只授权本仓库，Contents 读写。在 Worker 的 Settings → Variables and Secrets 里配置；部署不会覆盖它。
- **AI 起草**：Worker 密钥 `OPENROUTER_API_KEY`；模型在后台「设置」里从 OpenRouter 的列表选，存在数据库里。本地开发可以用 `.dev.vars` 的 `OPENROUTER_URL` 指向一个模拟服务。
- **数据库**：D1 `wenworks-admin`。表结构在 `migrations/`，部署时自动升级。

## 和 Curator 的关系

后台上线后，工具精选的内容改在后台维护。并行期间**不要两边同时改**：Curator 的本地数据库不知道后台的改动，用它导出会覆盖后台发布的内容。收件箱和图片上传上线后，Curator 停用。封面不再自动截图，在编辑页手动上传（自动压成不超过 1440 宽的 webp）。
