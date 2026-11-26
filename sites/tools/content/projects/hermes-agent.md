---
{
  "id": "hermes-agent",
  "slug": "hermes-agent",
  "blockType": "project",
  "title": "Hermes Agent",
  "status": "active",
  "category": "agent",
  "tags": [
    "self-host",
    "cli"
  ],
  "sourceUrl": "https://github.com/NousResearch/hermes-agent",
  "payload": {
    "summary": {
      "zh": "记忆与技能学习环跨会话积累，可在本机、远端或消息平台工作",
      "en": "Its memory and skill loop learns across sessions, running locally, remotely, or through messaging apps."
    },
    "body": {
      "zh": "## 它是什么\n\nHermes Agent 是 Nous Research 开源的个人 AI Agent。你可以在终端里交给它一个任务，它会调用 shell 和外部工具执行，把任务过程保存为会话；遇到可复用的做法时，还能创建技能，并在以后调用时继续修订。再次处理相关任务，它会搜索历史会话，让过去积累的内容参与当前执行。\n\n它和普通聊天客户端的实际区别，是不只返回一段回答，而是把终端操作、消息入口、长期记忆和技能系统连成执行闭环。模型来源也不与程序绑定，可在 Nous Portal、OpenRouter、OpenAI 或自建端点之间切换。\n\n## 怎么运行\n\nLinux、macOS、WSL2 和 Termux 可运行安装脚本。安装后重新加载 shell，再进入交互式终端：\n\n```bash\ncurl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash\nsource ~/.bashrc\nhermes\n```\n\nWindows 提供原生 PowerShell 安装方式。首次使用可执行 `hermes setup` 配置模型和工具。若要通过 Telegram、Discord、Slack、WhatsApp 或 Signal 下发任务，则启动 `hermes gateway`。\n\n## 核心机制\n\n- **闭环学习**：从复杂任务的执行经历中创建技能，并在后续实际调用时修改技能。\n- **跨会话记忆**：使用 FTS5 检索历史会话，再由模型归纳相关内容，同时维护用户画像。\n- **模型解耦**：用 `hermes model` 更换模型服务，无须修改代码，也可连接自己的兼容端点。\n- **多后端执行**：终端任务可在本机、Docker、SSH、Singularity、Modal、Daytona 或 Vercel Sandbox 中运行；独立子 Agent 可并行处理工作流。\n\n## 适合谁\n\n它适合把 Agent 长期部署在个人服务器、希望通过聊天软件随时提交任务的人，也适合研究 Agent 技能学习、轨迹生成和工具调用流程的团队。内置定时器可用于执行日报、备份、审计等无人值守任务。\n\n## 使用边界\n\n项目采用 MIT 许可，可自行部署，但推理通常仍需要模型服务、自建推理端点或相应 API 密钥。不同执行后端和消息平台需要分别配置。Termux 使用裁剪后的依赖集，因为完整语音依赖目前不兼容 Android。由于 Agent 可以执行 shell 和外部工具，部署时应启用命令审批、容器隔离和消息私聊配对。",
      "en": "## What it is\n\nHermes Agent is an open-source personal AI agent from Nous Research. You can hand it a task in the terminal; it calls the shell and external tools to carry it out and saves the task process as a session. When it runs into a reusable approach, it can also create a skill, and keep revising that skill when it is invoked later. The next time it handles a related task, it searches past sessions so that what was accumulated before takes part in the current run.\n\nWhat actually sets it apart from an ordinary chat client is that it does not just return an answer: it links terminal operations, messaging entry points, long-term memory, and a skill system into a closed execution loop. The model source is not tied to the program either, and can be switched between Nous Portal, OpenRouter, OpenAI, or a self-hosted endpoint.\n\n## How to run it\n\nLinux, macOS, WSL2, and Termux can run the install script. After installing, reload the shell and then start the interactive terminal:\n\n```bash\ncurl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash\nsource ~/.bashrc\nhermes\n```\n\nWindows has a native PowerShell installation path. On first use you can run `hermes setup` to configure the model and tools. To send tasks through Telegram, Discord, Slack, WhatsApp, or Signal, start `hermes gateway`.\n\n## Core mechanics\n\n- **Closed-loop learning**: creates skills from the experience of carrying out complex tasks, and modifies the skills during later real invocations.\n- **Cross-session memory**: retrieves past sessions with FTS5, then has the model summarize the relevant content, while also maintaining a user profile.\n- **Model decoupling**: use `hermes model` to change the model service without modifying code, and you can also connect your own compatible endpoint.\n- **Multi-backend execution**: terminal tasks can run locally, in Docker, over SSH, or in Singularity, Modal, Daytona, or Vercel Sandbox; independent sub-agents can handle workflows in parallel.\n\n## Who it is for\n\nIt suits people who keep an agent deployed long-term on a personal server and want to submit tasks at any time through a messaging app, and also suits teams researching agent skill learning, trajectory generation, and tool-calling flows. The built-in timer can be used for unattended jobs such as daily reports, backups, and audits.\n\n## Boundaries\n\nThe project is MIT-licensed and can be self-deployed, but inference still usually requires a model service, a self-hosted inference endpoint, or the corresponding API key. Different execution backends and messaging platforms need to be configured separately. Termux uses a trimmed dependency set, because the full voice dependencies are not compatible with Android for now. Because the agent can execute shell commands and external tools, you should enable command approval, container isolation, and private-chat pairing for messaging when deploying."
    },
    "links": [
      {
        "label": "GitHub Repository",
        "url": "https://github.com/NousResearch/hermes-agent",
        "kind": "repository"
      },
      {
        "label": "Hermes Agent",
        "url": "https://hermes-agent.nousresearch.com/",
        "kind": "official"
      },
      {
        "label": "Documentation",
        "url": "https://hermes-agent.nousresearch.com/docs",
        "kind": "docs"
      }
    ],
    "cover": "/covers/hermes-agent-0dfa86df35.webp"
  }
}
---

## 它是什么

Hermes Agent 是 Nous Research 开源的个人 AI Agent。你可以在终端里交给它一个任务，它会调用 shell 和外部工具执行，把任务过程保存为会话；遇到可复用的做法时，还能创建技能，并在以后调用时继续修订。再次处理相关任务，它会搜索历史会话，让过去积累的内容参与当前执行。

它和普通聊天客户端的实际区别，是不只返回一段回答，而是把终端操作、消息入口、长期记忆和技能系统连成执行闭环。模型来源也不与程序绑定，可在 Nous Portal、OpenRouter、OpenAI 或自建端点之间切换。

## 怎么运行

Linux、macOS、WSL2 和 Termux 可运行安装脚本。安装后重新加载 shell，再进入交互式终端：

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
source ~/.bashrc
hermes
```

Windows 提供原生 PowerShell 安装方式。首次使用可执行 `hermes setup` 配置模型和工具。若要通过 Telegram、Discord、Slack、WhatsApp 或 Signal 下发任务，则启动 `hermes gateway`。

## 核心机制

- **闭环学习**：从复杂任务的执行经历中创建技能，并在后续实际调用时修改技能。
- **跨会话记忆**：使用 FTS5 检索历史会话，再由模型归纳相关内容，同时维护用户画像。
- **模型解耦**：用 `hermes model` 更换模型服务，无须修改代码，也可连接自己的兼容端点。
- **多后端执行**：终端任务可在本机、Docker、SSH、Singularity、Modal、Daytona 或 Vercel Sandbox 中运行；独立子 Agent 可并行处理工作流。

## 适合谁

它适合把 Agent 长期部署在个人服务器、希望通过聊天软件随时提交任务的人，也适合研究 Agent 技能学习、轨迹生成和工具调用流程的团队。内置定时器可用于执行日报、备份、审计等无人值守任务。

## 使用边界

项目采用 MIT 许可，可自行部署，但推理通常仍需要模型服务、自建推理端点或相应 API 密钥。不同执行后端和消息平台需要分别配置。Termux 使用裁剪后的依赖集，因为完整语音依赖目前不兼容 Android。由于 Agent 可以执行 shell 和外部工具，部署时应启用命令审批、容器隔离和消息私聊配对。
