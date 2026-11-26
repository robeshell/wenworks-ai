"use client";

import { useState } from "react";
import { Button, SegmentedControl, Stack, Text, TextInput, Textarea } from "@mantine/core";
import { MarkdownEditor } from "./MarkdownEditor";
import { CategoryPicker, TagPicker } from "./TagPicker";
import { ExamplesEditor, StructuredLinks, VariablesEditor } from "./StructuredFields";
import { type CuratorContentItem, type CuratorIngestBlock } from "@/lib/curator-client";
import { categoriesForBlock } from "@/lib/tags";
import type { ContentLink, PromptExample, PromptVariable } from "@/lib/content-blocks";
import type { Workspace } from "@/lib/curator-workspace";

type Localized = { zh?: string; en?: string };
const local = (value: unknown, locale: "zh" | "en") => typeof value === "string" ? (locale === "zh" ? value : "") : String((value as Localized | undefined)?.[locale] || "");

/** The card exactly as the public board shows it: cover, category, name and
 *  the one line under it. Capturing the cover and icon happens right here. */
function CardPreview({ draft, busy, onCollectCover, onCollectLogo }: { draft: CuratorContentItem; busy?: boolean; onCollectCover?: (pageUrl: string) => void; onCollectLogo?: () => void }) {
  const payload = draft.payload as Record<string, unknown>;
  const [pageUrl, setPageUrl] = useState("");
  const [otherPage, setOtherPage] = useState(false);
  const cover = typeof payload.cover === "string" ? payload.cover : "";
  const logo = typeof payload.logo === "string" ? payload.logo : "";
  const hasCover = "cover" in payload;
  const lead = local(draft.blockType === "tool" ? payload.tagline : payload.summary, "zh");
  const category = categoriesForBlock(draft.blockType as CuratorIngestBlock).find((c) => c.id === draft.category)?.label.zh;
  const canCollect = Boolean(payload.url || draft.sourceUrl || (Array.isArray(payload.links) && payload.links.length));
  return <section className="card-preview-block" aria-label="公开站卡片预览">
    <div className="card-preview">
      {hasCover ? <div className="card-preview-cover">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {cover ? <img src={cover} alt="" /> : <span>{canCollect ? "还没有封面" : "填写访问地址后可以抓取封面"}</span>}
      </div> : null}
      <div className="card-preview-cat">{category || "未选分类"}</div>
      <div className="card-preview-name">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logo ? <img src={logo} alt="" /> : null}{draft.title || "未命名"}
      </div>
      <div className="card-preview-lead">{lead || <span className="muted">还没有一句话介绍</span>}</div>
    </div>
    <div className="card-preview-actions">
      {hasCover ? <Button size="xs" variant="default" disabled={busy || !(canCollect || pageUrl)} onClick={() => onCollectCover?.(pageUrl)}>{cover ? "重新抓封面" : "抓取封面"}</Button> : null}
      {"logo" in payload ? <Button size="xs" variant="default" disabled={busy || !canCollect} onClick={onCollectLogo}>{logo ? "重新抓图标" : "抓取图标"}</Button> : null}
      {hasCover ? (otherPage
        ? <TextInput size="xs" className="card-preview-page" aria-label="改从这个页面截图" placeholder="从这个页面截图，比如官网介绍页" value={pageUrl} onChange={(e) => setPageUrl(e.currentTarget.value)} />
        : <button type="button" className="card-preview-link" onClick={() => setOtherPage(true)}>从别的页面截图</button>) : null}
    </div>
  </section>;
}

export function WorkspaceFields({ draft, sources = [], onChange, onCollectLogo, onCollectCover, busy }: { draft: CuratorContentItem; sources?: Workspace["sources"]; onChange: (draft: CuratorContentItem) => void; onCollectLogo?: () => void; onCollectCover?: (pageUrl: string) => void; busy?: boolean }) {
  const [locale, setLocale] = useState<"zh" | "en">("zh");
  const [bodyOpen, setBodyOpen] = useState(false);
  const payload = draft.payload as Record<string, unknown>;
  const update = (key: string, value: unknown) => onChange({ ...draft, [key]: value });
  const updatePayload = (key: string, value: unknown) => onChange({ ...draft, payload: { ...payload, [key]: value } as CuratorContentItem["payload"] });
  const localValue = (field: string) => local(payload[field], locale);
  const localized = (field: string, value: string) => {
    const current = payload[field];
    const base = typeof current === "string" ? { zh: current, en: "" } : (current as object) || {};
    updatePayload(field, { ...base, [locale]: value });
  };
  const tool = draft.blockType === "tool";
  const bodyLength = (lang: "zh" | "en") => local(payload.body, lang).length;
  const language = <SegmentedControl aria-label="内容语言" size="xs" value={locale} onChange={(value) => setLocale(value as "zh" | "en")} data={[{ value: "zh", label: "中文" }, { value: "en", label: "English" }]} />;

  return <Stack gap="lg" className="resource-fields">
    <CardPreview draft={draft} busy={busy} onCollectCover={onCollectCover} onCollectLogo={onCollectLogo} />

    <TextInput label="名称" value={draft.title} onChange={(e) => update("title", e.currentTarget.value)} />
    <div><Text size="sm" mb={6}>分类</Text><CategoryPicker block={draft.blockType as CuratorIngestBlock} value={draft.category} onChange={(v) => update("category", v)} /></div>

    <div className="field-heading"><Text size="sm">介绍</Text>{language}</div>
    {tool ? <TextInput label={locale === "zh" ? "一句话定位（显示在卡片上）" : "Verdict (shown on the card)"} value={localValue("tagline")} onChange={(e) => localized("tagline", e.currentTarget.value)} /> : null}
    <Textarea label={tool ? (locale === "zh" ? "工具介绍" : "Tool introduction") : (locale === "zh" ? "一句话摘要（显示在卡片上）" : "Summary (shown on the card)")} autosize minRows={2} maxRows={8} value={localValue("summary")} onChange={(e) => localized("summary", e.currentTarget.value)} />
    {!tool && "description" in payload ? <Textarea label={locale === "zh" ? "详细介绍" : "Details"} autosize minRows={4} value={localValue("description")} onChange={(e) => localized("description", e.currentTarget.value)} /> : null}

    {"body" in payload ? (bodyOpen || !bodyLength("zh")
      ? <MarkdownEditor label={locale === "zh" ? "正文" : "English body"} value={localValue("body")} onChange={(v) => localized("body", v)} />
      : <button type="button" className="field-collapsed" onClick={() => setBodyOpen(true)}><span>正文</span><span>中文 {bodyLength("zh")} 字 · 英文 {bodyLength("en") ? `${bodyLength("en")} 字` : "未补"}</span><b>展开编辑</b></button>) : null}
    {"prompt" in payload ? <MarkdownEditor label="提示词原文" value={String(payload.prompt || "")} onChange={(v) => updatePayload("prompt", v)} /> : null}
    {"variables" in payload ? <section><Text size="sm" mb="xs">变量</Text><VariablesEditor value={payload.variables as PromptVariable[]} onChange={(v) => updatePayload("variables", v)} /></section> : null}
    {"examples" in payload ? <section><Text size="sm" mb="xs">示例</Text><ExamplesEditor value={payload.examples as PromptExample[]} onChange={(v) => updatePayload("examples", v)} /></section> : null}

    <details className="resource-properties"><summary>链接、标签与来源</summary><Stack gap="md" mt="md">
      {"url" in payload ? <TextInput label="访问地址" value={String(payload.url || "")} onChange={(e) => updatePayload("url", e.currentTarget.value)} /> : null}
      <TextInput label="来源链接" value={draft.sourceUrl || ""} onChange={(e) => update("sourceUrl", e.currentTarget.value)} />
      {"links" in payload ? <section><Text size="sm" mb="xs">相关链接</Text><StructuredLinks value={payload.links as ContentLink[]} onChange={(v) => updatePayload("links", v)} /></section> : null}
      <div><Text size="sm" mb="xs">标签</Text><TagPicker value={draft.tags} onChange={(v) => update("tags", v)} /></div>
      <TextInput label="Slug" description="公开地址里的名字，留空会按名称生成" value={draft.slug} onChange={(e) => update("slug", e.currentTarget.value)} />
      {"cover" in payload ? <TextInput label="封面图地址" value={String(payload.cover || "")} onChange={(e) => updatePayload("cover", e.currentTarget.value)} /> : null}
      {"logo" in payload ? <TextInput label="图标地址" value={String(payload.logo || "")} onChange={(e) => updatePayload("logo", e.currentTarget.value)} /> : null}
      {sources.length ? <section><Text size="sm" mb="xs">AI 读过的资料</Text><Stack gap={6}>{sources.map((s) => <details key={s.id} className="resource-source"><summary>{s.title || s.url || "粘贴的资料"}</summary>{/^https?:/.test(s.url) ? <a href={s.url} target="_blank" rel="noreferrer">打开来源</a> : null}<pre>{s.text}</pre></details>)}</Stack></section> : null}
    </Stack></details>
  </Stack>;
}
