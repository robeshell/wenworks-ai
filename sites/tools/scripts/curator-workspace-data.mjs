import { randomUUID } from "node:crypto";
import { knownCategory } from "./curator-tags.mjs";

export const WORKSPACE_TYPES = ["tool", "skill", "project", "site", "prompt"];
export const TYPE_NAMES = { tool: "工具", skill: "技能", project: "项目", site: "站点", prompt: "提示词" };
const fields = {
  tool: ["summary", "tagline", "description", "url", "logo", "cover"],
  site: ["summary", "description", "url", "logo", "cover"],
  skill: ["summary", "body", "links", "cover"], project: ["summary", "body", "links", "cover"],
  prompt: ["summary", "prompt", "variables", "examples", "links"],
};
const clone = (value) => structuredClone(value);
export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const text = (v) => typeof v === "string" ? v : "";
const localized = (v) => ({ zh: typeof v === "string" ? v : text(v?.zh), en: text(v?.en) });

export function workspaceError(message, code = "invalid-workspace", statusCode = 400) {
  return Object.assign(new Error(message), { code, statusCode });
}

export function normalizeWorkingDraft(raw = {}, identity) {
  const blockType = WORKSPACE_TYPES.includes(raw.blockType) ? raw.blockType : "tool";
  const p = raw.payload || {};
  const payload = { summary: localized(p.summary) };
  for (const field of fields[blockType].filter((f) => f !== "summary")) {
    if (["tagline", "description", "body"].includes(field)) payload[field] = localized(p[field]);
    else if (["url", "logo", "cover", "prompt"].includes(field)) payload[field] = text(p[field]);
    else if (field === "links") payload.links = Array.isArray(p.links) ? p.links.map((l) => ({ label: text(l?.label), url: text(l?.url), kind: ["official", "docs", "repository", "reference", "other"].includes(l?.kind) ? l.kind : "other" })) : [];
    else if (field === "variables") payload.variables = Array.isArray(p.variables) ? p.variables.map((v) => ({ name: text(v?.name), description: text(v?.description), example: text(v?.example) })) : [];
    else if (field === "examples") payload.examples = Array.isArray(p.examples) ? p.examples.map((e) => ({ input: text(e?.input), output: text(e?.output) })) : [];
  }
  const at = new Date().toISOString();
  return {
    id: identity || text(raw.id) || randomUUID(), blockType,
    title: text(raw.title), slug: text(raw.slug), status: "draft",
    category: text(raw.category), tags: Array.isArray(raw.tags) ? [...new Set(raw.tags.filter((t) => typeof t === "string"))] : [],
    sourceUrl: text(raw.sourceUrl), createdAt: text(raw.createdAt) || at,
    ...(raw.sortOrder === undefined ? {} : { sortOrder: Number(raw.sortOrder) }),
    payload,
  };
}

export function workingDraftFromLegacy(draft, current) {
  const type = WORKSPACE_TYPES.includes(draft.blockType) ? draft.blockType
    : draft.kind === "open-source" ? "project" : WORKSPACE_TYPES.includes(draft.kind) ? draft.kind : current.blockType;
  const payload = {
    summary: draft.summary, tagline: draft.verdict, description: draft.description,
    url: draft.url || current.sourceUrl, logo: draft.logoUrl || draft.sourceLogoUrl || current.payload?.logo || "",
    body: { zh: draft.body || "", en: draft.bodyEn || "" },
    links: draft.links || [], prompt: draft.prompt || "", variables: draft.variables || [], examples: draft.examples || [],
  };
  return normalizeWorkingDraft({ ...current, blockType: type, title: draft.name || current.title,
    slug: current.slug || draft.slug || "", sourceUrl: draft.url || current.sourceUrl,
    category: draft.category || "", tags: draft.tags || [], payload }, current.id);
}

export function convertWorkingDraft(current, targetType, previousOfType) {
  if (!WORKSPACE_TYPES.includes(targetType)) throw workspaceError("请选择有效的内容类型");
  if (current.blockType === targetType) return clone(current);
  const previous = previousOfType?.blockType === targetType ? previousOfType.payload : {};
  const payload = { ...clone(previous || {}) };
  for (const field of fields[targetType]) {
    if (fields[current.blockType].includes(field) && current.payload[field] !== undefined) payload[field] = clone(current.payload[field]);
  }
  if (fields[targetType].includes("url") && !payload.url) payload.url = current.sourceUrl || current.payload.links?.find((l) => l.kind === "official")?.url || "";
  if (fields[targetType].includes("links") && !payload.links?.length && current.sourceUrl) payload.links = [{ label: "来源", url: current.sourceUrl, kind: "official" }];
  return normalizeWorkingDraft({ ...current, blockType: targetType,
    category: knownCategory(current.category, targetType) ? current.category : "", payload }, current.id);
}

export function diffDrafts(before, after, prefix = "") {
  if (same(before, after)) return [];
  if (before && after && typeof before === "object" && typeof after === "object" && !Array.isArray(before) && !Array.isArray(after)) {
    return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap((key) =>
      diffDrafts(before[key], after[key], prefix ? `${prefix}.${key}` : key));
  }
  return [{ path: prefix, before: before ?? null, after: after ?? null, beforeExists: before !== undefined, afterExists: after !== undefined }];
}

export function pathValue(item, key) { return key.split(".").reduce((v, part) => v?.[part], item); }
function setPath(item, key, value, exists = true) {
  const parts = key.split(".");
  if (parts.some((part) => ["__proto__", "prototype", "constructor"].includes(part))) throw workspaceError("字段路径无效");
  let node = item;
  for (const part of parts.slice(0, -1)) {
    if (!node[part] || typeof node[part] !== "object") node[part] = {};
    node = node[part];
  }
  if (exists) node[parts.at(-1)] = clone(value);
  else delete node[parts.at(-1)];
}

/** Three-way merge keeps unrelated manual changes and returns conflicting fields. */
export function mergeWorkingDraft(base, current, proposed, force = false) {
  const changes = diffDrafts(base, proposed).filter((c) => !["id", "status", "createdAt", "updatedAt", "sortOrder"].includes(c.path));
  const conflicts = changes.filter((change) => {
    const value = pathValue(current, change.path);
    return !same(value, pathValue(base, change.path)) && !same(value, pathValue(proposed, change.path));
  });
  if (current.blockType !== base.blockType && proposed.blockType !== current.blockType && changes.some((c) => c.path.startsWith("payload."))) {
    conflicts.push({ path: "blockType", before: base.blockType, after: proposed.blockType });
  }
  const merged = clone(current);
  for (const change of changes) {
    if (force || !conflicts.some((c) => c.path === change.path || c.path === "blockType")) setPath(merged, change.path, change.after, change.afterExists);
  }
  return { draft: normalizeWorkingDraft(merged, current.id), conflicts, changes };
}

export function patchWorkingDraft(current, changes) {
  if (!Array.isArray(changes) || changes.length > 40) throw workspaceError("修改字段数量无效");
  const next = clone(current);
  for (const change of changes) {
    const key = String(change.path || "");
    const [root, field, locale, extra] = key.split(".");
    const top = ["title", "slug", "category", "tags", "sourceUrl"];
    const valid = top.includes(key) || (root === "payload" && fields[current.blockType].includes(field) && !extra
      && (!locale || (["summary", "description", "body", "tagline"].includes(field) && ["zh", "en"].includes(locale))));
    if (!valid) throw workspaceError(`不能修改字段 ${key}，转换类型请使用类型转换操作`);
    setPath(next, key, change.value);
  }
  // Reject wrong shapes instead of silently clearing a field on malformed tool output.
  const normalized = normalizeWorkingDraft(next, current.id);
  for (const change of changes) {
    if (!same(pathValue(normalized, change.path), change.value)) throw workspaceError(`字段 ${change.path} 的值格式不正确`);
  }
  return normalized;
}
