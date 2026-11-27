# Wenworks AI · 管理后台

`admin.wenworks.app`：在浏览器里维护网站内容，哪台电脑都能用。第一期管工具精选的五个板块。

## 怎么运转

```
后台（Cloudflare Worker） ──读写──> D1 数据库（条目、修改记录、发布记录）
        │
        └─ 点「发布」：把已发布的内容生成网站读的文件，一次提交到仓库 main
                         └─> deploy.yml 构建整站，约 3 分钟后上线
```

- **保存只改数据库**，网站不变；**发布**才写进仓库。仓库因此保留着每次发布的完整内容，也是一份备份。
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

`.github/workflows/admin.yml` 在 `admin/` 有改动并合并到 `main` 后部署：建表或升级表结构 → 数据库为空时从仓库导入一次 → 部署 Worker 和界面。

第一次上线前需要在 Cloudflare 和 GitHub 各做一次设置（见下方"上线前的设置"）。

## 上线前的设置

- **登录**已经配好：Cloudflare Zero Trust 团队 `wenworks.cloudflareaccess.com`，应用「Wenworks AI 管理后台」只放行站长的邮箱，用邮箱验证码登录。团队域名和应用的 AUD 写在 `wrangler.jsonc` 的 `vars` 里。
- **部署**需要 GitHub 仓库 Secret `CLOUDFLARE_API_TOKEN`：Cloudflare 里用「编辑 Cloudflare Workers」模板新建，再加上「D1：编辑」和 wenworks.app 的「DNS：编辑」。账户 ID 直接写在 `admin.yml` 里。
- **发布**需要 Worker 密钥 `GITHUB_TOKEN`：GitHub 细粒度令牌，只授权本仓库，Contents 读写。

## 和 Curator 的关系

后台上线后，工具精选的内容改在后台维护。并行期间**不要两边同时改**：Curator 的本地数据库不知道后台的改动，用它导出会覆盖后台发布的内容。AI 收录、封面截图搬到后台之后（第 2 期），Curator 停用。
