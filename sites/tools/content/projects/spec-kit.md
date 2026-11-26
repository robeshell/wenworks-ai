---
{
  "id": "spec-kit",
  "slug": "spec-kit",
  "blockType": "project",
  "title": "Spec Kit",
  "status": "active",
  "category": "coding",
  "tags": [
    "self-host",
    "free",
    "cli"
  ],
  "sourceUrl": "https://github.com/github/spec-kit",
  "payload": {
    "summary": {
      "zh": "用本地 CLI 把需求逐步变成计划、任务与实现",
      "en": "A local CLI turns requirements into plans and tasks before an AI coding agent implements them."
    },
    "body": {
      "zh": "## 它是什么\n\nSpec Kit 是一套配合 AI 编码 Agent 使用的规格驱动开发工具包。你先写明项目原则和功能需求，它再把需求逐步整理成技术计划与可执行任务，最后交给 Agent 编码，并检查实现是否符合前面的约定。\n\n一次典型操作不是输入一段提示后直接等待代码生成，而是依次完成规格、计划、任务和实现。与常见的一次性提示相比，这种方式多了可检查、可修改的中间产物，需求变化或实现偏离时，可以回到对应阶段调整，而不必只靠补充提示反复纠正。\n\n## 怎么运行\n\n项目通过 Specify CLI 初始化。运行前需要安装 `uv`，并准备一个受支持的 AI 编码 Agent。CLI 可从 PyPI 安装：\n\n```bash\nuv tool install specify-cli\nspecify init my-project --integration copilot\ncd my-project\n```\n\n初始化后，项目中会写入对应 Agent 使用的命令或技能。接着在 Agent 中依次执行规格、计划、任务和实现命令。若当前环境没有交互式终端，可在 `specify init` 后添加 `--non-interactive`。\n\n## 核心机制\n\n- **项目宪法**：先记录代码质量、测试、体验和性能等长期原则，之后生成的规格、计划、任务与实现都要遵守这些约束。\n- **分阶段产物**：使用 `/speckit.specify` 整理需求，接着通过 `/speckit.plan` 制订技术方案，再由 `/speckit.tasks` 拆成任务，最后运行 `/speckit.implement` 执行。\n- **收敛检查**：`/speckit.converge` 会对照规格、计划和任务检查代码，并把尚未完成的工作追加回任务列表，供后续继续处理。\n- **分层定制**：项目覆盖、Preset、Extension 和核心模板按优先级解析。Bundle 可以把扩展、预设和流程组合成带版本的团队配置。\n\n## 适合谁\n\n它适合希望 AI Agent 按明确需求开发新功能的团队，也适合改造已有工程、需要保留规格与实现对应关系的开发者。若组织希望统一需求格式、技术计划和任务拆解方式，可以使用 Preset 与 Bundle 固化约定。\n\n## 使用边界\n\nSpec Kit 不替代编码 Agent，实现质量仍取决于所选模型、Agent 集成和输入规格。它通过本机 CLI 运行，安装依赖 `uv`。社区扩展由各自作者维护，仓库建议安装前审查源码。项目采用 MIT 许可证。",
      "en": "## What it is\n\nSpec Kit is a spec-driven development toolkit that works alongside an AI coding agent. You first spell out project principles and functional requirements; it then works the requirements up step by step into a technical plan and executable tasks, and finally hands them to the agent to code, checking whether the implementation matches the agreements made earlier.\n\nA typical run is not a matter of typing one prompt and waiting for code generation, but of completing specification, plan, tasks, and implementation in order. Compared with the usual one-shot prompt, this approach adds inspectable, editable intermediate artifacts: when requirements change or the implementation drifts, you can go back and adjust the corresponding stage instead of repeatedly correcting things with follow-up prompts.\n\n## How it runs\n\nA project is initialized through the Specify CLI. Before running it you need to install `uv` and prepare a supported AI coding agent. The CLI can be installed from PyPI:\n\n```bash\nuv tool install specify-cli\nspecify init my-project --integration copilot\ncd my-project\n```\n\nAfter initialization, the commands or skills used by the corresponding agent are written into the project. Then you run the specification, plan, tasks, and implementation commands in order inside the agent. If the current environment has no interactive terminal, add `--non-interactive` after `specify init`.\n\n## Core mechanisms\n\n- **Project constitution**: long-term principles such as code quality, testing, experience, and performance are recorded first, and the specifications, plans, tasks, and implementations generated afterwards must comply with these constraints.\n- **Staged artifacts**: use `/speckit.specify` to organize requirements, then `/speckit.plan` to draw up the technical approach, then `/speckit.tasks` to break it into tasks, and finally run `/speckit.implement` to execute.\n- **Convergence check**: `/speckit.converge` checks the code against the specification, plan, and tasks, and appends unfinished work back to the task list for later handling.\n- **Layered customization**: project overrides, Presets, Extensions, and core templates are resolved by priority. Bundles can combine extensions, presets, and workflows into a versioned team configuration.\n\n## Who it is for\n\nIt suits teams that want an AI agent to develop new features according to explicit requirements, and also developers who are reworking an existing codebase and need to keep specifications and implementation corresponding to each other. If an organization wants to standardize requirement formats, technical plans, and the way tasks are broken down, Presets and Bundles can lock those conventions in.\n\n## Boundaries\n\nSpec Kit does not replace a coding agent; implementation quality still depends on the chosen model, the agent integration, and the input specifications. It runs through a local CLI, and installation depends on `uv`. Community extensions are maintained by their respective authors, and the repository recommends reviewing the source before installing. The project uses the MIT license."
    },
    "links": [
      {
        "label": "GitHub repository",
        "url": "https://github.com/github/spec-kit",
        "kind": "repository"
      },
      {
        "label": "Documentation",
        "url": "https://github.github.io/spec-kit/",
        "kind": "docs"
      }
    ],
    "cover": "/covers/spec-kit-e0ad2516b9.webp"
  }
}
---

## 它是什么

Spec Kit 是一套配合 AI 编码 Agent 使用的规格驱动开发工具包。你先写明项目原则和功能需求，它再把需求逐步整理成技术计划与可执行任务，最后交给 Agent 编码，并检查实现是否符合前面的约定。

一次典型操作不是输入一段提示后直接等待代码生成，而是依次完成规格、计划、任务和实现。与常见的一次性提示相比，这种方式多了可检查、可修改的中间产物，需求变化或实现偏离时，可以回到对应阶段调整，而不必只靠补充提示反复纠正。

## 怎么运行

项目通过 Specify CLI 初始化。运行前需要安装 `uv`，并准备一个受支持的 AI 编码 Agent。CLI 可从 PyPI 安装：

```bash
uv tool install specify-cli
specify init my-project --integration copilot
cd my-project
```

初始化后，项目中会写入对应 Agent 使用的命令或技能。接着在 Agent 中依次执行规格、计划、任务和实现命令。若当前环境没有交互式终端，可在 `specify init` 后添加 `--non-interactive`。

## 核心机制

- **项目宪法**：先记录代码质量、测试、体验和性能等长期原则，之后生成的规格、计划、任务与实现都要遵守这些约束。
- **分阶段产物**：使用 `/speckit.specify` 整理需求，接着通过 `/speckit.plan` 制订技术方案，再由 `/speckit.tasks` 拆成任务，最后运行 `/speckit.implement` 执行。
- **收敛检查**：`/speckit.converge` 会对照规格、计划和任务检查代码，并把尚未完成的工作追加回任务列表，供后续继续处理。
- **分层定制**：项目覆盖、Preset、Extension 和核心模板按优先级解析。Bundle 可以把扩展、预设和流程组合成带版本的团队配置。

## 适合谁

它适合希望 AI Agent 按明确需求开发新功能的团队，也适合改造已有工程、需要保留规格与实现对应关系的开发者。若组织希望统一需求格式、技术计划和任务拆解方式，可以使用 Preset 与 Bundle 固化约定。

## 使用边界

Spec Kit 不替代编码 Agent，实现质量仍取决于所选模型、Agent 集成和输入规格。它通过本机 CLI 运行，安装依赖 `uv`。社区扩展由各自作者维护，仓库建议安装前审查源码。项目采用 MIT 许可证。
