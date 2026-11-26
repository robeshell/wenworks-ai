import type { Locale } from "./types";

const copy = {
  en: {
    siteName: "Wenworks AI · Tools",
    brand: "Wenworks AI",
    siteModels: "Models",
    siteAgents: "Agents",
    siteTools: "Tools",
    siteSwitch: "Wenworks AI sites",
    menu: "Menu",
    categoryOther: "Other",
    opensExternal: "opens the official site",
    updatedLabel: "Last updated",
    footerNote: "Few picks. Each one earned its place.",
    close: "Close",
    skip: "Skip to content",
    empty: "We'll publish when there's something worth writing.",
    compactIntroTitle: "Useful things for people who make things",
    kindTool: "Tools",
    kindSkill: "Skills",
    kindOpenSource: "Open source",
    kindSite: "Sites",
    kindPrompt: "Prompts",
    catalogKinds: "Boards",
    backToLibrary: "Back to library",
    contentBlock: {
      skill: "Skill",
      project: "Project",
      site: "Site",
      prompt: "Prompt",
    },
    promptHeading: "Prompt",
    variablesHeading: "Variables",
    examplesHeading: "Examples",
    linksHeading: "Links",
    sourceLink: "Source",
    copyPrompt: "Copy prompt",
    copied: "Copied",
    bodyUnavailable: "This article is currently available in Chinese.",
    readOtherLocale: "Read the Chinese version",
    langEn: "EN",
    langZh: "中文",
  },
  zh: {
    siteName: "Wenworks AI · 工具精选",
    brand: "Wenworks AI",
    siteModels: "模型",
    siteAgents: "Agent 导航",
    siteTools: "工具精选",
    siteSwitch: "Wenworks AI 站点",
    menu: "菜单",
    categoryOther: "其他",
    opensExternal: "打开官网",
    updatedLabel: "最近更新",
    footerNote: "少一点噪音，多一些好工具。",
    close: "关闭",
    skip: "跳到内容",
    empty: "收够值得写的再发，宁少不凑。",
    compactIntroTitle: "给做东西的人的精选好物",
    kindTool: "工具",
    kindSkill: "技能",
    kindOpenSource: "开源项目",
    kindSite: "站点",
    kindPrompt: "提示词",
    catalogKinds: "板块",
    backToLibrary: "返回资源库",
    contentBlock: {
      skill: "技能",
      project: "项目",
      site: "站点",
      prompt: "提示词",
    },
    promptHeading: "提示词",
    variablesHeading: "变量",
    examplesHeading: "示例",
    linksHeading: "相关链接",
    sourceLink: "来源页面",
    copyPrompt: "复制提示词",
    copied: "已复制",
    bodyUnavailable: "这篇内容目前只有英文版。",
    readOtherLocale: "阅读英文版",
    langEn: "EN",
    langZh: "中文",
  },
} as const;

export type UiCopy = (typeof copy)[Locale];

export function ui(locale: Locale): UiCopy {
  return copy[locale];
}

export function resourcesLabel(locale: Locale, count: number): string {
  if (locale === "zh") return `${count} 项资源`;
  return count === 1 ? "1 resource" : `${count} resources`;
}


/** Chinese is served from the site root, English under /en/. */
export function localePath(locale: Locale, path = ""): string {
  const suffix = path.startsWith("/") ? path : path ? `/${path}` : "";
  return locale === "en" ? `/en${suffix || "/"}` : suffix || "/";
}

/** Which language a pathname belongs to: /en/… is English, everything else Chinese. */
export function localeFromPath(pathname: string): Locale {
  return /^\/en(?:\/|$)/.test(pathname) ? "en" : "zh";
}

export function switchLocalePath(
  currentLocale: Locale,
  nextLocale: Locale,
  pathname: string,
): string {
  // Old /zh/ paths still arrive via redirects; strip either prefix.
  const rest = pathname.replace(/^\/(en|zh)(?=\/|$)/, "") || "/";
  return localePath(nextLocale, rest === "/" ? "" : rest);
}
