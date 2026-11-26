---
{
  "id": "reverse-skill",
  "slug": "reverse-skill",
  "blockType": "skill",
  "title": "Reverse-Skill",
  "status": "active",
  "category": "coding",
  "tags": [
    "self-host",
    "china",
    "free",
    "cli"
  ],
  "sourceUrl": "https://github.com/zhaoxuya520/reverse-skill",
  "payload": {
    "summary": {
      "zh": "按任务自动路由逆向/渗透技能，缺工具时自装，经验自动沉淀复用",
      "en": "Routes reverse-engineering and pentest skills to coding agents, bootstrapping missing tools on demand."
    },
    "body": {
      "zh": "## 它解决什么问题\n\n给 Claude Code、Kiro、Cursor、Cline 这类编码 Agent 补一套逆向、授权渗透测试与安全研究技能。不用它时，Agent 遇到逆向任务常不知道调哪个工具、缺依赖也不知道装，半路就卡住。这个包把技能按任务类型组织成路由表，命中后自动选对应技能并补齐运行环境。\n\n## 怎么使用\n\n以技能包形式装进 AI 编码客户端：仓库自带 `skills` 目录以及 `AGENTS.md`、`CLAUDE.md` 等配置文件，把仓库目录指给支持的客户端即可启用。README 没有给出单一安装命令，各客户端的技能加载方式以各自文档为准；克隆仓库后按客户端要求接入 `skills` 目录即可。\n\n## 输入与结果\n\n给它一个逆向、渗透或安全研究任务描述，Agent 按路由匹配技能；需要时按需自举工具链，例如调用 Kali 相关工具链、Burp MCP 等配套组件。任务过程与结论会沉淀到 `reports` 目录，形成自进化的经验库，同类任务后续直接复用。\n\n## 适合谁\n\n常做二进制逆向、CTF 或授权渗透测试的人，想把这些任务里重复的侦察、环境准备与工具链配置交给编码 Agent 完成。\n\n## 使用边界\n\n> 注意：仓库名与描述明确限定为\"授权\"渗透测试与安全研究，不要拿它打未授权的目标。\n\n技能包本身开源免费，可本地部署进自己的 Agent；实际能力取决于所挂载的编码 Agent，以及本地是否备好 Kali、Burp 等外部工具，不是所有技能开箱即用。",
      "en": "## What problem it solves\n\nIt adds a set of reverse engineering, authorized penetration testing, and security research skills to coding agents such as Claude Code, Kiro, Cursor, and Cline. Without it, an agent facing a reverse engineering task often doesn't know which tool to call, and doesn't know to install missing dependencies, so it gets stuck halfway. This package organizes skills into a routing table by task type; once a match is hit, it automatically picks the corresponding skill and sets up the runtime environment.\n\n## How to use it\n\nIt installs into AI coding clients as a skill package: the repository ships a `skills` directory along with configuration files such as `AGENTS.md` and `CLAUDE.md`; just point the repository directory at a supported client to enable it. The README does not give a single install command, so how each client loads skills follows that client's own documentation; after cloning the repository, connect the `skills` directory as the client requires.\n\n## Input and results\n\nGive it a description of a reverse engineering, penetration testing, or security research task, and the agent matches skills through the routing table; when needed, it bootstraps the toolchain on demand, for example calling the Kali toolchain, Burp MCP, and other accompanying components. The task process and conclusions are recorded in the `reports` directory, forming a self-evolving knowledge base that later similar tasks can reuse directly.\n\n## Who it's for\n\nPeople who often do binary reverse engineering, CTF, or authorized penetration testing, and want to hand the repetitive reconnaissance, environment preparation, and toolchain configuration in these tasks to a coding agent.\n\n## Boundaries of use\n\n> Note: the repository name and description explicitly limit it to \"authorized\" penetration testing and security research — don't use it against unauthorized targets.\n\nThe skill package itself is open source and free, and can be deployed locally into your own agent; actual capability depends on the coding agent it is mounted on and on whether Kali, Burp, and other external tools are ready locally — not every skill works out of the box.\n"
    },
    "links": [
      {
        "label": "GitHub 仓库",
        "url": "https://github.com/zhaoxuya520/reverse-skill",
        "kind": "repository"
      }
    ],
    "cover": "/covers/reverse-skill-0143f104fa.webp"
  }
}
---

## 它解决什么问题

给 Claude Code、Kiro、Cursor、Cline 这类编码 Agent 补一套逆向、授权渗透测试与安全研究技能。不用它时，Agent 遇到逆向任务常不知道调哪个工具、缺依赖也不知道装，半路就卡住。这个包把技能按任务类型组织成路由表，命中后自动选对应技能并补齐运行环境。

## 怎么使用

以技能包形式装进 AI 编码客户端：仓库自带 `skills` 目录以及 `AGENTS.md`、`CLAUDE.md` 等配置文件，把仓库目录指给支持的客户端即可启用。README 没有给出单一安装命令，各客户端的技能加载方式以各自文档为准；克隆仓库后按客户端要求接入 `skills` 目录即可。

## 输入与结果

给它一个逆向、渗透或安全研究任务描述，Agent 按路由匹配技能；需要时按需自举工具链，例如调用 Kali 相关工具链、Burp MCP 等配套组件。任务过程与结论会沉淀到 `reports` 目录，形成自进化的经验库，同类任务后续直接复用。

## 适合谁

常做二进制逆向、CTF 或授权渗透测试的人，想把这些任务里重复的侦察、环境准备与工具链配置交给编码 Agent 完成。

## 使用边界

> 注意：仓库名与描述明确限定为"授权"渗透测试与安全研究，不要拿它打未授权的目标。

技能包本身开源免费，可本地部署进自己的 Agent；实际能力取决于所挂载的编码 Agent，以及本地是否备好 Kali、Burp 等外部工具，不是所有技能开箱即用。
