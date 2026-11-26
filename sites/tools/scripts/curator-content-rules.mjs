import net from "node:net";
import { knownCategory, knownTag } from "./curator-tags.mjs";

export const CONTENT_BLOCKS = ["tool", "skill", "project", "site", "prompt", "course", "article"];
const LONG_FORM_BLOCKS = ["skill", "project", "course", "article"];

function isPrivateIp(address) {
  const normalized = address.toLowerCase();
  if (normalized.startsWith("::ffff:")) return isPrivateIp(normalized.slice(7));
  if (net.isIPv4(normalized)) {
    const [a, b] = normalized.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  if (net.isIPv6(normalized)) {
    return normalized === "::" || normalized === "::1" || normalized.startsWith("fc") ||
      normalized.startsWith("fd") || /^fe[89ab]/.test(normalized);
  }
  return true;
}

// Shape-only check: no DNS, so saving works offline. Used before writing JSON.
export function assertUrlShape(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("请输入完整的 http 或 https 链接");
  }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("只支持 http 和 https 链接");
  if (url.username || url.password) throw new Error("链接不能包含账号或密码");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new Error("不能使用本机地址");
  }
  if ((net.isIP(host.replace(/^\[|\]$/g, "")) && isPrivateIp(host.replace(/^\[|\]$/g, "")))) {
    throw new Error("不能使用内网或保留地址");
  }
  return url;
}

export function assertContentItemShape(item) {
  if (!item || typeof item !== "object") throw new Error("内容必须是对象");
  if (!CONTENT_BLOCKS.includes(item.blockType)) throw new Error("未知内容板块");
  if (!String(item.id || item.slug || "").trim()) throw new Error("内容缺少 id 或 slug");
  if (!String(item.title || "").trim()) throw new Error("标题不能为空");
  if (!item.payload || typeof item.payload !== "object") throw new Error("内容 payload 无效");
}

function assertLocalized(value, label) {
  if (!String(value?.zh || "").trim() || !String(value?.en || "").trim()) {
    throw new Error(`已发布的内容必须填写中英文${label}`);
  }
}

/**
 * Save-time rules mirror what the public build demands (lib/data.ts and the
 * block renderers), so "saved fine" can never turn into a broken build later.
 * Only published items carry the full contract; drafts stay editable.
 */
export function validateContentPayload(item) {
  const payload = item.payload || {};
  for (const link of payload.links || []) {
    if (!String(link?.label || "").trim() || !String(link?.url || "").trim()) throw new Error("相关链接需要同时填写名称和地址");
    assertUrlShape(link.url);
  }
  if (item.status !== "active") return;
  assertLocalized(payload.summary, "简介");
  if (!knownCategory(String(item.category || ""), item.blockType)) throw new Error("请选择当前内容类型下有效的二级分类");
  const tags = Array.isArray(item.tags) ? item.tags.map(String) : [];
  if (tags.some((tag) => knownCategory(tag))) throw new Error("二级分类不能放在卡片标签中");
  if (item.blockType === "tool") {
    assertUrlShape(payload.url);
  }
  if (item.blockType === "site") assertUrlShape(payload.url);
  // 中文正文是发布门槛；英文正文缺失不拦保存，只在 contentIssueCount 里记一笔。
  if (LONG_FORM_BLOCKS.includes(item.blockType) && !String(payload.body?.zh || "").trim()) {
    throw new Error("已发布的长文必须填写中文正文");
  }
  if (["skill", "project"].includes(item.blockType) && !String(item.sourceUrl || "").trim() && !(payload.links || []).length) {
    throw new Error("已发布的技能或项目必须填写来源链接或相关链接");
  }
  if (item.blockType === "prompt" && !String(payload.prompt || "").trim()) {
    throw new Error("已发布的提示词必须填写正文");
  }
}

/** What a public card can show under the name before its two-line clamp
 *  cuts the text off. Tools lead with the verdict (tagline); every other block
 *  with its summary. Looser than the writing targets in COPY_LIMITS
 *  (lib/curator-issues.ts) on purpose: this flags copy readers lose, not copy
 *  a few characters over the ideal. */
export const LEAD_LIMIT = { zhChars: 48, enWords: 30 };
export const COVER_BLOCKS = ["tool", "site", "skill", "project"];

export const ISSUE_LABELS = {
  title: "缺名称", slug: "缺 Slug", summary: "缺简介", url: "缺访问地址", category: "缺分类",
  "tags-unknown": "有新标签待确认", "body-zh": "缺中文正文", "body-en": "缺英文正文",
  source: "缺来源链接", prompt: "缺提示词正文", cover: "缺封面", "lead-long": "卡片文案会被截断", "body-format": "正文格式有误",
};

/** Editorial completeness, surfaced as the dashboard queue and the library's
 *  "问题" filter. Unlike validateContentPayload this never blocks a save —
 *  drafts are allowed to be incomplete, they just get listed. Returns codes
 *  from ISSUE_LABELS so every screen can say what is missing, not only how much. */
export function contentIssues(item) {
  const payload = item.payload || {};
  const issues = [];
  const longForm = ["skill", "project"].includes(item.blockType);
  // Older long-form items store the body as one Chinese string.
  const bodyZh = typeof payload.body === "string" ? payload.body : payload.body?.zh;
  const bodyEn = typeof payload.body === "string" ? "" : payload.body?.en;
  const summaryZh = String(payload.summary?.zh || "").trim();
  const summaryEn = String(payload.summary?.en || "").trim();
  const leadField = item.blockType === "tool" ? "tagline" : "summary";
  const leadZh = String(payload[leadField]?.zh || "").trim();
  const leadEn = String(payload[leadField]?.en || "").trim();
  if (!String(item.title || "").trim()) issues.push("title");
  if (!String(item.slug || "").trim()) issues.push("slug");
  if (!summaryZh || !summaryEn) issues.push("summary");
  if (["tool", "site"].includes(item.blockType) && !String(payload.url || "").trim()) issues.push("url");
  if (!knownCategory(String(item.category || ""), item.blockType)) issues.push("category");
  // Agent 提的新标签不会自动进词表，留在这里等人处理。
  const tags = Array.isArray(item.tags) ? item.tags.map(String) : [];
  if (tags.some((tag) => !knownTag(tag))) issues.push("tags-unknown");
  if (longForm && !String(bodyZh || "").trim()) issues.push("body-zh");
  if (longForm && !String(bodyEn || "").trim()) issues.push("body-en");
  // A draft once stored its body as a JSON envelope; the public page then shows raw JSON.
  if (longForm && [bodyZh, bodyEn].some((body) => /^\s*\{\s*"body"\s*:/.test(String(body || "")))) issues.push("body-format");
  if (longForm && !String(item.sourceUrl || "").trim() && !(payload.links || []).length) issues.push("source");
  if (item.blockType === "prompt" && !String(payload.prompt || "").trim()) issues.push("prompt");
  if (COVER_BLOCKS.includes(item.blockType) && !String(payload.cover || "").trim()) issues.push("cover");
  if ([...leadZh].length > LEAD_LIMIT.zhChars || leadEn.split(/\s+/).filter(Boolean).length > LEAD_LIMIT.enWords) issues.push("lead-long");
  return issues;
}

export function contentIssueCount(item) {
  return contentIssues(item).length;
}
