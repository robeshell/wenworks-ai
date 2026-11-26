"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Alert, Badge, Button, Group, Menu, Modal, SegmentedControl, Skeleton, Stack, Text, TextInput, Textarea, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { MarkdownBody } from "@/components/MarkdownBody";
import { BLOCK_LABELS, CURATOR_API, curatorRequest, type CuratorContentItem, type CuratorIngestBlock } from "@/lib/curator-client";
import { workspaceHref, workspacePost, type Workspace } from "@/lib/curator-workspace";
import { navigationHref, navigationKey, nextResourceIds, readNavigation, saveNavigation, type CuratorNavigation } from "@/lib/curator-navigation";
import { WorkspaceFields } from "./WorkspaceFields";
import { SHIP_REFRESH_EVENT } from "./ShipButton";
import { INBOX_REFRESH_EVENT } from "./useInboxCount";

const stringify = (v: unknown) => typeof v === "string" ? v : JSON.stringify(v, null, 2);
const storageKey = (id: string) => `curator-workspace:${id}`;
const types = (["tool", "skill", "project", "site", "prompt"] as const).map((value) => ({ value, label: BLOCK_LABELS[value] }));

export function ResourceWorkspace({ workspaceId, slug, block = "tool", conversationId }: { workspaceId?: string; slug?: string; block?: CuratorIngestBlock; conversationId?: string }) {
  const router = useRouter();
  const [navigation, setNavigation] = useState<CuratorNavigation | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null), [draft, setDraft] = useState<CuratorContentItem | null>(null);
  const [error, setError] = useState(""), [status, setStatus] = useState("正在打开工作区…"), [busy, setBusy] = useState(false);
  const [text, setText] = useState(""), [model] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false), [mobile, setMobile] = useState("content"), [chatOpen, setChatOpen] = useState(true);
  const [sourceOpen, setSourceOpen] = useState(false), [sourceUrl, setSourceUrl] = useState(""), [sourceText, setSourceText] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [width, setWidth] = useState(36), [history, setHistory] = useState<{ note: string; changes: Array<{ path: string; before: unknown; after: unknown }> } | null>(null);
  const current = useRef<Workspace | null>(null), local = useRef<CuratorContentItem | null>(null), base = useRef<CuratorContentItem | null>(null);
  const dirty = useRef(false), edits = useRef(0), flushPromise = useRef<Promise<Workspace> | null>(null), unique = useRef<string>("");
  const mounted = useRef(true), scroll = useRef<HTMLDivElement>(null);
  const accept = useCallback((value: Workspace) => {
    if (current.current?.id === value.id && current.current.sequence > value.sequence) value = current.current;
    current.current = value;
    if (!mounted.current) return;
    setWorkspace(value);
    if (!dirty.current) { local.current = value.draft; base.current = value.draft; setDraft(value.draft); }
  }, []);
  const flush = useCallback(async (): Promise<Workspace> => {
    if (flushPromise.current) return flushPromise.current;
    if (!current.current) throw new Error("工作区尚未打开");
    flushPromise.current = (async () => {
      while (dirty.current && local.current && base.current) {
        const snapshot = local.current, baseline = base.current, sequence = edits.current, id = current.current!.id;
        setStatus("正在暂存…");
        const value = await workspacePost(`/workspaces/${id}/recover`, { base: baseline, draft: snapshot });
        base.current = snapshot;
        if (edits.current === sequence) { dirty.current = false; localStorage.removeItem(storageKey(id)); }
        accept(value);
      }
      setStatus("草稿已自动暂存");
      return current.current!;
    })();
    try { return await flushPromise.current; }
    catch (caught) { setStatus("暂存失败，修改仍保留在此浏览器"); throw caught; }
    finally { flushPromise.current = null; }
  }, [accept]);
  const change = (value: CuratorContentItem) => {
    local.current = value; dirty.current = true; edits.current++; setDraft(value); setError(""); setStatus("正在编辑…");
    if (current.current) { try { localStorage.setItem(storageKey(current.current.id), JSON.stringify({ base: base.current, draft: value })); } catch { setError("浏览器存储空间不足，请保持页面打开并重试暂存。"); } }
  };
  useEffect(() => {
    mounted.current = true;
    let live = true;
    if (!unique.current) unique.current = crypto.randomUUID();
    (async () => {
      let value = workspaceId ? await curatorRequest<Workspace>(`/workspaces/${encodeURIComponent(workspaceId)}`) : await workspacePost("/workspaces", { id: unique.current, ...(slug && slug !== "new" ? { slug } : {}), conversationId, draft: { blockType: block } });
      if (!live) return;
      const cached = localStorage.getItem(storageKey(value.id));
      if (cached) {
        const restored = JSON.parse(cached);
        value = await workspacePost(`/workspaces/${value.id}/recover`, restored);
        localStorage.removeItem(storageKey(value.id));
      }
      if (!live) return;
      let href = workspaceHref(value.id);
      const navigationId = new URLSearchParams(window.location.search).get("nav");
      if (value.contentId || navigationId) {
        try {
          let snapshot = navigationId ? readNavigation(sessionStorage, navigationId) : null;
          if (navigationId && !snapshot) throw new Error("此编辑列表已失效，请从资源库重新打开。");
          if (!snapshot) {
            const list = await curatorRequest<{ navigationIds: string[] }>("/content?navigation=true&sort=updated-desc");
            snapshot = saveNavigation(sessionStorage, crypto.randomUUID(), list.navigationIds);
          }
          if (!live) return;
          setNavigation(snapshot); href = navigationHref(href, snapshot.id);
        } catch (e) { if (live) setError(e instanceof Error ? e.message : "无法读取编辑列表"); if (navigationId) href = navigationHref(href, navigationId); }
      }
      if (!live) return;
      accept(value); setStatus("草稿已自动暂存");
      window.history.replaceState(null, "", href);
    })().catch((e) => { if (live) setError(e.message); });
    return () => { live = false; mounted.current = false; };
  }, [workspaceId, slug, block, conversationId, accept]);
  useEffect(() => {
    if (!draft || !dirty.current) return;
    const timer = setTimeout(() => { void flush().catch((e) => setError(e.message)); }, 650);
    return () => clearTimeout(timer);
  }, [draft, flush]);
  useEffect(() => {
    if (!workspace?.id) return;
    const source = new EventSource(`${CURATOR_API}/workspaces/${workspace.id}/events?after=${workspace.sequence}`);
    let timer: ReturnType<typeof setTimeout> | undefined;
    source.onmessage = () => {
      if (timer) return;
      timer = setTimeout(() => { timer = undefined; void curatorRequest<Workspace>(`/workspaces/${workspace.id}`).then(accept).catch((e) => setError(e.message)); }, 200);
    };
    source.onerror = () => setStatus("连接中断，正在恢复；本地修改仍会保留");
    source.onopen = () => { if (!dirty.current) setStatus("草稿已自动暂存"); void curatorRequest<Workspace>(`/workspaces/${workspace.id}`).then(accept).catch(() => {}); };
    return () => { source.close(); if (timer) clearTimeout(timer); };
    // Resume from the snapshot cursor once; EventSource retains subsequent IDs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace?.id, accept]);
  useEffect(() => { const warn = (e: BeforeUnloadEvent) => { if (dirty.current) e.preventDefault(); }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, []);
  useEffect(() => { scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: "smooth" }); }, [workspace?.conversation.messages.length]);

  async function action(name: string, data: Record<string, unknown> = {}) {
    setBusy(true); setError("");
    try { const value = await flush(); const next = await workspacePost(`/workspaces/${value.id}/${name}`, { ...data, version: value.version }); accept(next); return next; }
    catch (e) { setError(e instanceof Error ? e.message : "操作失败"); }
    finally { setBusy(false); }
  }
  async function openNextResource() {
    setBusy(true); setError("");
    try {
      const value = await flush();
      let snapshot = navigation;
      if (!snapshot) {
        const navigationId = new URLSearchParams(window.location.search).get("nav");
        if (navigationId) throw new Error("此编辑列表已失效，请从资源库重新打开。");
        const list = await curatorRequest<{ navigationIds: string[] }>("/content?navigation=true&sort=updated-desc");
        snapshot = saveNavigation(sessionStorage, crypto.randomUUID(), list.navigationIds);
        setNavigation(snapshot);
        window.history.replaceState(null, "", navigationHref(workspaceHref(value.id), snapshot.id));
      }
      if (await goToNext(snapshot, value)) return;
      notifications.show({ message: "已到当前列表末尾", color: "gray" });
    } catch (e) { setError(e instanceof Error ? e.message : "无法打开下一条资源"); }
    finally { setBusy(false); }
  }
  /** Open the entry after this one in the current pass. At the end of a
   *  review pass, go back to the dashboard. Returns false at the end of a
   *  plain editing pass. */
  async function goToNext(snapshot: CuratorNavigation, value: Workspace) {
    for (const key of nextResourceIds(snapshot, navigationKey(value))) {
      if (key.startsWith("ws:")) { router.push(navigationHref(workspaceHref(key.slice(3)), snapshot.id)); return true; }
      try {
        const next = await workspacePost("/workspaces", { contentId: key });
        router.push(navigationHref(workspaceHref(next.id), snapshot.id));
        return true;
      } catch (error) {
        if (error && typeof error === "object" && "status" in error && error.status === 404) continue;
        throw error;
      }
    }
    if (snapshot.review) {
      notifications.show({ message: `「${snapshot.review.title}」这一组处理完了`, color: "green" });
      router.push("/curator/");
      return true;
    }
    return false;
  }
  /** Publish is the one save that matters: it takes the pending agent
   *  proposals shown on screen, saves, and updates the local public files.
   *  Going live still needs a push. In a review pass it moves on. */
  async function publish(advance: boolean) {
    setBusy(true); setError("");
    try {
      let value = await flush();
      for (const proposal of value.proposals) {
        if (proposal.kind === "conflict") throw new Error("上方有需要合并的冲突，请先选择保留哪一版。");
        if (proposal.baseVersion !== value.version) throw new Error("上方的修改提案已过期，请先采用或保留原内容。");
        value = await workspacePost(`/workspaces/${value.id}/proposal`, { proposalId: proposal.id, action: "apply", version: value.version });
      }
      const saved = await workspacePost(`/workspaces/${value.id}/save`, { publish: true, version: value.version });
      accept(saved);
      if (saved.exportJob?.status === "failed") { setError(saved.exportJob.error || "公开目录更新失败，请重试。"); return; }
      notifications.show({ message: "已发布，点右上角「上线」推送到线上", color: "green" });
      window.dispatchEvent(new Event(SHIP_REFRESH_EVENT));
      window.dispatchEvent(new Event(INBOX_REFRESH_EVENT));
      if (advance && navigation) await goToNext(navigation, saved);
    } catch (e) { setError(e instanceof Error ? e.message : "发布没有完成"); }
    finally { setBusy(false); }
  }
  async function skip() {
    setBusy(true); setError("");
    try { const value = await flush(); if (navigation) await goToNext(navigation, value); }
    catch (e) { setError(e instanceof Error ? e.message : "无法打开下一条"); }
    finally { setBusy(false); }
  }
  async function send(value = text, mode = "chat", stopFirst = false, autoType = false) {
    if (!value.trim()) return;
    if (stopFirst) { const running = current.current?.operations.find((o) => o.status === "running"); if (running) await action("stop", { operationId: running.id }); }
    const next = await action("message", { text: value, mode, model, autoType, requestId: crypto.randomUUID() });
    if (next && value === text) setText("");
  }
  if (!workspace || !draft) return <Stack><Title order={1}>资源工作区</Title>{error ? <Alert color="red">{error}<Button mt="sm" onClick={() => window.location.reload()}>重新打开</Button></Alert> : <><Skeleton h={40} /><Skeleton h={360} /></>}</Stack>;
  const running = workspace.operations.find((o) => o.status === "running"), queued = workspace.operations.filter((o) => o.status === "queued");
  const published = workspace.publication?.item.status === "active" ? workspace.publication.item : undefined;
  const review = navigation?.review;
  const reviewIndex = navigation ? navigation.ids.indexOf(navigationKey(workspace)) + 1 : 0, reviewTotal = navigation?.ids.length ?? 0;
  const changedPublic = !published || JSON.stringify({ title: draft.title, slug: draft.slug, blockType: draft.blockType, category: draft.category, tags: draft.tags, payload: draft.payload }) !== JSON.stringify({ title: published.title, slug: published.slug, blockType: published.blockType, category: published.category, tags: published.tags, payload: published.payload });
  const hasChanges = changedPublic || workspace.proposals.length > 0;
  const archived = workspace.item?.status === "archived";
  const stateLabel = archived ? "已归档" : published ? (hasChanges ? "已公开 · 有修改还没发布" : "已公开") : workspace.contentId ? "草稿，还没公开" : "新收录，还没保存";
  const primaryLabel = review ? (published && !hasChanges ? "下一条" : "发布并下一条") : !published ? (archived ? "重新发布" : "发布") : hasChanges ? "发布更新" : "已是最新";
  return <section className="resource-workspace" style={{ "--chat-width": `${width}%` } as CSSProperties}>
    <header className="resource-workspace-header">
      <div><Link href={review ? "/curator/" : `/curator/resources/${navigation?.query ? `?${navigation.query}` : ""}`} className="resource-back">← {review ? "工作台" : "资源库"}</Link><Title order={1}>{draft.title || "新资源"}</Title><Text size="xs" c="dimmed" role="status" aria-live="polite">{stateLabel}</Text></div>
      <Group gap="xs">
        <Menu position="bottom-end" width={200}>
          <Menu.Target><Button variant="subtle" disabled={busy}>更多</Button></Menu.Target>
          <Menu.Dropdown>
            {!published ? <Menu.Item onClick={() => void action("save")}>存为草稿（不公开）</Menu.Item> : null}
            {!workspace.contentId ? <Menu.Item onClick={() => { setBusy(true); void flush().then(() => router.push("/curator/ingest/")).catch((e) => { setError(e.message); setBusy(false); }); }}>收录新资源</Menu.Item> : null}
            <Menu.Item disabled={!workspace.changes.length} onClick={() => setHistoryOpen(true)}>修改记录</Menu.Item>
            {published ? <Menu.Item component="a" href={`/${draft.blockType === "tool" ? "" : `${draft.blockType}s/${published.slug}/`}`} target="_blank">在公开站查看 ↗</Menu.Item> : null}
            <Menu.Label>转换类型</Menu.Label>
            {types.filter((t) => t.value !== draft.blockType).map((t) => <Menu.Item key={t.value} onClick={() => void action("convert", { targetType: t.value })}>改成{t.label}</Menu.Item>)}
            {workspace.contentId && workspace.item?.status !== "archived" ? <><Menu.Divider /><Menu.Item color="red" onClick={() => setArchiveOpen(true)}>归档</Menu.Item></> : null}
          </Menu.Dropdown>
        </Menu>
        {review ? <Button variant="default" disabled={busy} onClick={() => void skip()}>跳过</Button> : workspace.contentId ? <Button variant="default" disabled={busy} onClick={() => void openNextResource()}>下一条</Button> : null}
        <Button loading={busy} disabled={!review && published && !hasChanges} onClick={() => void (review && published && !hasChanges ? skip() : publish(Boolean(review)))}>{primaryLabel}</Button>
      </Group>
    </header>
    {review ? <section className="review-bar" aria-label="审核进度">
      <div className="review-bar-head"><b>{review.title}</b><span>第 {reviewIndex} / {reviewTotal} 条</span></div>
      <ReviewChanges reference={published ?? workspace.item ?? null} draft={draft} proposals={workspace.proposals} />
    </section> : null}
    {error ? <Alert color="red" withCloseButton onClose={() => setError("")}>{error}{draft !== workspace.draft ? <Button size="xs" variant="subtle" onClick={() => void flush().catch((e) => setError(e.message))}>重试暂存</Button> : null}</Alert> : null}
    {workspace.externalChanged ? <Alert color="orange">资源库中的已保存版本在其他位置更新了，当前工作草稿已保留。<Button size="xs" variant="subtle" onClick={() => void action("rebase")}>合并最新保存版本</Button></Alert> : null}
    {workspace.exportJob?.status === "failed" ? <Alert color="orange" title="公开文件更新失败，保存的版本仍在">{workspace.exportJob.error}<Button size="xs" variant="subtle" onClick={() => void action("export")}>重试更新</Button></Alert> : null}
    <div className="resource-mobile-tabs"><Text size="xs" role="status" aria-live="polite">{running ? "助手正在处理，可以继续编辑" : workspace.operations[0]?.status === "completed" ? "助手已完成，可在内容和助手中查看结果" : ""}</Text><SegmentedControl fullWidth value={mobile} onChange={(value) => { setMobile(value); if (value === "chat") setChatOpen(true); }} data={[{ value: "content", label: "内容" }, { value: "chat", label: "助手" }]} /></div>
    <div className={`resource-workspace-split ${chatOpen ? "" : "chat-collapsed"}`} data-mobile={mobile}>
      <section className="resource-content-pane" aria-label="资源内容">
        <div className="resource-content-scroll">
          {workspace.proposals.map((proposal) => <section className="resource-proposal" key={proposal.id}><Badge variant="light" color="gray">{proposal.kind === "conflict" ? "两个版本不一致，选一个" : "AI 建议的修改 · 发布时会一起采用"}</Badge><Text mt="xs" size="sm">{proposal.note}</Text><Diff changes={proposal.changes} /><Group mt="sm"><Button size="xs" disabled={busy || proposal.baseVersion !== workspace.version} onClick={() => void action("proposal", { proposalId: proposal.id, action: "apply" })}>采用</Button><Button size="xs" variant="default" onClick={() => void action("proposal", { proposalId: proposal.id, action: "dismiss" })}>不要</Button></Group>{proposal.baseVersion !== workspace.version ? <Text c="orange" size="xs" mt="xs">之后内容又改过，这条建议已失效，可以让 AI 重新改一次。</Text> : null}</section>)}
          <WorkspaceFields draft={draft} sources={workspace.sources} onChange={change} busy={busy} onCollectLogo={() => void action("logo").then((value) => { if (value) notifications.show({ message: "图标已采集", color: "green" }); })} onCollectCover={(pageUrl) => void action("cover", pageUrl ? { pageUrl } : {}).then((value) => { if (value) notifications.show({ message: "封面已采集", color: "green" }); })} />
        </div>
        <footer className="resource-content-footer"><Text size="xs" c="dimmed" role="status">{status}</Text><Button size="xs" variant="subtle" onClick={() => setChatOpen(!chatOpen)}>{chatOpen ? "收起助手" : "展开助手"}</Button></footer>
      </section>
      {chatOpen ? <><div className="resource-resizer" role="separator" aria-label="调整助手宽度" aria-orientation="vertical" aria-valuenow={width} aria-valuemin={28} aria-valuemax={48} tabIndex={0} onKeyDown={(e) => { if (["ArrowLeft", "ArrowRight"].includes(e.key)) { e.preventDefault(); setWidth((v) => Math.max(28, Math.min(48, v + (e.key === "ArrowLeft" ? 2 : -2)))); } }} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) { const bounds = e.currentTarget.parentElement!.getBoundingClientRect(); setWidth(Math.max(28, Math.min(48, (bounds.right - e.clientX) / bounds.width * 100))); } }} onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)} />
      <aside className="resource-chat-pane" aria-label="AI 助手">
        <div className="resource-pane-toolbar"><Text size="sm" fw={500}>AI 助手</Text></div>
        <div className="resource-messages" ref={scroll}>
          {!workspace.conversation.messages.length ? <div className="resource-chat-welcome">{workspace.contentId ? <Text size="sm" c="dimmed">想改哪里，直接说。比如「摘要再短一点」。</Text> : <><Text size="sm" c="dimmed">填写来源链接，让 AI 起草。</Text><Button variant="default" mt="md" disabled={busy || !draft.sourceUrl} onClick={() => void send("根据来源生成首份草稿", "ingest")}>读取来源并起草</Button></>}</div> : null}
          {workspace.conversation.messages.map((message) => <ChatMessage key={message.id} message={message} busy={busy} onUndo={(changeId) => void action("undo", { changeId })} />)}
          {running ? <div className="chat-status" role="status"><span className="chat-status-dot" aria-hidden="true" />{running.result?.stage || "正在处理"}…<button type="button" onClick={() => void action("stop", { operationId: running.id })}>停止</button></div> : null}
          {queued.map((op) => <div key={op.id} className="chat-status muted">排队中：{taskLabel(op.input.text)}<button type="button" onClick={() => void action("stop", { operationId: op.id })}>取消</button></div>)}
          {workspace.operations[0] && ["failed", "cancelled"].includes(workspace.operations[0].status) ? <div className="chat-status muted">{workspace.operations[0].status === "failed" ? "这次没有完成" : "已停止"}<button type="button" onClick={() => void send(workspace.operations[0].input.text, workspace.operations[0].input.mode, false, workspace.operations[0].input.autoType)}>重试</button></div> : null}
        </div>
        <div className="resource-composer"><div className="chat-quick">{QUICK_ASKS.map((ask) => <button key={ask.label} type="button" onClick={() => void send(ask.text)} disabled={busy}>{ask.label}</button>)}</div><Textarea aria-label="给 AI 的话" placeholder="想改哪里，直接说" autosize minRows={2} maxRows={8} value={text} onChange={(e) => setText(e.currentTarget.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.nativeEvent.keyCode !== 229) { e.preventDefault(); if (!e.repeat && !busy && text.trim()) void send(); } }} /><Group justify="space-between" mt="xs"><Text size="xs" c="dimmed">Enter 发送 · Shift+Enter 换行</Text><Button size="xs" disabled={busy || !text.trim()} onClick={() => void send(text, "chat", Boolean(running))}>{running ? "停止并改为这个" : "发送"}</Button></Group></div>
      </aside></> : null}
    </div>
    <Modal opened={sourceOpen} onClose={() => setSourceOpen(false)} title="补充来源资料" centered><Stack><TextInput label="资料链接（可选）" value={sourceUrl} onChange={(e) => setSourceUrl(e.currentTarget.value)} /><Textarea label="正文" minRows={6} value={sourceText} onChange={(e) => setSourceText(e.currentTarget.value)} /><Button disabled={!sourceText.trim() || busy} onClick={() => { void action("source", { source: { url: sourceUrl, text: sourceText, title: "补充资料", kind: "pasted" } }).then((w) => { if (w) { setSourceOpen(false); setSourceText(""); setSourceUrl(""); } }); }}>保存资料</Button></Stack></Modal>
    <Modal opened={archiveOpen} onClose={() => setArchiveOpen(false)} title="归档这条资源" centered><Text size="sm">归档会从公开目录移除这条资源。草稿、来源和全部修改记录都会保留。</Text><Group justify="flex-end" mt="lg"><Button variant="default" onClick={() => setArchiveOpen(false)}>取消</Button><Button loading={busy} onClick={() => { void action("save", { archive: true }).then((v) => { if (v) setArchiveOpen(false); }); }}>确认归档</Button></Group></Modal>
    <Modal opened={historyOpen} onClose={() => { setHistoryOpen(false); setHistory(null); }} title={history ? history.note : "修改记录"} size="lg">
      {history ? <><Button size="xs" variant="subtle" mb="sm" onClick={() => setHistory(null)}>← 全部记录</Button><Diff changes={history.changes} /></> : <Stack gap="xs">{workspace.changes.map((c) => <div className="resource-history" key={c.id}><div><Text size="sm">{c.note}</Text><Text size="xs" c="dimmed">{new Date(c.createdAt).toLocaleString("zh-CN")}</Text></div><Group gap={4}><Button size="xs" variant="subtle" onClick={() => void curatorRequest<{ note: string; changes: Array<{ path: string; before: unknown; after: unknown }> }>(`/workspaces/${workspace.id}/history/${c.id}`).then(setHistory).catch((e) => setError(e.message))}>看改动</Button><Button size="xs" variant="default" onClick={() => void action("undo", { changeId: c.id })}>撤销</Button></Group></div>)}</Stack>}
    </Modal>
  </section>;
}

function Diff({ changes }: { changes: Array<{ path: string; before: unknown; after: unknown }> }) {
  return <div className="resource-diffs">{changes.map((change) => <details key={change.path}><summary>{fieldName(change.path)}</summary><div className="resource-diff-columns"><pre aria-label="修改前">{stringify(change.before) || "（空）"}</pre><pre aria-label="修改后">{stringify(change.after) || "（空）"}</pre></div></details>)}</div>;
}


function fieldName(path: string) {
  const names: Record<string,string> = { title:"名称", slug:"Slug", blockType:"内容类型", category:"分类", tags:"标签", sourceUrl:"来源链接", summary:"摘要", tagline:"一句话定位", description:"详细介绍", body:"正文", prompt:"提示词原文", variables:"变量", examples:"示例", links:"相关链接", url:"访问地址", logo:"Logo" };
  const parts = path.replace(/^payload\./, "").split(".");
  return `${parts[1] === "zh" ? "中文" : parts[1] === "en" ? "英文" : ""}${names[parts[0]] || parts[0]}`;
}

const REVIEW_FIELDS: Array<[string, string]> = [
  ["title", "名称"], ["category", "分类"], ["tags", "标签"], ["sourceUrl", "来源链接"],
  ["payload.tagline.zh", "中文一句话定位"], ["payload.tagline.en", "英文一句话定位"],
  ["payload.summary.zh", "中文摘要"], ["payload.summary.en", "英文摘要"],
  ["payload.description.zh", "中文详细介绍"], ["payload.description.en", "英文详细介绍"],
  ["payload.body.zh", "中文正文"], ["payload.body.en", "英文正文"], ["payload.prompt", "提示词原文"],
  ["payload.url", "访问地址"], ["payload.cover", "封面"], ["payload.logo", "图标"],
];

function readPath(item: unknown, path: string): unknown {
  // Older long-form items store the body as one Chinese string.
  const value = path.split(".").reduce<unknown>((node, part) => {
    if (node && typeof node === "object") return (node as Record<string, unknown>)[part];
    if (typeof node === "string" && part === "zh") return node;
    return undefined;
  }, item);
  return value ?? "";
}

function describe(value: unknown) {
  if (Array.isArray(value)) return value.join("、") || "（空）";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text || "（空）";
}

/** What publishing this entry would change, in plain words: the working draft
 *  and any pending proposals against the public (or last saved) version. */
export function ReviewChanges({ reference, draft, proposals }: {
  reference: CuratorContentItem | null;
  draft: CuratorContentItem;
  proposals: Workspace["proposals"];
}) {
  if (!reference) return <Text size="sm" c="dimmed">新收录的资源，发布后会第一次出现在公开站。</Text>;
  const proposed = new Map(proposals.flatMap((p) => p.changes.map((c) => [c.path, c.after] as const)));
  const rows = REVIEW_FIELDS.flatMap(([path, label]) => {
    const before = readPath(reference, path);
    const fromProposal = proposed.has(path);
    const after = fromProposal ? proposed.get(path) : readPath(draft, path);
    return JSON.stringify(before) === JSON.stringify(after) ? [] : [{ path, label, before, after, fromProposal }];
  });
  if (!rows.length) return <Text size="sm" c="dimmed">和公开版本没有区别。</Text>;
  return <ul className="review-changes">{rows.map((row) => {
    const long = typeof row.after === "string" && row.after.length > 120;
    return <li key={row.path}>
      <span className="review-field">{row.label}{row.fromProposal ? <em>提案</em> : null}</span>
      {row.path === "payload.cover" && typeof row.after === "string" && row.after ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="review-cover" src={row.after} alt="新封面" />
      ) : long ? (
        <details><summary>{row.before ? `改写（${String(row.before).length} → ${String(row.after).length} 字）` : `新增（${String(row.after).length} 字）`}</summary><pre>{String(row.after)}</pre></details>
      ) : (
        <span className="review-value">{row.before ? <><s>{describe(row.before)}</s> → </> : null}<b>{describe(row.after)}</b></span>
      )}
    </li>;
  })}</ul>;
}


const QUICK_ASKS = [
  { label: "润色摘要", text: "润色中文摘要，保留原有事实，更短更具体。" },
  { label: "缩短一句话", text: "把卡片上显示的那句话缩短到中文 16 字以内，保留最关键的判断。" },
  { label: "补英文", text: "把缺的英文内容按中文补齐：摘要，以及正文（如果有）。" },
];

/** Instructions the Curator sends on the user's behalf read as a short task,
 *  not as the full prompt the model received. */
function taskLabel(text: string, label?: string) {
  if (label) return label;
  if (/^请按下面几项修改这条资源/.test(text)) return "AI 完善";
  if (/^根据来源生成首份草稿/.test(text)) return "收录 · 生成首份草稿";
  if (/^整理这份提示词/.test(text)) return "收录 · 整理提示词";
  return "";
}

type ChatMessageData = Workspace["conversation"]["messages"][number];
function ChatMessage({ message, busy, onUndo }: { message: ChatMessageData; busy: boolean; onUndo: (changeId: number) => void }) {
  const data = (message.data || {}) as { label?: string; status?: string; changes?: Array<{ id: number; note: string }> };
  if (message.role === "user") {
    const label = taskLabel(message.text, data.label);
    return label ? <div className="chat-task">{label}</div> : <div className="chat-user">{message.text}</div>;
  }
  if (data.status === "failed") return <div className="chat-reply muted">这次没有完成。<details><summary>原因</summary><Text size="xs" style={{ whiteSpace: "pre-wrap" }}>{message.text}</Text></details></div>;
  if (data.status === "cancelled") return <div className="chat-reply muted">已停止，改动都保留着。</div>;
  const changes = data.changes || [];
  return <div className="chat-reply">
    {message.text ? <MarkdownBody source={message.text} /> : null}
    {changes.length ? <div className="chat-changes">已修改：{changes.map((c) => c.note).join("、")}{changes.length === 1 ? <button type="button" disabled={busy} onClick={() => onUndo(changes[0].id)}>撤销</button> : <details><summary>撤销</summary>{changes.map((c) => <button key={c.id} type="button" disabled={busy} onClick={() => onUndo(c.id)}>撤销「{c.note}」</button>)}</details>}</div> : null}
  </div>;
}
