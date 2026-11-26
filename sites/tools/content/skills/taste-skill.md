---
{
  "id": "taste-skill",
  "slug": "taste-skill",
  "blockType": "skill",
  "title": "Taste Skill",
  "status": "active",
  "category": "coding",
  "tags": [
    "free",
    "cli"
  ],
  "sourceUrl": "https://github.com/Leonxlnx/taste-skill",
  "payload": {
    "summary": {
      "zh": "把设计简报变成布局、字体与动效规则，默认 v2 仍属实验版。",
      "en": "Turns a design brief into layout, type, motion, and density rules; the default v2 remains experimental."
    },
    "body": {
      "zh": "## 它解决什么问题\n\nTaste Skill 是一组供编码 Agent 读取的前端设计规则。你给它页面目标、内容结构和技术栈后，Agent 会先理解简报、判断适合的设计语言，再处理布局、字体、间距、动效和信息密度，最后检查成品是否又变成居中大标题、同质卡片和保守间距的模板化界面。\n\n一次典型操作是安装技能，在 Codex、Cursor 或 Claude Code 中触发它，然后让 Agent 生成或调整前端代码。它与直接写一句“做得更好看”的区别，在于会用明确规则约束设计和检查结果，而不是只依赖模型临场选择常见、安全的样式。\n\n默认技能提供 VARIANCE、MOTION、DENSITY 三个旋钮，分别控制布局变化、动效强度和单屏信息密度。仓库还包含重设计、图像转代码、极简与粗野主义等专项技能，可按任务选择，不必全部安装。\n\n## 怎么使用\n\n通过 skills CLI 安装整个仓库，或只安装默认技能：\n\n```bash\nnpx skills add https://github.com/Leonxlnx/taste-skill\nnpx skills add https://github.com/Leonxlnx/taste-skill --skill \"design-taste-frontend\"\n```\n\n安装后，将界面目标、内容结构和技术栈交给支持 Agent Skills 的编码工具，并触发对应技能。也可把 `SKILL.md` 复制到项目，或直接粘贴进 ChatGPT、Codex 会话。\n\n## 输入与结果\n\n输入可以是页面简报、现有前端项目或参考图。默认技能会推断设计语言、建立设计系统映射，再按照 VARIANCE、MOTION、DENSITY 约束实现，并在交付前检查。\n\n实现类技能输出前端代码，图像生成类技能只输出参考画面。是否修改文件、运行项目或覆盖现有样式，由承载技能的 Agent 和当次授权决定。\n\n## 适合谁\n\n适合使用 Codex、Cursor 或 Claude Code 制作落地页和产品界面，却经常得到模板化结果的人。已有项目需要改版时，可使用仓库中的 redesign 技能，先审查现状，再调整层级、间距与样式。\n\n## 使用边界\n\n默认 `design-taste-frontend` 已进入 v2，但仓库将其标为实验版，行为仍可能变化。依赖旧版结果的项目可固定使用 `design-taste-frontend-v1`。规则不绑定 React、Vue 或 Svelte，最终质量仍取决于模型能力、简报信息和宿主 Agent 的执行方式。仓库采用 MIT License。",
      "en": "## What problem does it solve\n\nTaste Skill is a set of frontend design rules for coding agents to read. Once you give it the page goal, content structure, and tech stack, the agent first understands the brief, judges which design language fits, then works on layout, type, spacing, motion, and information density, and finally checks whether the result has again turned into a templated interface of centered big headlines, uniform cards, and conservative spacing.\n\nA typical run is to install the skill, trigger it in Codex, Cursor, or Claude Code, and then have the agent generate or adjust frontend code. The difference from simply writing \"make it look better\" is that it constrains the design and checks the result with explicit rules, instead of relying only on the model picking common, safe styles on the spot.\n\nThe default skill offers three knobs — VARIANCE, MOTION, and DENSITY — controlling layout variation, motion intensity, and per-screen information density respectively. The repository also includes specialized skills such as redesign, image-to-code, minimalism, and brutalism, which can be chosen by task without installing all of them.\n\n## How to use it\n\nInstall the whole repository via the skills CLI, or install only the default skill:\n\n```bash\nnpx skills add https://github.com/Leonxlnx/taste-skill\nnpx skills add https://github.com/Leonxlnx/taste-skill --skill \"design-taste-frontend\"\n```\n\nAfter installation, hand the interface goal, content structure, and tech stack to a coding tool that supports Agent Skills, and trigger the corresponding skill. You can also copy `SKILL.md` into your project, or paste it directly into a ChatGPT or Codex session.\n\n## Input and results\n\nInputs can be a page brief, an existing frontend project, or reference images. The default skill infers a design language, builds a design system mapping, then implements under the VARIANCE, MOTION, and DENSITY constraints, and checks before delivery.\n\nImplementation skills output frontend code, while image-generation skills output only reference visuals. Whether files are modified, the project is run, or existing styles are overwritten is decided by the agent hosting the skill and the authorization for that run.\n\n## Who it's for\n\nIt suits people who build landing pages and product interfaces with Codex, Cursor, or Claude Code but often get templated results. When an existing project needs a revamp, you can use the redesign skill in the repository to review the current state first, then adjust hierarchy, spacing, and styles.\n\n## Limits of use\n\nThe default `design-taste-frontend` has reached v2, but the repository marks it as experimental, so behavior may still change. Projects that depend on older results can pin `design-taste-frontend-v1`. The rules are not tied to React, Vue, or Svelte, and final quality still depends on model capability, the brief, and how the host agent executes. The repository uses the MIT License."
    },
    "links": [
      {
        "label": "GitHub Repository",
        "url": "https://github.com/Leonxlnx/taste-skill",
        "kind": "repository"
      },
      {
        "label": "Taste Skill Website",
        "url": "https://tasteskill.dev/",
        "kind": "official"
      }
    ],
    "cover": "/covers/taste-skill-700209808a.webp"
  }
}
---

## 它解决什么问题

Taste Skill 是一组供编码 Agent 读取的前端设计规则。你给它页面目标、内容结构和技术栈后，Agent 会先理解简报、判断适合的设计语言，再处理布局、字体、间距、动效和信息密度，最后检查成品是否又变成居中大标题、同质卡片和保守间距的模板化界面。

一次典型操作是安装技能，在 Codex、Cursor 或 Claude Code 中触发它，然后让 Agent 生成或调整前端代码。它与直接写一句“做得更好看”的区别，在于会用明确规则约束设计和检查结果，而不是只依赖模型临场选择常见、安全的样式。

默认技能提供 VARIANCE、MOTION、DENSITY 三个旋钮，分别控制布局变化、动效强度和单屏信息密度。仓库还包含重设计、图像转代码、极简与粗野主义等专项技能，可按任务选择，不必全部安装。

## 怎么使用

通过 skills CLI 安装整个仓库，或只安装默认技能：

```bash
npx skills add https://github.com/Leonxlnx/taste-skill
npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"
```

安装后，将界面目标、内容结构和技术栈交给支持 Agent Skills 的编码工具，并触发对应技能。也可把 `SKILL.md` 复制到项目，或直接粘贴进 ChatGPT、Codex 会话。

## 输入与结果

输入可以是页面简报、现有前端项目或参考图。默认技能会推断设计语言、建立设计系统映射，再按照 VARIANCE、MOTION、DENSITY 约束实现，并在交付前检查。

实现类技能输出前端代码，图像生成类技能只输出参考画面。是否修改文件、运行项目或覆盖现有样式，由承载技能的 Agent 和当次授权决定。

## 适合谁

适合使用 Codex、Cursor 或 Claude Code 制作落地页和产品界面，却经常得到模板化结果的人。已有项目需要改版时，可使用仓库中的 redesign 技能，先审查现状，再调整层级、间距与样式。

## 使用边界

默认 `design-taste-frontend` 已进入 v2，但仓库将其标为实验版，行为仍可能变化。依赖旧版结果的项目可固定使用 `design-taste-frontend-v1`。规则不绑定 React、Vue 或 Svelte，最终质量仍取决于模型能力、简报信息和宿主 Agent 的执行方式。仓库采用 MIT License。
