# 维护说明（管理后台，admin/）

`admin.wenworks.app`，Cloudflare Worker + D1，界面是 React + Mantine。结构和部署见本目录 `README.md`。

## 规则

- **发布产出的文件必须和工具精选一直读的格式逐字相同**。改 `shared/content.mjs` 后跑 `npm test`，"导入再导出不变"那一项必须通过；否则一次发布就会改坏线上内容。
- 发布只提交有变化的文件，用 `force: false` 更新分支；不要改成强推。
- 后台写入仓库只经过"发布"这一条路，提交说明以 `content:` 开头。
- 接口全部要求登录：线上靠 Cloudflare Access 的令牌（Worker 会再校验签名和 AUD），本地靠 `.dev.vars` 的 `DEV_USER`。不要加绕过登录的开关。
- 唯一的密钥 `GITHUB_TOKEN` 只放在 Cloudflare 的 Worker 密钥里，不进代码、不进页面。`ACCESS_AUD`、`ACCESS_TEAM_DOMAIN` 不是密钥，写在 `wrangler.jsonc`。
- 视觉沿用 `design/wenworks-ai-design.md`：黑白灰加橙色，直角，不用阴影和渐变。主题在 `src/theme.ts`。
- 不要在没有本地数据库的环境里运行 Curator 的命令（见 `sites/tools/AGENTS.md`）。

## 改完要做的检查

```bash
npm test
npm run typecheck
npm run build
```

涉及界面的改动，按 README 在本地跑起来，用浏览器看 1440px 和 390px 两个宽度。
