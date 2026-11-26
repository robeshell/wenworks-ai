---
{
  "id": "anthropic-agent-skills",
  "slug": "anthropic-agent-skills",
  "blockType": "skill",
  "title": "Anthropic Agent Skills",
  "status": "active",
  "category": "automation",
  "tags": [
    "web",
    "cli",
    "api"
  ],
  "sourceUrl": "https://github.com/anthropics/skills",
  "payload": {
    "summary": {
      "zh": "用独立技能目录固化文档、开发、设计与企业流程。",
      "en": "Self-contained instruction folders teach Claude repeatable workflows across documents, development, design, and enterprise tasks."
    },
    "body": {
      "zh": "## 它解决什么问题\n\nAnthropic Agent Skills 是一套供 Claude 按需读取的任务说明。每个技能单独放在一个目录中，用 `SKILL.md` 保存元数据、触发描述和操作指令，也可以附带脚本与资源。使用者不必在每次对话里重复说明规则、步骤和交付格式，只需选择或点名相应技能。\n\n一次典型操作是：提交任务、输入文件和必要约束，Claude 再加载匹配技能中的指令、脚本与资源，完成文档生成、内容分析或其他产物。它与临时写一段长提示词的区别，在于流程可以按目录保存、复用和检查，也更适合固定团队做事方式。\n\n## 怎么使用\n\n在 Claude Code 中，先把仓库注册为插件市场，再安装文档技能或示例技能：\n\n```text\n/plugin marketplace add anthropics/skills\n/plugin install document-skills@anthropic-agent-skills\n/plugin install example-skills@anthropic-agent-skills\n```\n\n安装完成后，在请求中直接点名对应技能即可触发。Claude.ai 的付费方案已包含这些示例技能；Claude API 也支持调用预置技能或上传自定义技能。\n\n## 输入与结果\n\n输入通常包括任务描述、待处理文件和格式、权限等约束。Claude 会根据所选技能执行规定流程，并输出文档、分析结果或其他任务产物。实际读写范围由技能内容决定，例如 PDF 技能可以读取指定文件并提取表单字段。正式使用前，应先检查 `SKILL.md`、附带脚本以及技能可访问的文件权限。\n\n## 适合谁\n\n它适合希望把团队流程固化给 Claude 执行的人，也适合研究 Agent Skills 目录结构的开发者。仓库提供技能样例、规范目录和基础模板，可用于理解技能如何组织文件、描述触发条件并编写操作指令。\n\n## 使用边界\n\n这个仓库主要用于演示和教学。Anthropic 建议在关键任务前自行测试，Claude 的实际行为可能与样例不同。多数技能采用 Apache 2.0，但 `docx`、`pdf`、`pptx`、`xlsx` 等文档技能仅为源码可见，并非开源；Claude.ai 中的示例技能限付费方案使用。",
      "en": "## What problem it solves\n\nAnthropic Agent Skills is a set of task instructions that Claude reads on demand. Each skill sits in its own directory, using `SKILL.md` to hold metadata, a trigger description, and operating instructions, and it can also come with scripts and resources. Users do not have to repeat rules, steps, and delivery formats in every conversation; they only need to select or name the relevant skill.\n\nA typical run goes like this: submit the task, the input files, and the necessary constraints, and Claude then loads the instructions, scripts, and resources of the matching skill to produce documents, content analysis, or other artifacts. What sets it apart from writing a one-off long prompt is that the workflow can be saved, reused, and reviewed per directory, and it fits a team's fixed way of doing things better.\n\n## How to use it\n\nIn Claude Code, first register the repository as a plugin marketplace, then install the document skills or the example skills:\n\n```text\n/plugin marketplace add anthropics/skills\n/plugin install document-skills@anthropic-agent-skills\n/plugin install example-skills@anthropic-agent-skills\n```\n\nOnce installed, simply name the relevant skill in your request to trigger it. Paid Claude.ai plans already include these example skills; the Claude API also supports calling preset skills or uploading custom skills.\n\n## Inputs and results\n\nInputs usually include the task description, the files to process and their formats, and constraints such as permissions. Claude runs the specified workflow according to the chosen skill and outputs documents, analysis results, or other task artifacts. The actual read and write scope is determined by the skill's contents; a PDF skill, for example, can read a specified file and extract form fields. Before putting it to real use, check `SKILL.md`, the bundled scripts, and the file permissions the skill can access.\n\n## Who it is for\n\nIt suits people who want to codify team workflows for Claude to execute, and also developers studying the directory structure of Agent Skills. The repository provides sample skills, a canonical directory layout, and basic templates that help you understand how a skill organizes files, describes trigger conditions, and writes operating instructions.\n\n## Usage boundaries\n\nThis repository is mainly for demonstration and teaching. Anthropic recommends testing it yourself before critical tasks, since Claude's actual behavior may differ from the samples. Most skills use Apache 2.0, but document skills such as `docx`, `pdf`, `pptx`, and `xlsx` are source-available only, not open source; the example skills in Claude.ai are limited to paid plans."
    },
    "links": [
      {
        "label": "GitHub repository",
        "url": "https://github.com/anthropics/skills",
        "kind": "repository"
      },
      {
        "label": "Agent Skills standard",
        "url": "https://agentskills.io/",
        "kind": "reference"
      }
    ],
    "cover": "/covers/anthropic-agent-skills-2fb11df9e4.webp"
  }
}
---

## 它解决什么问题

Anthropic Agent Skills 是一套供 Claude 按需读取的任务说明。每个技能单独放在一个目录中，用 `SKILL.md` 保存元数据、触发描述和操作指令，也可以附带脚本与资源。使用者不必在每次对话里重复说明规则、步骤和交付格式，只需选择或点名相应技能。

一次典型操作是：提交任务、输入文件和必要约束，Claude 再加载匹配技能中的指令、脚本与资源，完成文档生成、内容分析或其他产物。它与临时写一段长提示词的区别，在于流程可以按目录保存、复用和检查，也更适合固定团队做事方式。

## 怎么使用

在 Claude Code 中，先把仓库注册为插件市场，再安装文档技能或示例技能：

```text
/plugin marketplace add anthropics/skills
/plugin install document-skills@anthropic-agent-skills
/plugin install example-skills@anthropic-agent-skills
```

安装完成后，在请求中直接点名对应技能即可触发。Claude.ai 的付费方案已包含这些示例技能；Claude API 也支持调用预置技能或上传自定义技能。

## 输入与结果

输入通常包括任务描述、待处理文件和格式、权限等约束。Claude 会根据所选技能执行规定流程，并输出文档、分析结果或其他任务产物。实际读写范围由技能内容决定，例如 PDF 技能可以读取指定文件并提取表单字段。正式使用前，应先检查 `SKILL.md`、附带脚本以及技能可访问的文件权限。

## 适合谁

它适合希望把团队流程固化给 Claude 执行的人，也适合研究 Agent Skills 目录结构的开发者。仓库提供技能样例、规范目录和基础模板，可用于理解技能如何组织文件、描述触发条件并编写操作指令。

## 使用边界

这个仓库主要用于演示和教学。Anthropic 建议在关键任务前自行测试，Claude 的实际行为可能与样例不同。多数技能采用 Apache 2.0，但 `docx`、`pdf`、`pptx`、`xlsx` 等文档技能仅为源码可见，并非开源；Claude.ai 中的示例技能限付费方案使用。
