---
{
  "id": "wegent",
  "slug": "wegent",
  "blockType": "project",
  "title": "Wegent",
  "status": "active",
  "category": "coding",
  "tags": [
    "self-host",
    "china",
    "free",
    "web",
    "app"
  ],
  "sourceUrl": "https://github.com/wecode-ai/Wegent",
  "payload": {
    "summary": {
      "zh": "桌面端驱动 Codex 干本地活，网页端跑远程 Agent 与团队项目",
      "en": "Desktop drives Codex locally; web adds remote agents, knowledge, and shared team projects."
    },
    "body": {
      "zh": "## 它是什么\n\nWegent 是 wecode-ai 团队开源的 AI 工作系统，把本地桌面、云端 Agent 和远程机器收进同一套项目空间。桌面端 Wegent Desktop 是以 Codex 为执行内核的本地编码工作台；网页端 Wegent Web 提供浏览器里的远程 Agent、知识检索、自动化和后台管理；Backend 负责把两端接到共享项目空间、模型和执行设备上。\n\n## 怎么运行\n\n桌面端去 releases 页下安装包，装完打开、选本地项目、建任务并描述要干的活，然后在同一个工作台里审阅 Agent 活动、命令输出和改动 diff。自托管 Web 与后端走 Docker 一键启动：\n\n```bash\ncurl -fsSL https://raw.githubusercontent.com/wecode-ai/Wegent/main/install.sh | bash -s -- --standalone\n```\n\n启动后打开 http://localhost:3000 走初始化流程，设置管理员密码并配置模型。想从源码跑开发环境，需要 Node.js 20+ 和 pnpm：\n\n```bash\npnpm install\npnpm --filter wework dev\n```\n\n## 核心机制\n\n- **Executor 驱动 Codex**：Executor 是任务执行层，管任务的创建、会话跟进和事件收发；真正写代码的是 Codex，直接读改本地项目里的文件、命令和开发环境。\n- **DSH 插件运行时**：桌面界面由 DeepSeek Harness 的一组插件拼成，DSH 自身不执行编码任务，只负责插件发现、依赖注入、生命周期管理，以及桥接 Electron 的受限能力和本地终端。\n- **多执行目标**：同一个项目既能本机跑，也能交到远程工作机或服务端托管的 Executor，任务板、共享文件、自动化执行记录和交付物都汇到项目空间。\n- **Web 与桌面共用后端**：浏览器里的远程 Agent 复用同一套模型、知识、Skills 和工具，Backend 统一管权限、调度、计划与知识服务。\n\n## 适合谁\n\n长期只在一台电脑上写代码的人，桌面端就是熟悉的 Codex 编码体验，不部署任何服务直接用。要把编码工作从单机扩展到多人协作的团队，则自托管 Web 和后端，把任务、文件、讨论和执行状态收到一起，还能给重复的项目工作配自动化队列。\n\n## 使用边界\n\n- 编码执行以 Codex 为内核，最终能力受所配置模型和 Codex 本身影响。\n- Web 与后端要自己运维，Docker 是最快路径，权限、调度、知识服务都在自托管范围内。\n- 项目仍在活跃迭代，接口与版本会变；桌面安装包按平台发布，以 releases 页为准。\n- 开源免费，无商业支持承诺，社区在 DingTalk 与 Discord。",
      "en": "## What it is\n\nWegent is an open-source AI work system from the wecode-ai team that brings the local desktop, cloud Agent, and remote machines into one shared project space. The desktop side, Wegent Desktop, is a local coding workbench with Codex as its execution core; the web side, Wegent Web, provides remote Agents, knowledge retrieval, automation, and admin management in the browser; the Backend connects both ends to shared project spaces, models, and execution devices.\n\n## How to run it\n\nFor the desktop, download the installer from the releases page, open it, pick a local project, create a task and describe the work to be done, then review Agent activity, command output, and change diffs in the same workbench. Self-hosted Web and Backend start with a single Docker command:\n\n```bash\ncurl -fsSL https://raw.githubusercontent.com/wecode-ai/Wegent/main/install.sh | bash -s -- --standalone\n```\n\nAfter it starts, open http://localhost:3000 to go through the initialization flow, set an admin password, and configure models. To run the development environment from source, you need Node.js 20+ and pnpm:\n\n```bash\npnpm install\npnpm --filter wework dev\n```\n\n## Core mechanics\n\n- **Executor drives Codex**: Executor is the task execution layer, handling task creation, session follow-up, and event dispatch; the one that actually writes code is Codex, reading and modifying files, commands, and the development environment in the local project directly.\n- **DSH plugin runtime**: The desktop interface is assembled from a set of DeepSeek Harness plugins; DSH itself does not execute coding tasks, it only handles plugin discovery, dependency injection, lifecycle management, and bridging Electron's restricted capabilities and the local terminal.\n- **Multiple execution targets**: The same project can run locally or be handed to a remote work machine or a server-hosted Executor; task boards, shared files, automation run records, and deliverables all converge in the project space.\n- **Web and desktop share the Backend**: Remote Agents in the browser reuse the same models, knowledge, Skills, and tools, while the Backend centrally manages permissions, scheduling, plans, and knowledge services.\n\n## Who it is for\n\nFor people who write code on a single computer over the long term, the desktop is the familiar Codex coding experience, usable directly without deploying any service. For teams that want to extend coding work from a single machine to multi-person collaboration, self-host Web and Backend to collect tasks, files, discussions, and execution status in one place, and also set up automation queues for repetitive project work.\n\n## Limits\n\n- Coding execution uses Codex as its core, so the final capability depends on the configured model and on Codex itself.\n- Web and Backend are yours to operate, with Docker as the fastest path; permissions, scheduling, and knowledge services all fall within the self-hosted scope.\n- The project is still under active iteration, so interfaces and versions will change; desktop installers are released per platform, as listed on the releases page.\n- Open source and free, with no commercial support commitment; the community is on DingTalk and Discord."
    },
    "links": [
      {
        "label": "GitHub 仓库",
        "url": "https://github.com/wecode-ai/Wegent",
        "kind": "repository"
      },
      {
        "label": "官方文档",
        "url": "https://wecode-ai.github.io/wegent-docs/",
        "kind": "docs"
      }
    ],
    "cover": "/covers/wegent-08c20810fb.webp"
  }
}
---

## 它是什么

Wegent 是 wecode-ai 团队开源的 AI 工作系统，把本地桌面、云端 Agent 和远程机器收进同一套项目空间。桌面端 Wegent Desktop 是以 Codex 为执行内核的本地编码工作台；网页端 Wegent Web 提供浏览器里的远程 Agent、知识检索、自动化和后台管理；Backend 负责把两端接到共享项目空间、模型和执行设备上。

## 怎么运行

桌面端去 releases 页下安装包，装完打开、选本地项目、建任务并描述要干的活，然后在同一个工作台里审阅 Agent 活动、命令输出和改动 diff。自托管 Web 与后端走 Docker 一键启动：

```bash
curl -fsSL https://raw.githubusercontent.com/wecode-ai/Wegent/main/install.sh | bash -s -- --standalone
```

启动后打开 http://localhost:3000 走初始化流程，设置管理员密码并配置模型。想从源码跑开发环境，需要 Node.js 20+ 和 pnpm：

```bash
pnpm install
pnpm --filter wework dev
```

## 核心机制

- **Executor 驱动 Codex**：Executor 是任务执行层，管任务的创建、会话跟进和事件收发；真正写代码的是 Codex，直接读改本地项目里的文件、命令和开发环境。
- **DSH 插件运行时**：桌面界面由 DeepSeek Harness 的一组插件拼成，DSH 自身不执行编码任务，只负责插件发现、依赖注入、生命周期管理，以及桥接 Electron 的受限能力和本地终端。
- **多执行目标**：同一个项目既能本机跑，也能交到远程工作机或服务端托管的 Executor，任务板、共享文件、自动化执行记录和交付物都汇到项目空间。
- **Web 与桌面共用后端**：浏览器里的远程 Agent 复用同一套模型、知识、Skills 和工具，Backend 统一管权限、调度、计划与知识服务。

## 适合谁

长期只在一台电脑上写代码的人，桌面端就是熟悉的 Codex 编码体验，不部署任何服务直接用。要把编码工作从单机扩展到多人协作的团队，则自托管 Web 和后端，把任务、文件、讨论和执行状态收到一起，还能给重复的项目工作配自动化队列。

## 使用边界

- 编码执行以 Codex 为内核，最终能力受所配置模型和 Codex 本身影响。
- Web 与后端要自己运维，Docker 是最快路径，权限、调度、知识服务都在自托管范围内。
- 项目仍在活跃迭代，接口与版本会变；桌面安装包按平台发布，以 releases 页为准。
- 开源免费，无商业支持承诺，社区在 DingTalk 与 Discord。
