---
{
  "id": "deer-flow",
  "slug": "deer-flow",
  "blockType": "project",
  "title": "DeerFlow",
  "status": "active",
  "category": "coding",
  "tags": [
    "self-host",
    "china",
    "web",
    "cli",
    "api"
  ],
  "sourceUrl": "https://github.com/bytedance/deer-flow",
  "payload": {
    "summary": {
      "zh": "子 Agent、记忆与沙箱协作，承接数小时研究和编码任务。",
      "en": "Sub-agents, memory, skills, and sandboxes carry research and coding tasks across hours."
    },
    "body": {
      "zh": "## 它是什么\n\nDeerFlow 是一个开源 SuperAgent harness，用来执行可能持续数分钟到数小时的研究、编码和内容生产任务。用户给出目标后，它可以把工作拆给多个子 Agent，在隔离沙箱中运行命令、读写文件和调用工具，同时通过上下文压缩与长期记忆延续任务，最后交付报告、代码或其他成果。\n\n一次典型操作是先配置模型、搜索服务和执行权限，再从网页或终端提交任务并等待各阶段完成。它与常见的一轮问答工具不同，重点不是立即生成一段回复，而是组织多步骤执行；2.0 已从早期 Deep Research 框架彻底重写，定位也转向完整任务编排。\n\n## 怎么运行\n\n仓库提供交互式配置向导。最短的本地启动流程是：\n\n```bash\ngit clone https://github.com/bytedance/deer-flow.git\ncd deer-flow\nmake setup\nmake dev\n```\n\n`make setup` 会生成 `config.yaml`，并将密钥写入 `.env`。正式部署也可使用 Docker，执行 `make up` 后访问 `http://localhost:2026` 进入网页界面。\n\n## 核心机制\n\n- **子 Agent 编排**：主任务可拆分给多个子 Agent，并设置运行数量上限，控制资源消耗。\n- **隔离执行**：命令、文件和工具操作在沙箱中完成，配置时可以收紧权限。\n- **上下文延续**：会话目标、上下文压缩和长期记忆共同保存长任务状态。\n- **技能扩展**：技能和工具规定 Agent 可执行的工作，也可接入 MCP、消息渠道及不同模型服务商。\n\n## 适合谁\n\nDeerFlow 适合希望自行部署研究与编码 Agent 的团队，特别是需要生成报告、处理仓库或连续完成多阶段任务的场景。网页、终端工作台和嵌入式 Python 客户端分别覆盖人工操作与程序接入。\n\n## 使用边界\n\n项目采用 MIT 许可，但运行前仍需配置可用的大模型，外部模型和搜索服务可能收费。开发环境至少建议 4 vCPU、8 GB 内存和 20 GB 空闲磁盘；长期服务器更适合 Linux 与 Docker。Windows 本地开发仅支持 Git Bash，不支持原生 cmd.exe 和 PowerShell。\n\n开放 Bash 或文件写入权限会增加沙箱风险，处理不可信任务时应限制权限。生产环境运行多个 Gateway worker，还依赖 Postgres、Redis 与额外的所有权配置。",
      "en": "## What it is\n\nDeerFlow is an open-source SuperAgent harness built to carry out research, coding, and content-production tasks that may run for minutes to hours. Once you give it a goal, it can split the work across multiple sub-agents, run commands, read and write files, and call tools inside isolated sandboxes, while context compression and long-term memory keep the task going across stages, and finally deliver a report, code, or other output.\n\nA typical run starts by configuring the model, search services, and execution permissions, then submitting a task from the web or the terminal and waiting for each stage to finish. Unlike the usual single-turn question-and-answer tool, its focus is not producing an immediate reply but organizing multi-step execution; 2.0 is a complete rewrite of the earlier Deep Research framework, and its positioning has shifted toward full task orchestration.\n\n## How to run\n\nThe repository provides an interactive configuration wizard. The shortest local startup flow is:\n\n```bash\ngit clone https://github.com/bytedance/deer-flow.git\ncd deer-flow\nmake setup\nmake dev\n```\n\n`make setup` generates `config.yaml` and writes secrets into `.env`. For a formal deployment you can also use Docker: run `make up`, then visit `http://localhost:2026` to enter the web interface.\n\n## Core mechanisms\n\n- **Sub-agent orchestration**: the main task can be split across multiple sub-agents, with an upper limit on how many run at once to control resource consumption.\n- **Isolated execution**: commands, files, and tool operations are carried out in a sandbox, and permissions can be tightened during configuration.\n- **Context continuity**: session goals, context compression, and long-term memory together preserve the state of long-running tasks.\n- **Skill extensions**: skills and tools define what the agent can do, and it can also connect to MCP, messaging channels, and different model providers.\n\n## Who it is for\n\nDeerFlow suits teams that want to deploy their own research and coding agents, especially in scenarios that require generating reports, working on repositories, or completing multi-stage tasks in sequence. The web interface, terminal workspace, and embedded Python client cover manual operation and programmatic integration respectively.\n\n## Usage boundaries\n\nThe project uses the MIT license, but a usable large model still has to be configured before running, and external model and search services may charge fees. For development, at least 4 vCPU, 8 GB of memory, and 20 GB of free disk space are recommended; a long-running server is better suited to Linux with Docker. Local development on Windows only supports Git Bash, not native cmd.exe or PowerShell.\n\nOpening up Bash or file-write permissions increases sandbox risk, so permissions should be restricted when handling untrusted tasks. Running multiple Gateway workers in production also depends on Postgres, Redis, and extra ownership configuration."
    },
    "links": [
      {
        "label": "GitHub Repository",
        "url": "https://github.com/bytedance/deer-flow",
        "kind": "repository"
      },
      {
        "label": "Official Website",
        "url": "https://deerflow.tech/",
        "kind": "official"
      }
    ],
    "cover": "/covers/deer-flow-35a7702502.webp"
  }
}
---

## 它是什么

DeerFlow 是一个开源 SuperAgent harness，用来执行可能持续数分钟到数小时的研究、编码和内容生产任务。用户给出目标后，它可以把工作拆给多个子 Agent，在隔离沙箱中运行命令、读写文件和调用工具，同时通过上下文压缩与长期记忆延续任务，最后交付报告、代码或其他成果。

一次典型操作是先配置模型、搜索服务和执行权限，再从网页或终端提交任务并等待各阶段完成。它与常见的一轮问答工具不同，重点不是立即生成一段回复，而是组织多步骤执行；2.0 已从早期 Deep Research 框架彻底重写，定位也转向完整任务编排。

## 怎么运行

仓库提供交互式配置向导。最短的本地启动流程是：

```bash
git clone https://github.com/bytedance/deer-flow.git
cd deer-flow
make setup
make dev
```

`make setup` 会生成 `config.yaml`，并将密钥写入 `.env`。正式部署也可使用 Docker，执行 `make up` 后访问 `http://localhost:2026` 进入网页界面。

## 核心机制

- **子 Agent 编排**：主任务可拆分给多个子 Agent，并设置运行数量上限，控制资源消耗。
- **隔离执行**：命令、文件和工具操作在沙箱中完成，配置时可以收紧权限。
- **上下文延续**：会话目标、上下文压缩和长期记忆共同保存长任务状态。
- **技能扩展**：技能和工具规定 Agent 可执行的工作，也可接入 MCP、消息渠道及不同模型服务商。

## 适合谁

DeerFlow 适合希望自行部署研究与编码 Agent 的团队，特别是需要生成报告、处理仓库或连续完成多阶段任务的场景。网页、终端工作台和嵌入式 Python 客户端分别覆盖人工操作与程序接入。

## 使用边界

项目采用 MIT 许可，但运行前仍需配置可用的大模型，外部模型和搜索服务可能收费。开发环境至少建议 4 vCPU、8 GB 内存和 20 GB 空闲磁盘；长期服务器更适合 Linux 与 Docker。Windows 本地开发仅支持 Git Bash，不支持原生 cmd.exe 和 PowerShell。

开放 Bash 或文件写入权限会增加沙箱风险，处理不可信任务时应限制权限。生产环境运行多个 Gateway worker，还依赖 Postgres、Redis 与额外的所有权配置。
