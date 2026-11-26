---
{
  "id": "superpowers",
  "slug": "superpowers",
  "blockType": "skill",
  "title": "Superpowers",
  "status": "active",
  "category": "coding",
  "tags": [
    "self-host",
    "free",
    "app",
    "cli"
  ],
  "sourceUrl": "https://github.com/obra/superpowers",
  "payload": {
    "summary": {
      "zh": "从设计确认到测试与审查，用自动触发的技能约束编码流程。",
      "en": "Turns rough ideas into approved designs, implementation plans, tested code, and reviewed changes through automatically triggered skills."
    },
    "body": {
      "zh": "## 它解决什么问题\n\nSuperpowers 是一组面向编码 Agent 的流程技能。你提出一个功能后，Agent 不会立刻动手改代码，而会先追问需求，把设计分段展示给你确认，再整理成可以逐项执行的计划，随后完成实现、测试和代码审查。\n\n它和直接给 Agent 一句任务描述的区别，在于关键步骤被固定下来，并保留人工确认点。这样可以减少理解偏差、漏测，以及代码尚未验证就宣布完成等情况；使用者仍负责确认方向和决定最终如何处理分支。\n\n## 怎么使用\n\n安装方式取决于宿主。同一套技能已适配 Claude Code、Codex、Cursor、Gemini CLI、Devin CLI、OpenCode、Pi、Hermes Agent 等环境。以 Claude Code 为例：\n\n```text\n/plugin install superpowers@claude-plugins-official\n```\n\n安装完成后，相关技能会根据任务所处阶段自行触发。如果同时使用多个编码宿主，需要分别安装。Codex App 可从插件页安装，Codex CLI 则通过 `/plugins` 搜索 Superpowers。\n\n## 输入与结果\n\n使用者先说明要实现的功能，并在 Agent 分段给出方案时确认或修正。确认设计后，技能会生成设计文档和细粒度实施计划，再引导 Agent 按任务实现、测试并审查代码。\n\n流程不会替使用者跳过关键决定。进入收尾阶段时，Agent 会列出合并、提交 PR、保留分支或丢弃工作的选项，由使用者选择后续处理方式。\n\n## 适合谁\n\n它适合需要让编码 Agent 持续推进较长任务，同时希望保留工程约束的个人或团队。若项目想把需求讨论、TDD、代码审查和分支收尾安排成固定节奏，也可以用它统一执行过程。\n\n## 使用边界\n\nSuperpowers 依赖兼容的编码 Agent，本身不是独立编码工具。不同宿主的安装与更新方式并不相同，需要分别维护。\n\n项目采用 MIT 许可；企业支持、附加工具和托管支出属于商业服务。可选的视觉伴侣默认会请求 Prime Radiant 网站并携带版本信息，可通过 `SUPERPOWERS_DISABLE_TELEMETRY` 等环境变量关闭。",
      "en": "## What problem it solves\n\nSuperpowers is a set of process skills for coding agents. After you propose a feature, the agent does not immediately start changing code; instead it first asks about the requirements, presents the design to you in sections for confirmation, then turns it into a plan that can be executed item by item, and afterwards completes the implementation, testing, and code review.\n\nThe difference from simply giving the agent a one-sentence task description is that the key steps are fixed and human confirmation points are preserved. This reduces misunderstandings, missed tests, and situations where code is declared done before it has been verified; the user is still responsible for confirming the direction and deciding how to handle the branch in the end.\n\n## How to use\n\nInstallation depends on the host. The same set of skills has been adapted to environments such as Claude Code, Codex, Cursor, Gemini CLI, Devin CLI, OpenCode, Pi, and Hermes Agent. Taking Claude Code as an example:\n\n```text\n/plugin install superpowers@claude-plugins-official\n```\n\nAfter installation, the relevant skills trigger by themselves according to the stage the task is at. If you use several coding hosts at the same time, you need to install it in each of them. In the Codex App you can install it from the plugins page, while in the Codex CLI you search for Superpowers via `/plugins`.\n\n## Inputs and results\n\nThe user first describes the feature to be implemented, and confirms or corrects it when the agent presents the design in sections. Once the design is confirmed, the skills generate a design document and a fine-grained implementation plan, then guide the agent to implement, test, and review the code task by task.\n\nThe process does not skip key decisions on the user's behalf. When it reaches the wrap-up stage, the agent lists the options of merging, submitting a PR, keeping the branch, or discarding the work, and the user chooses how to proceed.\n\n## Who it is for\n\nIt suits individuals or teams that need to keep a coding agent working on longer tasks while maintaining engineering constraints. If a project wants requirements discussion, TDD, code review, and branch wrap-up arranged into a fixed rhythm, it can also be used to unify the execution process.\n\n## Boundaries of use\n\nSuperpowers depends on a compatible coding agent; it is not a standalone coding tool itself. Installation and update methods differ between hosts and need to be maintained separately.\n\nThe project uses the MIT license; enterprise support, add-on tools, and hosting expenses are commercial services. The optional visual companion contacts the Prime Radiant website by default and carries version information, and can be disabled via environment variables such as `SUPERPOWERS_DISABLE_TELEMETRY`."
    },
    "links": [
      {
        "label": "GitHub repository",
        "url": "https://github.com/obra/superpowers",
        "kind": "repository"
      }
    ],
    "cover": "/covers/superpowers-1c4cfd7973.webp"
  }
}
---

## 它解决什么问题

Superpowers 是一组面向编码 Agent 的流程技能。你提出一个功能后，Agent 不会立刻动手改代码，而会先追问需求，把设计分段展示给你确认，再整理成可以逐项执行的计划，随后完成实现、测试和代码审查。

它和直接给 Agent 一句任务描述的区别，在于关键步骤被固定下来，并保留人工确认点。这样可以减少理解偏差、漏测，以及代码尚未验证就宣布完成等情况；使用者仍负责确认方向和决定最终如何处理分支。

## 怎么使用

安装方式取决于宿主。同一套技能已适配 Claude Code、Codex、Cursor、Gemini CLI、Devin CLI、OpenCode、Pi、Hermes Agent 等环境。以 Claude Code 为例：

```text
/plugin install superpowers@claude-plugins-official
```

安装完成后，相关技能会根据任务所处阶段自行触发。如果同时使用多个编码宿主，需要分别安装。Codex App 可从插件页安装，Codex CLI 则通过 `/plugins` 搜索 Superpowers。

## 输入与结果

使用者先说明要实现的功能，并在 Agent 分段给出方案时确认或修正。确认设计后，技能会生成设计文档和细粒度实施计划，再引导 Agent 按任务实现、测试并审查代码。

流程不会替使用者跳过关键决定。进入收尾阶段时，Agent 会列出合并、提交 PR、保留分支或丢弃工作的选项，由使用者选择后续处理方式。

## 适合谁

它适合需要让编码 Agent 持续推进较长任务，同时希望保留工程约束的个人或团队。若项目想把需求讨论、TDD、代码审查和分支收尾安排成固定节奏，也可以用它统一执行过程。

## 使用边界

Superpowers 依赖兼容的编码 Agent，本身不是独立编码工具。不同宿主的安装与更新方式并不相同，需要分别维护。

项目采用 MIT 许可；企业支持、附加工具和托管支出属于商业服务。可选的视觉伴侣默认会请求 Prime Radiant 网站并携带版本信息，可通过 `SUPERPOWERS_DISABLE_TELEMETRY` 等环境变量关闭。
