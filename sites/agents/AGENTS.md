# 维护说明（Agent 导航部分，/agents/）

这是 Wenworks AI（https://ai.wenworks.app）的 `/agents/` 部分：非官方的中文导航，整理 Claude Code、Codex、Antigravity CLI、Grok 的官方文档。整站的结构、上线方式和检查命令见仓库根目录的 `AGENTS.md`；这里只写这个部分特有的规则。

## 路径和构建产物

- 所有站内地址都从模板里的 `BASE='/agents'` 拼出来（`ROUTES`、`APATH`、读取 `updates.json` 和 `articles.json` 的地址）。新增站内链接时也要带上它。
- `docs/` 是构建产物，**不提交**（在 `.gitignore` 里）。整站构建时由 `scripts/build-all.mjs` 生成并放到 `dist/agents/`。
- 数据由仓库根目录的 `.github/workflows/update-agents.yml` 每天更新并提交 `data/`。

## 结构

- `src/template.html`：页面本体，样式和脚本都在里面，零依赖，不加构建工具。
- `scripts/build.mjs`：把模板和数据拼成 `docs/`，并用无头 Chrome 预渲染每个页面。
- `scripts/update.mjs`：抓取各家公开的文档索引，和快照比对。不要改它的抓取比对逻辑。
- `data/*.txt`：每家的文档目录，格式是 `# 分类`、`## 分组`、`标题|路径`。不要改格式。
- `data/notes.json`：学习路线里每篇文档的一句话说明。`data/prices.json`：价格。
- `data/editorial.json`：人工编排的内容，构建时注入模板的 `@@EDITORIAL@@`。键是 `agents`（每家的名字、文档地址和学习路线的阶段）、`start`（上手清单）、`cmp` 和 `cmp2`（功能对照表）、`pick`（基本情况）、`price`（价格）、`must`（推荐文章，首页的"推荐文章"也从这里取）。改这些内容只改这个文件，不用动模板。平时由管理后台（admin.wenworks.app 的「Agent 导航」）编辑并发布；直接改文件也可以，后台会提示站长重新载入。

## 内容规则

- 只收录标题和链接，所有链接指向官方原文，不转载正文。
- 页脚"与 Anthropic、OpenAI、Google、xAI 无关"的声明必须保留。
- 栏目名保持现在自然的说法。首页打开直接是能用的导航。
- 交互：点过的标题自动变浅；只有快速上手清单有勾选框。

## 构建和检查

```bash
node scripts/build.mjs
```

- 预渲染需要 Chrome。默认找 `google-chrome`，其他位置用环境变量指定，例如 `CHROME=/path/to/chrome node scripts/build.mjs`。
- 找不到 Chrome 时脚本不会报错，只会跳过预渲染。输出的最后一行应该是 `built 9 pages (9 prerendered)`；括号里不是 9 就说明预渲染没成功，这样的产物对搜索引擎是空页面。
- 改样式或模板后，把改之前的 `docs/` 留一份，在浏览器里逐页比对：链接、列表项、表格内容应该一条不少。四家文档各有三种视图（快速上手、学习路线、完整目录），加上首页、文章、对比、更新、关于，共 17 个视图。
- 仓库里没有自动测试。

## 视觉

规范在仓库根目录 `design/wenworks-ai-design.md`。页头样式来自根目录的 `shared/site-header.css`，不要直接改模板里带标记的那一段。
