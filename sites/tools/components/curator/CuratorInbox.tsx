"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Modal, Skeleton, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { BLOCK_LABELS, curatorRequest, type CuratorContentItem, type CuratorIngestBlock } from "@/lib/curator-client";
import { curatorEditorHref } from "@/lib/curator-routes";
import { workspaceHref, workspacePost, type Workspace } from "@/lib/curator-workspace";
import { navigationHref, navigationKey, saveNavigation } from "@/lib/curator-navigation";
import { INBOX_REFRESH_EVENT } from "@/components/curator/useInboxCount";

/**
 * The inbox is the Curator's home: capture new links, see what the AI is
 * working on, review what it produced, and finish what is incomplete. Every
 * row opens the editor as part of its group so review moves item to item.
 */

type Item = CuratorContentItem & { issues?: string[] };
type WorkspaceSummary = { id: string; contentId: string | null; title: string; blockType: CuratorIngestBlock; disposition: string; version: number; savedVersion: number; operationStatus: string | null; proposalCount?: number; updatedAt: string };
type Data = { items: Item[]; workspaces: WorkspaceSummary[] };
type Entry = { key: string; href: string };

export const ISSUE_LABELS: Record<string, string> = {
  title: "缺名称", slug: "缺 Slug", summary: "缺简介", url: "缺访问地址", category: "缺分类",
  "tags-unknown": "有新标签待确认", "body-zh": "缺中文正文", "body-en": "缺英文正文",
  source: "缺来源链接", prompt: "缺提示词正文", cover: "缺封面", "lead-long": "卡片文案会被截断", "body-format": "正文格式有误",
};
// Issues the AI is asked to fix; covers are captured without it.
const AI_FIXABLE = new Set(["category", "summary", "lead-long", "body-en", "body-zh", "cover"]);
const BUSY = ["running", "queued"];

function relativeTime(value: string) {
  const at = Date.parse(value);
  if (Number.isNaN(at)) return "";
  const minutes = Math.round((Date.now() - at) / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} 小时前`;
  const days = Math.round(minutes / 1440);
  return days < 30 ? `${days} 天前` : new Date(at).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

/** Links become one resource each; text with no link becomes one prompt. */
export function parseCapture(text: string) {
  const words = text.split(/\s+/).map((part) => part.trim()).filter(Boolean);
  const links: string[] = [];
  for (const word of words) {
    try {
      const parsed = new URL(word);
      if (["http:", "https:"].includes(parsed.protocol)) links.push(parsed.href);
    } catch { /* not a link */ }
  }
  return links.length ? { links: [...new Set(links)], prompt: "" } : { links: [], prompt: text.trim() };
}

function Thumb({ title, payload, busy }: { title: string; payload?: Record<string, unknown>; busy?: boolean }) {
  const cover = typeof payload?.cover === "string" ? payload.cover : "";
  const logo = typeof payload?.logo === "string" ? payload.logo : "";
  // eslint-disable-next-line @next/next/no-img-element
  if (cover) return <img className="inbox-thumb" src={cover} alt="" loading="lazy" />;
  return <span className={`inbox-thumb inbox-thumb-empty${busy ? " is-busy" : ""}`} aria-hidden="true">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {logo ? <img src={logo} alt="" /> : busy ? null : <b>{title.slice(0, 1)}</b>}
  </span>;
}

function Row({ entry, title, payload, meta, reasons, action, busy, onOpen }: { entry: Entry; title: string; payload?: Record<string, unknown>; meta: string; reasons: string[]; action: string; busy?: boolean; onOpen: (event: React.MouseEvent) => void }) {
  return <Link className="inbox-row" href={entry.href} onClick={onOpen}>
    <Thumb title={title} payload={payload} busy={busy} />
    <span className="inbox-row-title"><b>{title || "未命名资源"}</b><small>{meta}</small></span>
    <span className="inbox-reasons">{reasons.map((reason) => <em key={reason}>{reason}</em>)}</span>
    <span className="inbox-go">{action}</span>
  </Link>;
}

function Group({ title, total, action, children }: { title: string; total: number; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="inbox-group" aria-label={title}>
    <header><h2>{title}<span>{total}</span></h2>{action}</header>
    {children}
  </section>;
}

export function CuratorInbox() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [capture, setCapture] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [fixTarget, setFixTarget] = useState<Item[] | null>(null);
  const [fixing, setFixing] = useState(false);

  const load = useCallback(() => { setRevision((value) => value + 1); window.dispatchEvent(new Event(INBOX_REFRESH_EVENT)); }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      curatorRequest<{ items: Item[] }>("/content?pageSize=100&sort=updated-desc"),
      curatorRequest<{ items: WorkspaceSummary[] }>("/workspaces"),
    ]).then(([content, workspaces]) => {
      if (!active) return;
      setError("");
      setData({ items: content.items || [], workspaces: workspaces.items || [] });
    }).catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "无法读取收件箱"); });
    return () => { active = false; };
  }, [revision]);

  const groups = useMemo(() => {
    const items = data?.items ?? [];
    const open = (data?.workspaces ?? []).filter((w) => w.disposition === "open");
    const working = open.filter((w) => BUSY.includes(w.operationStatus || ""));
    const review = open.filter((w) => !BUSY.includes(w.operationStatus || "") && (["failed", "cancelled"].includes(w.operationStatus || "") || w.version !== w.savedVersion || (w.proposalCount ?? 0) > 0 || !w.contentId));
    const held = new Set([...working, ...review].map((w) => w.contentId).filter(Boolean));
    const incomplete = items.filter((item) => !held.has(item.id) && (item.status === "draft" || (item.status === "active" && (item.issues?.length ?? 0) > 0)));
    return { working, review, incomplete, byId: new Map(items.map((item) => [item.id, item])) };
  }, [data]);

  // Poll while the AI is working so finished items move to review on their own.
  useEffect(() => {
    if (!groups.working.length) return;
    const timer = window.setInterval(load, 3000);
    return () => window.clearInterval(timer);
  }, [groups.working.length, load]);

  function open(event: React.MouseEvent, title: string, entries: Entry[], index: number) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    const navigation = saveNavigation(sessionStorage, crypto.randomUUID(), entries.map((entry) => entry.key), "", { title });
    router.push(navigationHref(entries[index].href, navigation.id));
  }

  async function submitCapture() {
    const { links, prompt } = parseCapture(capture);
    if (!links.length && !prompt) return;
    setCapturing(true);
    const started: string[] = [];
    const skipped: string[] = [];
    try {
      if (prompt) {
        const id = crypto.randomUUID();
        const workspace = await workspacePost<Workspace>("/workspaces", { id, draft: { blockType: "prompt", payload: { prompt } }, sources: [{ url: "", title: "原始提示词", text: prompt, kind: "pasted" }] });
        await workspacePost<Workspace>(`/workspaces/${workspace.id}/message`, { requestId: `${id}:first-draft`, text: "整理这份提示词，保留原文，补充摘要和分类。", label: "收录 · 整理提示词", mode: "ingest", autoType: false });
        started.push(workspace.id);
      }
      for (const url of links) {
        const matches = await workspacePost<{ items: Array<{ id: string; title: string }> }>("/workspaces/duplicates", { url });
        if (matches.items.length) { skipped.push(matches.items[0].title || url); continue; }
        const id = crypto.randomUUID();
        const workspace = await workspacePost<Workspace>("/workspaces", { id, draft: { blockType: "tool", sourceUrl: url }, sources: [{ url, text: "", kind: "submitted" }] });
        await workspacePost<Workspace>(`/workspaces/${workspace.id}/message`, { requestId: `${id}:first-draft`, text: "根据来源生成首份草稿。", label: "收录 · 生成首份草稿", mode: "ingest", autoType: true });
        started.push(workspace.id);
      }
      setCapture("");
      if (skipped.length) notifications.show({ message: `已在资源库，跳过：${skipped.join("、")}`, color: "gray" });
      if (started.length) notifications.show({ message: started.length === 1 ? "已开始整理" : `${started.length} 条已开始整理`, color: "curator" });
      load();
    } catch (caught) {
      notifications.show({ message: caught instanceof Error ? caught.message : "没能开始整理", color: "red" });
      load();
    } finally { setCapturing(false); }
  }

  async function runFix() {
    if (!fixTarget) return;
    setFixing(true);
    try {
      const report = await curatorRequest<{ agent: number; covers: number; skipped: unknown[] }>("/dashboard/fix", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: fixTarget.map((item) => item.id) }) });
      notifications.show({ message: `AI 开始完善 ${fixTarget.length - report.skipped.length} 条，完成后出现在「待审核」`, color: "curator" });
      setFixTarget(null);
      load();
    } catch (caught) {
      notifications.show({ message: caught instanceof Error ? caught.message : "没有开始", color: "red" });
    } finally { setFixing(false); }
  }

  const { working, review, incomplete, byId } = groups;
  const reviewEntries: Entry[] = review.map((w) => ({ key: navigationKey(w), href: workspaceHref(w.id) }));
  const incompleteEntries: Entry[] = incomplete.map((item) => ({ key: item.id, href: curatorEditorHref(item.blockType as CuratorIngestBlock, item.slug) }));
  const fixable = incomplete.filter((item) => (item.issues ?? []).some((code) => AI_FIXABLE.has(code)));
  const reviewLabel = (w: WorkspaceSummary) => w.operationStatus === "failed" ? "整理失败" : w.operationStatus === "cancelled" ? "已停止" : !w.contentId ? "新收录" : (w.proposalCount ?? 0) > 0 || w.version !== w.savedVersion ? "AI 已修改" : "待确认";
  const empty = data && !working.length && !review.length && !incomplete.length;

  return <div className="inbox">
    <h1 className="inbox-title">收件箱</h1>

    <form className="inbox-capture" onSubmit={(event) => { event.preventDefault(); void submitCapture(); }}>
      <Textarea
        aria-label="收录"
        placeholder="粘贴链接开始收录，一行一个可以一次多条；没有链接的一段文字会被当作提示词整理。"
        value={capture}
        onChange={(event) => setCapture(event.currentTarget.value)}
        onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); void submitCapture(); } }}
        autosize minRows={2} maxRows={8} variant="unstyled"
      />
      <div className="inbox-capture-bar"><span>类型会自动判断，之后也能改 · ⌘↩ 提交</span><Button type="submit" loading={capturing} disabled={!capture.trim()}>收录</Button></div>
    </form>

    {error ? <Alert color="red" mt="lg">{error}<Button variant="default" size="xs" ml="md" onClick={load}>重新读取</Button></Alert> : null}
    {!data && !error ? <div className="inbox-group">{Array.from({ length: 4 }, (_, index) => <div className="inbox-row" key={index}><Skeleton className="inbox-thumb" /><span className="inbox-row-title"><Skeleton h={12} w={`${35 + index * 9}%`} /><Skeleton h={10} w="20%" mt={8} /></span></div>)}</div> : null}
    {empty ? <p className="inbox-empty">都处理完了。粘贴新的链接开始收录。</p> : null}

    {working.length ? <Group title="AI 正在整理" total={working.length}>
      {working.map((w) => <Row key={w.id} entry={{ key: navigationKey(w), href: workspaceHref(w.id) }} title={w.title} payload={w.contentId ? byId.get(w.contentId)?.payload as Record<string, unknown> | undefined : undefined} busy meta={`${w.operationStatus === "queued" ? "排队中" : "整理中"} · ${relativeTime(w.updatedAt)}`} reasons={[]} action="查看" onOpen={(event) => open(event, "AI 正在整理", working.map((x) => ({ key: navigationKey(x), href: workspaceHref(x.id) })), working.indexOf(w))} />)}
    </Group> : null}

    {review.length ? <Group title="待审核" total={review.length} action={<Button variant="default" size="xs" onClick={(event) => open(event, "待审核", reviewEntries, 0)}>逐条审核 →</Button>}>
      {review.map((w, index) => <Row key={w.id} entry={reviewEntries[index]} title={w.title} payload={w.contentId ? byId.get(w.contentId)?.payload as Record<string, unknown> | undefined : undefined} meta={`${w.contentId ? BLOCK_LABELS[w.blockType] ?? "" : "新收录"} · ${relativeTime(w.updatedAt)}`} reasons={[reviewLabel(w)]} action="审核" onOpen={(event) => open(event, "待审核", reviewEntries, index)} />)}
    </Group> : null}

    {incomplete.length ? <Group title="待完善" total={incomplete.length} action={fixable.length ? <Button variant="default" size="xs" onClick={() => setFixTarget(fixable)}>让 AI 全部完善</Button> : null}>
      {incomplete.map((item, index) => <Row key={item.id} entry={incompleteEntries[index]} title={item.title} payload={item.payload as Record<string, unknown>} meta={`${BLOCK_LABELS[item.blockType as CuratorIngestBlock] ?? ""} · ${item.status === "draft" ? "草稿" : "已公开"}`} reasons={(item.issues ?? []).map((code) => ISSUE_LABELS[code] || code)} action="打开" onOpen={(event) => open(event, "待完善", incompleteEntries, index)} />)}
    </Group> : null}

    <Modal opened={Boolean(fixTarget)} onClose={() => setFixTarget(null)} title={`让 AI 完善 ${fixTarget?.length ?? 0} 条`} centered>
      <p className="inbox-modal-text">缺封面的直接抓取；缺分类、摘要、英文正文，或卡片文案太长的，交给 AI 修改，最多同时 2 条。新标签这类需要你决定的会跳过。</p>
      <p className="inbox-modal-text muted">改完不会自动发布，会出现在「待审核」里等你确认。</p>
      <div className="inbox-modal-actions"><Button variant="default" onClick={() => setFixTarget(null)}>取消</Button><Button loading={fixing} onClick={() => void runFix()}>开始</Button></div>
    </Modal>
  </div>;
}
