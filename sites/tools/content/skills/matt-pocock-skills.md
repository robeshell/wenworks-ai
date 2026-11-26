---
{
  "id": "matt-pocock-skills",
  "slug": "matt-pocock-skills",
  "blockType": "skill",
  "title": "Skills For Real Engineers",
  "status": "active",
  "category": "coding",
  "tags": [
    "self-host",
    "free",
    "cli"
  ],
  "sourceUrl": "https://github.com/mattpocock/skills",
  "payload": {
    "summary": {
      "zh": "手动触发管编排、自动触发管纪律的可改技能集，两种装法二选一。",
      "en": "Small editable skills for coding agents: user-invoked ones orchestrate, model-invoked ones carry the discipline."
    },
    "body": {
      "zh": "## 它解决什么问题\n\nMatt Pocock 把自己日常真做工程用的技能从 `.agents` 目录开源出来，给 Claude Code、Codex 这类编程 Agent 用。典型一轮操作：敲 `/grill-me`，Agent 把需求盘问透才动手；`/implement` 在约定好的接缝驱动 `/tdd`，提交前先过 `/code-review`。README 点名 GSD、BMAD、Spec-Kit 这类方案的问题是「接管」流程——想改改不动，流程自身的 bug 也难查；这套反着来：小、可自由改造、可组合，不挑模型，一次只让 Agent 干一件事，步骤之间留人工反馈点。\n\n它对着四个常见失败模式给解法：\n\n- **Agent 没听懂需求**：grilling 盘问环节逼 Agent 把问题问透再动手，对应 `/grill-me` 与 `/grill-with-docs`\n- **Agent 废话太多**：`/grill-with-docs` 顺手沉淀项目术语表 `CONTEXT.md` 和 ADR，建立共享语言\n- **代码跑不通**：补齐测试、类型、浏览器反馈环，`/tdd` 强制红-绿-重构循环\n- **代码库变泥球**：`/improve-codebase-architecture` 定期扫出「深模块化」候选点\n\n## 怎么使用\n\n两条安装路径哲学不同，二选一，都装会让每个技能出现两份：\n\n```bash\n# 路径一：Claude Code 官方市场插件，整包只读，随作者发布自动更新\nclaude plugins install mattpocock-skills\n\n# 路径二：skills.sh 安装器，把技能文件复制进你的仓库，可自由改造\nnpx skills@latest add mattpocock/skills\n```\n\n路径一是「订阅」，适合只想用；路径二是「fork」，Codex 等其他 Agent 走这条路，装时可挑选技能，更新要手动跑 `npx skills update`。装完每个仓库跑一次 `/setup-matt-pocock-skills`，它会问 issue tracker 用哪个（GitHub、Linear 或本地文件）、triage 打什么标签、文档存哪。不知道从哪开始就问 `/ask-matt`，它给这套技能当路由。\n\n## 输入与结果\n\n全部技能按「谁能触发」分两层：\n\n- **user-invoked**：只有手动敲命令才跑，负责编排，如 `/grill-me`、`/triage`、`/to-spec`、`/wayfinder`、`/implement`；可调用 model-invoked 技能，不能调用另一个 user-invoked\n- **model-invoked**：也可手动调，Agent 遇到合适任务会自己伸手拿，承载可复用纪律，如 `/tdd`、`/code-review`、`/diagnosing-bugs`、`/research`\n\n输入是当前对话、计划或代码库，产出是规格、工单、HTML 架构报告或代码改动。`/grilling` 是底层盘问原语，grill-me、triage、wayfinder 都建在它上面；`/code-review` 按 Standards 与 Spec 两个维度并行审 diff。\n\n## 适合谁\n\n已经在 Claude Code、Codex 这类编程 Agent 里跑真实项目、又不想把工程流程整个交给某个框架的工程师。需求说不清、要按测试—实现—评审闭环推进的代码库，收益最直接。\n\n## 使用边界\n\n插件是托管只读整包，更新跟着作者发布走，改不了内容；skills.sh 装进来的是归你所有的普通文件，不会背后自己更新。MIT 许可，README 原话是「hack around with them, make them your own」。这套技能不替代项目自己的测试、类型检查和浏览器反馈；`/improve-codebase-architecture` 只是 survey 不是 rescue——老代码库能扫出真候选，但不会替你解开泥球。",
      "en": "## The problem it solves\n\nMatt Pocock opensourced the skills he actually uses for day-to-day engineering work from his `.agents` directory, for coding agents like Claude Code and Codex. A typical round: type `/grill-me` and the agent grills the requirements through before acting; `/implement` drives `/tdd` at the agreed seams and passes through `/code-review` before committing. The README calls out that approaches like GSD, BMAD and Spec-Kit \"take over\" the process — you can't change what you want to change, and bugs in the process itself are hard to diagnose; this set goes the other way: small, freely modifiable, composable, model-agnostic, having the agent do one thing at a time with human feedback points between steps.\n\nIt answers four common failure modes:\n\n- **The agent didn't understand the requirement**: the grilling step forces the agent to ask the questions through before acting, corresponding to `/grill-me` and `/grill-with-docs`\n- **The agent waffles too much**: `/grill-with-docs` also captures the project glossary `CONTEXT.md` and ADRs, establishing a shared language\n- **The code doesn't run**: it fills in the test, type and browser feedback loops, and `/tdd` enforces a red-green-refactor cycle\n- **The codebase turns into a mud ball**: `/improve-codebase-architecture` periodically scans for \"deep module\" candidates\n\n## How to use it\n\nThe two install paths work on different philosophies — pick one; installing both makes every skill appear twice:\n\n```bash\n# Path one: Claude Code official marketplace plugin, read-only whole package, auto-updates with the author's releases\nclaude plugins install mattpocock-skills\n\n# Path two: the skills.sh installer, copies the skill files into your repo, freely modifiable\nnpx skills@latest add mattpocock/skills\n```\n\nPath one is a \"subscription\", for when you just want to use it; path two is a \"fork\", and other agents like Codex take that route — you can pick skills when installing, and updates need a manual `npx skills update`. After installing, run `/setup-matt-pocock-skills` once per repo; it asks which issue tracker you use (GitHub, Linear or local files), what labels triage applies, and where docs are stored. If you don't know where to start, ask `/ask-matt`, which acts as a router for the set.\n\n## Inputs and outputs\n\nEvery skill falls into one of two layers, by \"who can trigger it\":\n\n- **user-invoked**: runs only when you type the command, handling orchestration, e.g. `/grill-me`, `/triage`, `/to-spec`, `/wayfinder`, `/implement`; it can call model-invoked skills but not another user-invoked one\n- **model-invoked**: also callable manually, and the agent reaches for it when it meets a fitting task; it carries reusable discipline, e.g. `/tdd`, `/code-review`, `/diagnosing-bugs`, `/research`\n\nInputs are the current conversation, plan or codebase; outputs are specs, tickets, HTML architecture reports or code changes. `/grilling` is the underlying interrogation primitive that grill-me, triage and wayfinder all build on; `/code-review` reviews a diff in parallel along two dimensions, Standards and Spec.\n\n## Who it's for\n\nEngineers already running real projects inside coding agents like Claude Code and Codex who don't want to hand their whole engineering process over to some framework. Codebases where the requirements are hard to pin down and that you want to push through a test—implement—review loop see the most direct benefit.\n\n## Boundaries\n\nThe plugin is a read-only hosted whole package whose updates follow the author's releases and whose content you can't change; what skills.sh installs are ordinary files you own, which won't quietly update themselves behind your back. MIT licensed, and the README's own words are \"hack around with them, make them your own\". The set doesn't replace your project's own tests, type checking and browser feedback; `/improve-codebase-architecture` is a survey, not a rescue — it can surface real candidates in an old codebase, but it won't untangle the mud ball for you."
    },
    "links": [
      {
        "label": "GitHub repository",
        "url": "https://github.com/mattpocock/skills",
        "kind": "repository"
      },
      {
        "label": "skills.sh 项目页",
        "url": "https://skills.sh/mattpocock/skills",
        "kind": "official"
      }
    ],
    "cover": "/covers/matt-pocock-skills-19daa0efc4.webp"
  }
}
---

## 它解决什么问题

Matt Pocock 把自己日常真做工程用的技能从 `.agents` 目录开源出来，给 Claude Code、Codex 这类编程 Agent 用。典型一轮操作：敲 `/grill-me`，Agent 把需求盘问透才动手；`/implement` 在约定好的接缝驱动 `/tdd`，提交前先过 `/code-review`。README 点名 GSD、BMAD、Spec-Kit 这类方案的问题是「接管」流程——想改改不动，流程自身的 bug 也难查；这套反着来：小、可自由改造、可组合，不挑模型，一次只让 Agent 干一件事，步骤之间留人工反馈点。

它对着四个常见失败模式给解法：

- **Agent 没听懂需求**：grilling 盘问环节逼 Agent 把问题问透再动手，对应 `/grill-me` 与 `/grill-with-docs`
- **Agent 废话太多**：`/grill-with-docs` 顺手沉淀项目术语表 `CONTEXT.md` 和 ADR，建立共享语言
- **代码跑不通**：补齐测试、类型、浏览器反馈环，`/tdd` 强制红-绿-重构循环
- **代码库变泥球**：`/improve-codebase-architecture` 定期扫出「深模块化」候选点

## 怎么使用

两条安装路径哲学不同，二选一，都装会让每个技能出现两份：

```bash
# 路径一：Claude Code 官方市场插件，整包只读，随作者发布自动更新
claude plugins install mattpocock-skills

# 路径二：skills.sh 安装器，把技能文件复制进你的仓库，可自由改造
npx skills@latest add mattpocock/skills
```

路径一是「订阅」，适合只想用；路径二是「fork」，Codex 等其他 Agent 走这条路，装时可挑选技能，更新要手动跑 `npx skills update`。装完每个仓库跑一次 `/setup-matt-pocock-skills`，它会问 issue tracker 用哪个（GitHub、Linear 或本地文件）、triage 打什么标签、文档存哪。不知道从哪开始就问 `/ask-matt`，它给这套技能当路由。

## 输入与结果

全部技能按「谁能触发」分两层：

- **user-invoked**：只有手动敲命令才跑，负责编排，如 `/grill-me`、`/triage`、`/to-spec`、`/wayfinder`、`/implement`；可调用 model-invoked 技能，不能调用另一个 user-invoked
- **model-invoked**：也可手动调，Agent 遇到合适任务会自己伸手拿，承载可复用纪律，如 `/tdd`、`/code-review`、`/diagnosing-bugs`、`/research`

输入是当前对话、计划或代码库，产出是规格、工单、HTML 架构报告或代码改动。`/grilling` 是底层盘问原语，grill-me、triage、wayfinder 都建在它上面；`/code-review` 按 Standards 与 Spec 两个维度并行审 diff。

## 适合谁

已经在 Claude Code、Codex 这类编程 Agent 里跑真实项目、又不想把工程流程整个交给某个框架的工程师。需求说不清、要按测试—实现—评审闭环推进的代码库，收益最直接。

## 使用边界

插件是托管只读整包，更新跟着作者发布走，改不了内容；skills.sh 装进来的是归你所有的普通文件，不会背后自己更新。MIT 许可，README 原话是「hack around with them, make them your own」。这套技能不替代项目自己的测试、类型检查和浏览器反馈；`/improve-codebase-architecture` 只是 survey 不是 rescue——老代码库能扫出真候选，但不会替你解开泥球。
