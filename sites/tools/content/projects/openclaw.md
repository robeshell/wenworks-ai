---
{
  "id": "openclaw",
  "slug": "openclaw",
  "blockType": "project",
  "title": "OpenClaw",
  "status": "active",
  "category": "agent",
  "tags": [
    "self-host",
    "web",
    "app",
    "cli"
  ],
  "sourceUrl": "https://github.com/openclaw/openclaw",
  "payload": {
    "summary": {
      "zh": "本地 Gateway 串起模型、工具与聊天渠道，主机会话需自行设好沙箱。",
      "en": "A local Gateway links models and tools to chat channels, with host access requiring careful sandboxing."
    },
    "body": {
      "zh": "## 它是什么\n\nOpenClaw 是一个运行在个人设备或自有服务器上的开源 AI 助手。完成安装和引导后，使用者可以在 Control UI、终端界面或 WhatsApp、Telegram、Slack、Discord、Signal、iMessage 等渠道发送消息；Gateway 会接收消息，调用已配置的模型和工具，保存会话，再把结果送回原来的入口。\n\n与只能在单独网页中使用、绑定固定模型的常见助手不同，OpenClaw 把模型、工具、会话、消息渠道和伴随应用集中接到一个 Gateway。模型可以来自托管服务或本地环境，同一套程序既可供个人长期运行，也可部署给彼此信任的小团队。\n\n## 怎么运行\n\n安装器支持 macOS、Linux 与 Windows；缺少合适的 Node.js 时，也会处理运行时。最短流程是安装程序、完成引导、确认 Gateway 状态，然后打开控制界面：\n\n```bash\ncurl -fsSL https://openclaw.ai/install.sh | bash\nopenclaw onboard --install-daemon\nopenclaw gateway status\nopenclaw dashboard\n```\n\nWindows 可使用官方 PowerShell 安装脚本。自行管理 Node.js 时，也可安装发布到 npm 的 `openclaw` 包。仓库开发使用 pnpm workspace，不能在根目录直接运行 `npm install`。\n\n## 核心机制\n\n- **本地控制面**：Gateway 管理会话、工具、事件和渠道连接，网页控制台、CLI 与 TUI 都通过它工作。\n- **渠道接入**：同一个助手可以出现在日常聊天工具中，不必把交互固定在独立网页里。\n- **设备能力**：伴随应用和节点可接入语音、Canvas、摄像头、屏幕及设备本地操作。\n- **扩展体系**：工具、skills 和插件用于增加能力，模型层兼容托管与本地来源。\n\n## 适合谁\n\n它适合希望助手长期运行在自己的电脑上，并能从常用聊天软件随时调用的人。若要为彼此信任的小团队维护共享助手，也可以继续使用同一 Gateway，并按需要调整配置。\n\n## 使用边界\n\n项目采用 MIT 许可，模型费用则取决于接入的模型服务商。主会话中的工具默认在宿主机运行，因此外部消息必须作为不可信输入处理。连接其他用户或把 Gateway 暴露到公网前，需要配置配对、访问策略和沙箱。团队模式适用于成员彼此信任的环境，并不等同于默认具备多租户隔离的公共服务。",
      "en": "## What it is\n\nOpenClaw is an open-source AI assistant that runs on a personal device or your own server. After installation and onboarding, you can send messages from the Control UI, the terminal interface, or channels such as WhatsApp, Telegram, Slack, Discord, Signal and iMessage; the Gateway receives the message, calls the configured models and tools, saves the session, and sends the result back to the original entry point.\n\nUnlike the common assistants that work only in a standalone web page and are tied to a fixed model, OpenClaw connects models, tools, sessions, message channels and companion apps to a single Gateway. Models can come from hosted services or a local environment, and the same program can both run long-term for an individual and be deployed for a small group of people who trust one another.\n\n## How it runs\n\nThe installer supports macOS, Linux and Windows; when a suitable Node.js is missing, it also handles the runtime. The shortest path is to install the program, complete onboarding, confirm the Gateway status, and then open the control interface:\n\n```bash\ncurl -fsSL https://openclaw.ai/install.sh | bash\nopenclaw onboard --install-daemon\nopenclaw gateway status\nopenclaw dashboard\n```\n\nWindows can use the official PowerShell install script. If you manage Node.js yourself, you can also install the `openclaw` package published to npm. Repository development uses a pnpm workspace, and `npm install` cannot be run directly in the root directory.\n\n## Core mechanics\n\n- **Local control plane**: the Gateway manages sessions, tools, events and channel connections, and the web console, CLI and TUI all work through it.\n- **Channel access**: the same assistant can appear in everyday chat tools, so interaction does not have to be fixed in a standalone web page.\n- **Device capabilities**: companion apps and nodes can connect voice, Canvas, camera, screen and local device operations.\n- **Extension system**: tools, skills and plugins are used to add capabilities, and the model layer is compatible with both hosted and local sources.\n\n## Who it is for\n\nIt suits people who want the assistant to run long-term on their own computer and to be callable at any time from the chat software they use every day. If you want to maintain a shared assistant for a small group of people who trust one another, you can also keep using the same Gateway and adjust the configuration as needed.\n\n## Usage boundaries\n\nThe project uses the MIT license, while model costs depend on the model provider you connect. Tools in the main session run on the host machine by default, so external messages must be treated as untrusted input. Before connecting other users or exposing the Gateway to the public internet, you need to configure pairing, access policies and sandboxing. Team mode is intended for environments where members trust one another, and it is not equivalent to a public service that has multi-tenant isolation by default."
    },
    "links": [
      {
        "label": "GitHub Repository",
        "url": "https://github.com/openclaw/openclaw",
        "kind": "repository"
      },
      {
        "label": "Website",
        "url": "https://openclaw.ai/",
        "kind": "official"
      },
      {
        "label": "Documentation",
        "url": "https://docs.openclaw.ai/",
        "kind": "docs"
      }
    ],
    "cover": "/covers/openclaw-d51830cafd.webp"
  }
}
---

## 它是什么

OpenClaw 是一个运行在个人设备或自有服务器上的开源 AI 助手。完成安装和引导后，使用者可以在 Control UI、终端界面或 WhatsApp、Telegram、Slack、Discord、Signal、iMessage 等渠道发送消息；Gateway 会接收消息，调用已配置的模型和工具，保存会话，再把结果送回原来的入口。

与只能在单独网页中使用、绑定固定模型的常见助手不同，OpenClaw 把模型、工具、会话、消息渠道和伴随应用集中接到一个 Gateway。模型可以来自托管服务或本地环境，同一套程序既可供个人长期运行，也可部署给彼此信任的小团队。

## 怎么运行

安装器支持 macOS、Linux 与 Windows；缺少合适的 Node.js 时，也会处理运行时。最短流程是安装程序、完成引导、确认 Gateway 状态，然后打开控制界面：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw onboard --install-daemon
openclaw gateway status
openclaw dashboard
```

Windows 可使用官方 PowerShell 安装脚本。自行管理 Node.js 时，也可安装发布到 npm 的 `openclaw` 包。仓库开发使用 pnpm workspace，不能在根目录直接运行 `npm install`。

## 核心机制

- **本地控制面**：Gateway 管理会话、工具、事件和渠道连接，网页控制台、CLI 与 TUI 都通过它工作。
- **渠道接入**：同一个助手可以出现在日常聊天工具中，不必把交互固定在独立网页里。
- **设备能力**：伴随应用和节点可接入语音、Canvas、摄像头、屏幕及设备本地操作。
- **扩展体系**：工具、skills 和插件用于增加能力，模型层兼容托管与本地来源。

## 适合谁

它适合希望助手长期运行在自己的电脑上，并能从常用聊天软件随时调用的人。若要为彼此信任的小团队维护共享助手，也可以继续使用同一 Gateway，并按需要调整配置。

## 使用边界

项目采用 MIT 许可，模型费用则取决于接入的模型服务商。主会话中的工具默认在宿主机运行，因此外部消息必须作为不可信输入处理。连接其他用户或把 Gateway 暴露到公网前，需要配置配对、访问策略和沙箱。团队模式适用于成员彼此信任的环境，并不等同于默认具备多租户隔离的公共服务。
