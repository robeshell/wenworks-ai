---
{
  "id": "opencode",
  "slug": "opencode",
  "blockType": "project",
  "title": "OpenCode",
  "status": "active",
  "category": "coding",
  "tags": [
    "self-host",
    "free",
    "app",
    "cli"
  ],
  "sourceUrl": "https://github.com/sst/opencode",
  "payload": {
    "summary": {
      "zh": "终端内切换全权限 build 与只读 plan，桌面端仍为 Beta。",
      "en": "A local coding agent with full-access build and read-only plan modes; the desktop app remains beta."
    },
    "body": {
      "zh": "## 它是什么\n\nOpenCode 是安装在本机的开源 AI 编码 Agent。启动后，你可以在终端里让它查看代码库、分析问题、提出修改方案，再根据所选模式编辑文件或运行工程命令；它也提供处于 Beta 阶段的桌面应用。\n\n一次典型操作是先用 plan 模式梳理陌生项目。此时文件编辑默认被拒绝，运行 Bash 命令也要先获得许可。确认方案后，按 `Tab` 切换到 build 模式执行修改。相比把代码复制到普通对话工具，OpenCode 直接围绕本地代码库和工程命令工作；相比始终拥有写入权限的 Agent，它把分析与执行分成权限不同的模式。\n\n## 怎么运行\n\nREADME 提供安装脚本和多个包管理器入口，任选一种执行即可：\n\n```bash\ncurl -fsSL https://opencode.ai/install | bash\nnpm i -g opencode-ai@latest\nbrew install anomalyco/tap/opencode\n```\n\n安装后从终端启动 OpenCode。macOS、Windows 和 Linux 也可下载桌面版本，不过该入口仍标记为 Beta。若已安装旧于 0.1.x 的版本，应先移除旧版本再重新安装。\n\n## 核心机制\n\n- **build 模式**：默认 Agent，拥有完成开发工作的完整权限，用于编辑文件和落实项目改动。\n- **plan 模式**：用于分析与代码探索，默认拒绝文件编辑，执行 Bash 命令前会请求许可。\n- **模式切换**：在界面中按 `Tab` 切换 build 与 plan，使探索和执行处在不同的权限边界内。\n- **通用子 Agent**：复杂搜索或多步任务可使用内置子 Agent，也可以在消息中通过 `@general` 调用。\n\n## 适合谁\n\n它适合希望在终端中连续完成代码库阅读、方案规划和文件修改，同时需要明确区分只读分析与写入操作的开发者。处理陌生项目时，可以先在 plan 中确认结构和改动范围，再切换到 build 执行。\n\n## 使用边界\n\n项目源码采用 MIT 许可，可以在本机安装并自行维护。plan 提供的是默认权限限制，并不替代任务确认；build 拥有完整开发权限，切换前仍应确认当前任务是否允许写文件。桌面应用仍处于 Beta。已读 README 段落未说明模型凭据、模型服务费用或离线推理能力，因此不能据此判断它无需外部模型服务。",
      "en": "## What it is\n\nOpenCode is an open-source AI coding agent installed on your own machine. After starting it, you can have it inspect the codebase, analyze problems, and propose changes in the terminal, then edit files or run engineering commands according to the selected mode; it also offers a desktop app that is still in Beta.\n\nA typical workflow starts by getting oriented in an unfamiliar project in plan mode. In this mode file edits are denied by default, and running Bash commands requires permission first. Once the plan is confirmed, press `Tab` to switch to build mode and apply the changes. Compared with copying code into an ordinary chat tool, OpenCode works directly around the local codebase and engineering commands; compared with an agent that always holds write permission, it separates analysis and execution into modes with different permissions.\n\n## How to run\n\nThe README provides an install script and several package manager entries; pick any one and run it:\n\n```bash\ncurl -fsSL https://opencode.ai/install | bash\nnpm i -g opencode-ai@latest\nbrew install anomalyco/tap/opencode\n```\n\nAfter installation, start OpenCode from the terminal. Desktop versions can also be downloaded for macOS, Windows, and Linux, though that entry point is still marked Beta. If a version older than 0.1.x is already installed, remove the old version first and then reinstall.\n\n## Core mechanics\n\n- **build mode**: the default Agent, with full permissions to complete development work, used for editing files and implementing project changes.\n- **plan mode**: used for analysis and code exploration, denies file edits by default, and requests permission before running Bash commands.\n- **Mode switching**: press `Tab` in the interface to switch between build and plan, keeping exploration and execution within different permission boundaries.\n- **General subagent**: complex searches or multi-step tasks can use the built-in subagent, and can also be invoked in a message via `@general`.\n\n## Who it is for\n\nIt suits developers who want to move continuously through codebase reading, planning, and file changes in the terminal, while clearly distinguishing read-only analysis from write operations. When working on an unfamiliar project, you can first confirm the structure and the scope of changes in plan, then switch to build to execute.\n\n## Boundaries\n\nThe project source uses the MIT license and can be installed and maintained on your own machine. plan provides default permission limits and does not replace confirming the task; build has full development permissions, so before switching you should still confirm whether the current task allows writing files. The desktop app is still in Beta. The README sections that were read do not state model credentials, model service costs, or offline inference capability, so this cannot be used to conclude that it needs no external model service."
    },
    "links": [
      {
        "label": "GitHub repository",
        "url": "https://github.com/sst/opencode",
        "kind": "repository"
      },
      {
        "label": "Official website",
        "url": "https://opencode.ai/",
        "kind": "official"
      },
      {
        "label": "Documentation",
        "url": "https://opencode.ai/docs",
        "kind": "docs"
      }
    ],
    "cover": "/covers/opencode-996a31fea6.webp"
  }
}
---

## 它是什么

OpenCode 是安装在本机的开源 AI 编码 Agent。启动后，你可以在终端里让它查看代码库、分析问题、提出修改方案，再根据所选模式编辑文件或运行工程命令；它也提供处于 Beta 阶段的桌面应用。

一次典型操作是先用 plan 模式梳理陌生项目。此时文件编辑默认被拒绝，运行 Bash 命令也要先获得许可。确认方案后，按 `Tab` 切换到 build 模式执行修改。相比把代码复制到普通对话工具，OpenCode 直接围绕本地代码库和工程命令工作；相比始终拥有写入权限的 Agent，它把分析与执行分成权限不同的模式。

## 怎么运行

README 提供安装脚本和多个包管理器入口，任选一种执行即可：

```bash
curl -fsSL https://opencode.ai/install | bash
npm i -g opencode-ai@latest
brew install anomalyco/tap/opencode
```

安装后从终端启动 OpenCode。macOS、Windows 和 Linux 也可下载桌面版本，不过该入口仍标记为 Beta。若已安装旧于 0.1.x 的版本，应先移除旧版本再重新安装。

## 核心机制

- **build 模式**：默认 Agent，拥有完成开发工作的完整权限，用于编辑文件和落实项目改动。
- **plan 模式**：用于分析与代码探索，默认拒绝文件编辑，执行 Bash 命令前会请求许可。
- **模式切换**：在界面中按 `Tab` 切换 build 与 plan，使探索和执行处在不同的权限边界内。
- **通用子 Agent**：复杂搜索或多步任务可使用内置子 Agent，也可以在消息中通过 `@general` 调用。

## 适合谁

它适合希望在终端中连续完成代码库阅读、方案规划和文件修改，同时需要明确区分只读分析与写入操作的开发者。处理陌生项目时，可以先在 plan 中确认结构和改动范围，再切换到 build 执行。

## 使用边界

项目源码采用 MIT 许可，可以在本机安装并自行维护。plan 提供的是默认权限限制，并不替代任务确认；build 拥有完整开发权限，切换前仍应确认当前任务是否允许写文件。桌面应用仍处于 Beta。已读 README 段落未说明模型凭据、模型服务费用或离线推理能力，因此不能据此判断它无需外部模型服务。
