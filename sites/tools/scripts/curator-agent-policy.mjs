import { tagVocabularyPrompt } from "./curator-tags.mjs";

export const RESOURCE_NAMING_RULE = "名称规则（适用于所有板块）：name/title 只使用来源明确给出的原始官方名称，保留原有拼写。不得因为分类或内容类型追加 Skill、工具、站点、项目、提示词、AI 等前后缀，不翻译、不扩写、不加宣传语。原名本身包含这些词时保留，不使用字符串规则盲目删词。类型转换不自动改名；后续编辑保留现有名称，除非用户明确要求改名或恢复原名。";

export const TOOL_INTRO_RULE = "工具类文案规则：只需一段简短介绍，放在 summary 中，用 1-2 句话说明这是哪家公司或团队推出的什么类型工具、主要作用、可以用来做什么。推出方必须有来源支持，未知就省略；不要机械套用或编造。默认不展开安装教程、实现机制、功能清单、套餐限制或长篇评测，不新增详细介绍。其他板块不套用此长度规则。公开站卡片上显示的是一句话定位（收录时的 verdict，草稿里的 payload.tagline），按收录规则写得具体、能和同类区分；summary 在详情页展示。用户明确要求详细说明时再按要求处理。";

const INGEST_BLOCKS = ["tool", "skill", "project", "site", "prompt"];

export function canonicalResourceUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    url.hash = "";
    url.search = "";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    if (url.hostname === "github.com") {
      const [owner, repository] = url.pathname.split("/").filter(Boolean);
      if (owner && repository) url.pathname = `/${owner.toLowerCase()}/${repository.replace(/\.git$/i, "").toLowerCase()}`;
    }
    return url.toString();
  } catch {
    return "";
  }
}

export function buildAgentPrompt({ skill, url, note, catalog, targetBlock, existingContent = "" }) {
  const blockNote = INGEST_BLOCKS.includes(targetBlock)
    ? `目标板块已指定为 ${targetBlock}，不要更改。`
    : "目标板块未指定：由你根据内容判断（tool / skill / project / site / prompt）。";
  return `${skill}

---- 本次任务 ----
整理这条资源：${url}
${blockNote}
${RESOURCE_NAMING_RULE}
${TOOL_INTRO_RULE}
整理备注：${String(note || "无").slice(0, 1000)}

分类与标签词表（category 从二级分类中单选；tags 是平级多选标签，没有分组和互斥规则。先在表里找，实在没有合适的才自造一个英文小写连字符 id）：
${tagVocabularyPrompt(targetBlock)}

当前目录（用于查重与避免重复收录；仅参考，不要照抄其中的文案）：
${catalog || "（空）"}${existingContent ? `
这条内容正在被重新处理，现状如下（找出遗漏并改写，不要照抄其中的错误）：
${existingContent.slice(0, 12000)}` : ""}

严格执行调查预算。信息达到最小证据集后立即停止调用工具；不要为了 Logo、star 数、装饰性信息或措辞继续调查。最终只输出一个符合 schema 的 JSON 对象。`;
}

