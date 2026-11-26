---
{
  "id": "caveman",
  "slug": "caveman",
  "blockType": "skill",
  "title": "Caveman",
  "status": "active",
  "category": "coding",
  "tags": [
    "self-host",
    "free",
    "cli"
  ],
  "sourceUrl": "https://github.com/JuliusBrussee/caveman",
  "payload": {
    "summary": {
      "zh": "编码 Agent 回复压短、代码报错不动，简短任务反而更费 token。",
      "en": "Compresses coding-agent replies, keeping code and errors exact; short tasks may end up costing more tokens."
    },
    "body": {
      "zh": "## 它解决什么问题\n\nCaveman 是编码 Agent 用的表达压缩 skill：装上后，Agent 回复里只有解释、铺垫和行动说明被压短，代码、命令、文件名和报错一字不改，口号是「why use many token when few token do trick」。典型操作是照常丢一个排错问题，返回的结论和修改动作靠前、铺垫删掉，官方示例里同一段 React 排错结论从 69 个 token 压到 19 个。\n\n它和直接让模型「简短回答」的区别在于规则明确、可调档、可关闭，且不碰代码与报错原文，输出仍是可执行指令而非摘要。排错结论、提交信息和代码审查这类低铺垫文本最划算。\n\n## 怎么使用\n\n通过 skills 安装器装进兼容 Agent：\n\n```bash\nnpx skills add JuliusBrussee/caveman\n```\n\n装 CLI 后还能一键接管多种编码 Agent：`npm install -g @caveman-ai/cli && caveman setup --install`，之后 `caveman claude`、`caveman codex`、`caveman gemini` 等命令以压缩模式启动。Claude Code 也支持插件市场方式：`claude plugin marketplace add JuliusBrussee/caveman`。压缩强度用斜杠命令切换：`/caveman` 默认档，`/caveman lite`、`/caveman full`、`/caveman ultra` 调档，`wenyan` 系列改成文言风格，`/caveman off` 退出。\n\n## 输入与结果\n\n照常提交编程、调试或代码审查任务，返回内容去掉解释性铺垫，突出结论、修改说明和可执行行动，代码与报错保持原样。附加命令包括 `caveman mem remember|recall`（压缩记忆）、`caveman browse`（读网页）、`caveman convert`（把 SKILL.md 渲染成图片省 token）和一组 MCP 工具。仓库还带一个本地代理按 json、log、code、diff 等类型先压请求再转发，官方基准称可省约 33% 的 provider 报告输入 token。代理、引擎与 MCP server 属于另一套运行时，不随 skill 的 MIT 许可走。\n\n## 适合谁\n\n适合常读 Claude Code、Codex、Gemini CLI、Aider、opencode 等编码 Agent 长输出的人。调试结论和提交信息铺垫少、要点多，压缩后更好扫读。多 Agent 协作时，缩短子 Agent 回传也能减少上下文占用。\n\n## 使用边界\n\nskill 本体 MIT、本地运行、免费；代理与引擎等运行时是 BSL-1.1 源码可用许可，2030-06-21 或该版本首发四年后转 Apache-2.0。它省的是输出 token，推理 token 不减，且每轮提示多花约 1–1.5k 输入 token，任务本身很短时反而得不偿失。CLI 默认上报匿名使用统计，不上报提示词、代码或文件路径，可用 `caveman telemetry off` 或 `DO_NOT_TRACK=1` 关闭。",
      "en": "## What problem does it solve\n\nCaveman is an expression-compression skill for coding agents: once installed, only the explanations, preamble, and action notes in agent replies are shortened — code, commands, file names, and error messages stay word for word. Its tagline is \"why use many token when few token do trick\". Typical use: you drop in a debugging question as usual, and the answer comes back with the conclusion and the edit actions up front and the preamble cut; in the official example, the same React debugging conclusion shrinks from 69 tokens to 19.\n\nThe difference from simply telling the model to \"answer briefly\" is that the rules are explicit, the level is adjustable, it can be turned off, and it never touches code or verbatim error text — the output is still executable instructions rather than a summary. Low-preamble text such as debugging conclusions, commit messages, and code review pays off the most.\n\n## How to use\n\nInstall it into a compatible agent through the skills installer:\n\n```bash\nnpx skills add JuliusBrussee/caveman\n```\n\nAfter installing the CLI you can also take over several coding agents at once: `npm install -g @caveman-ai/cli && caveman setup --install`, after which commands such as `caveman claude`, `caveman codex`, and `caveman gemini` start in compressed mode. Claude Code also supports the plugin marketplace route: `claude plugin marketplace add JuliusBrussee/caveman`. Compression strength is switched with slash commands: `/caveman` for the default level, `/caveman lite`, `/caveman full`, and `/caveman ultra` to change levels, the `wenyan` family switches to a classical Chinese style, and `/caveman off` exits.\n\n## Input and result\n\nSubmit coding, debugging, or code-review tasks as usual; the response drops explanatory preamble and highlights the conclusion, the change notes, and executable actions, while code and error messages stay as they are. Extra commands include `caveman mem remember|recall` (compressed memory), `caveman browse` (read web pages), `caveman convert` (render SKILL.md as an image to save tokens), and a set of MCP tools. The repository also ships a local proxy that compresses requests by type — json, log, code, diff — before forwarding them; the official benchmark claims it saves about 33% of provider-reported input tokens. The proxy, engine, and MCP server belong to a separate runtime and are not covered by the skill's MIT license.\n\n## Who it's for\n\nSuitable for anyone who often reads long output from coding agents such as Claude Code, Codex, Gemini CLI, Aider, and opencode. Debugging conclusions and commit messages have little preamble and many key points, so they are easier to scan after compression. In multi-agent collaboration, shortening what subagents send back also reduces context usage.\n\n## Usage boundaries\n\nThe skill itself is MIT, runs locally, and is free; the runtime pieces such as the proxy and engine are under the BSL-1.1 source-available license, converting to Apache-2.0 on 2030-06-21 or four years after the first release of that version. What it saves is output tokens; reasoning tokens are not reduced, and each turn's prompt costs about 1–1.5k more input tokens, so for very short tasks it ends up costing more than it saves. The CLI reports anonymous usage statistics by default — not prompts, code, or file paths — and this can be turned off with `caveman telemetry off` or `DO_NOT_TRACK=1`."
    },
    "links": [
      {
        "label": "GitHub repository",
        "url": "https://github.com/JuliusBrussee/caveman",
        "kind": "repository"
      },
      {
        "label": "Documentation",
        "url": "https://docs.caveman.so/docs/quickstart",
        "kind": "docs"
      }
    ],
    "cover": "/covers/caveman-9c5bed30fb.webp"
  }
}
---

## 它解决什么问题

Caveman 是编码 Agent 用的表达压缩 skill：装上后，Agent 回复里只有解释、铺垫和行动说明被压短，代码、命令、文件名和报错一字不改，口号是「why use many token when few token do trick」。典型操作是照常丢一个排错问题，返回的结论和修改动作靠前、铺垫删掉，官方示例里同一段 React 排错结论从 69 个 token 压到 19 个。

它和直接让模型「简短回答」的区别在于规则明确、可调档、可关闭，且不碰代码与报错原文，输出仍是可执行指令而非摘要。排错结论、提交信息和代码审查这类低铺垫文本最划算。

## 怎么使用

通过 skills 安装器装进兼容 Agent：

```bash
npx skills add JuliusBrussee/caveman
```

装 CLI 后还能一键接管多种编码 Agent：`npm install -g @caveman-ai/cli && caveman setup --install`，之后 `caveman claude`、`caveman codex`、`caveman gemini` 等命令以压缩模式启动。Claude Code 也支持插件市场方式：`claude plugin marketplace add JuliusBrussee/caveman`。压缩强度用斜杠命令切换：`/caveman` 默认档，`/caveman lite`、`/caveman full`、`/caveman ultra` 调档，`wenyan` 系列改成文言风格，`/caveman off` 退出。

## 输入与结果

照常提交编程、调试或代码审查任务，返回内容去掉解释性铺垫，突出结论、修改说明和可执行行动，代码与报错保持原样。附加命令包括 `caveman mem remember|recall`（压缩记忆）、`caveman browse`（读网页）、`caveman convert`（把 SKILL.md 渲染成图片省 token）和一组 MCP 工具。仓库还带一个本地代理按 json、log、code、diff 等类型先压请求再转发，官方基准称可省约 33% 的 provider 报告输入 token。代理、引擎与 MCP server 属于另一套运行时，不随 skill 的 MIT 许可走。

## 适合谁

适合常读 Claude Code、Codex、Gemini CLI、Aider、opencode 等编码 Agent 长输出的人。调试结论和提交信息铺垫少、要点多，压缩后更好扫读。多 Agent 协作时，缩短子 Agent 回传也能减少上下文占用。

## 使用边界

skill 本体 MIT、本地运行、免费；代理与引擎等运行时是 BSL-1.1 源码可用许可，2030-06-21 或该版本首发四年后转 Apache-2.0。它省的是输出 token，推理 token 不减，且每轮提示多花约 1–1.5k 输入 token，任务本身很短时反而得不偿失。CLI 默认上报匿名使用统计，不上报提示词、代码或文件路径，可用 `caveman telemetry off` 或 `DO_NOT_TRACK=1` 关闭。
