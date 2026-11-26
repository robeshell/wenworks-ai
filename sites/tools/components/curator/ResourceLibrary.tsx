"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert, Button, Checkbox, Pagination, SegmentedControl, Select, Skeleton, Tabs, TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { BLOCK_LABELS, curatorRequest, type CuratorContentItem } from "@/lib/curator-client";
import { contentBlocks, ENABLED_CONTENT_BLOCK_IDS, type ContentStatus, type EnabledContentBlockId } from "@/lib/content-blocks";
import { navigationHref, saveNavigation } from "@/lib/curator-navigation";
import { curatorEditorHref } from "@/lib/curator-routes";
import { SHIP_REFRESH_EVENT } from "./ShipButton";
import { INBOX_REFRESH_EVENT } from "./useInboxCount";

type LibraryBlock = "all" | EnabledContentBlockId;
type LibraryStatus = "all" | ContentStatus;
type LibraryItem = Omit<CuratorContentItem, "blockType"> & { blockType: EnabledContentBlockId; issueCount: number };
type LibraryCounts = {
  all: number;
  active: number;
  draft: number;
  archived: number;
  issues: number;
  issueTotal: number;
  blocks: Record<EnabledContentBlockId, { total: number; active: number; draft: number }>;
};
type LibraryPage = { navigationIds?: string[]; items: LibraryItem[]; total: number; page: number; pageSize: 20 | 50; pages: number; counts: LibraryCounts };
type WorkspaceSummary = { contentId: string | null; disposition: string; version: number; savedVersion: number; proposalCount?: number };

const BLOCKS: Array<{ value: LibraryBlock; label: string }> = [
  { value: "all", label: "全部" },
  ...ENABLED_CONTENT_BLOCK_IDS.map((value) => ({ value, label: contentBlocks[value].label.zh })),
];
const STATUS_LABEL: Record<ContentStatus, string> = { draft: "草稿", active: "已公开", archived: "已归档" };

// counts 来自 curator 服务端进程，可能比页面旧，按缺省读：少一个板块只是显示 0。
const EMPTY_COUNTS: LibraryCounts = {
  all: 0, active: 0, draft: 0, archived: 0, issues: 0, issueTotal: 0,
  blocks: { tool: { total: 0, active: 0, draft: 0 }, skill: { total: 0, active: 0, draft: 0 }, project: { total: 0, active: 0, draft: 0 }, site: { total: 0, active: 0, draft: 0 }, prompt: { total: 0, active: 0, draft: 0 } },
};

function leadOf(item: LibraryItem) {
  const payload = item.payload as { summary?: { zh?: string } | string; tagline?: { zh?: string } };
  const summary = typeof payload.summary === "string" ? payload.summary : payload.summary?.zh;
  return (item.blockType === "tool" ? payload.tagline?.zh : "") || summary || "";
}

function imageOf(item: LibraryItem, key: "cover" | "logo") {
  const value = (item.payload as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

/** One status per item, the one that matters most right now. */
function StatusMark({ item, pending }: { item: LibraryItem; pending: boolean }) {
  if (pending) return <span className="shelf-status" data-status="pending">有未发布的修改</span>;
  return <span className="shelf-status" data-status={item.status}>{STATUS_LABEL[item.status]}{item.issueCount ? <em> · 待完善 {item.issueCount}</em> : null}</span>;
}

export function ResourceLibrary() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const block = (BLOCKS.some((item) => item.value === searchParams.get("block")) ? searchParams.get("block") : "all") as LibraryBlock;
  const status = (["all", "draft", "active", "archived"].includes(searchParams.get("status") || "") ? searchParams.get("status") : "all") as LibraryStatus;
  const sort = ["updated-desc", "updated-asc", "title-asc"].includes(searchParams.get("sort") || "") ? searchParams.get("sort")! : "updated-desc";
  const issues = searchParams.get("issues") === "true";
  const view = searchParams.get("view") === "list" ? "list" : "grid";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = searchParams.get("pageSize") === "50" ? 50 : 20;
  const query = searchParams.get("query") || "";
  const [search, setSearch] = useState(query);
  const [result, setResult] = useState<LibraryPage>({ items: [], total: 0, page, pageSize, pages: 1, counts: EMPTY_COUNTS });
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [navigationId, setNavigationId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateParams = useCallback((changes: Record<string, string | number | boolean | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(changes).forEach(([key, value]) => {
      if (value === null || value === "" || value === false || value === "all" || (key === "page" && value === 1) || (key === "view" && value === "grid")) next.delete(key);
      else next.set(key, String(value));
    });
    router.replace(`/curator/resources/${next.size ? `?${next.toString()}` : ""}`);
  }, [router, searchParams]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ block, status, sort, page: String(page), pageSize: String(pageSize) });
      if (query) params.set("query", query);
      if (issues) params.set("issues", "true");
      const [payload, workspaces] = await Promise.all([
        curatorRequest<LibraryPage>(`/content?${params.toString()}`),
        curatorRequest<{ items: WorkspaceSummary[] }>("/workspaces").catch(() => ({ items: [] as WorkspaceSummary[] })),
      ]);
      if (!payload.navigationIds) throw new Error("资源库列表需要新版服务，请重启本地服务。");
      const navigation = saveNavigation(sessionStorage, crypto.randomUUID(), payload.navigationIds, params.toString());
      setNavigationId(navigation.id); setResult(payload); setSelected([]);
      setPendingIds(new Set(workspaces.items.filter((w) => w.contentId && w.disposition === "open" && (w.version !== w.savedVersion || (w.proposalCount ?? 0) > 0)).map((w) => w.contentId!)));
      if (payload.page !== page) updateParams({ page: payload.page });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "资源库读取失败"); }
    finally { setLoading(false); }
  }, [block, issues, page, pageSize, query, sort, status, updateParams]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSearch(query); }, [query]);

  const hasFilters = block !== "all" || status !== "all" || issues || Boolean(query);
  const allSelected = result.items.length > 0 && result.items.every((item) => selected.includes(item.id));
  const range = useMemo(() => {
    if (!result.total) return "0 条";
    const start = (result.page - 1) * result.pageSize + 1;
    return `${start}–${Math.min(result.page * result.pageSize, result.total)} / ${result.total} 条`;
  }, [result]);
  const href = (item: LibraryItem) => navigationId ? navigationHref(curatorEditorHref(item.blockType, item.slug), navigationId) : curatorEditorHref(item.blockType, item.slug);

  function submitSearch(event: FormEvent) { event.preventDefault(); updateParams({ query: search.trim(), page: 1 }); }
  function clearFilters() { setSearch(""); updateParams({ block: null, status: null, issues: null, query: null, page: 1 }); }
  function toggleOne(id: string, checked: boolean) { setSelected((current) => checked ? [...current, id] : current.filter((item) => item !== id)); }
  async function batch(nextStatus: "active" | "archived") {
    if (!selected.length) return;
    setBusy(true); setError(null);
    try {
      const response = await curatorRequest<{ message: string }>("/content/batch", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: selected, status: nextStatus }) });
      notifications.show({ message: response.message, color: "curator" });
      window.dispatchEvent(new Event(SHIP_REFRESH_EVENT));
      window.dispatchEvent(new Event(INBOX_REFRESH_EVENT));
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "批量操作失败"); }
    finally { setBusy(false); }
  }

  const empty = <div className="shelf-empty">
    <p>{hasFilters ? "没有匹配的内容" : "资源库还是空的"}</p>
    <span>{hasFilters ? "换个关键词，或者清除筛选。" : "在收件箱贴一个链接，AI 会整理成草稿。"}</span>
    {hasFilters ? <Button variant="default" size="xs" onClick={clearFilters}>清除筛选</Button> : <Button component={Link} href="/curator/" size="xs">去收件箱</Button>}
  </div>;

  return <section className="shelf">
    <header className="shelf-head">
      <h1>资源库</h1>
      <span className="shelf-count">{loading ? "读取中…" : `${result.counts.all} 条 · 已公开 ${result.counts.active}`}</span>
    </header>

    <Tabs value={block} onChange={(value) => updateParams({ block: value || "all", page: 1 })} variant="default" keepMounted={false}>
      <Tabs.List className="curator-block-tabs" aria-label="按内容类型筛选">{BLOCKS.map((item) => <Tabs.Tab value={item.value} key={item.value}>{item.label}<span className="curator-tab-count">{item.value === "all" ? result.counts.all : (result.counts.blocks?.[item.value]?.total ?? 0)}</span></Tabs.Tab>)}</Tabs.List>
    </Tabs>

    <form className="shelf-filters" onSubmit={submitSearch}>
      <TextInput size="xs" value={search} onChange={(event) => setSearch(event.currentTarget.value)} placeholder="搜索名称、链接或摘要，回车" aria-label="搜索资源" className="shelf-search" />
      <Select size="xs" aria-label="内容状态" value={status} onChange={(value) => updateParams({ status: value || "all", page: 1 })} data={[{ value: "all", label: "全部状态" }, { value: "active", label: "已公开" }, { value: "draft", label: "草稿" }, { value: "archived", label: "已归档" }]} w={110} />
      <Select size="xs" aria-label="排序方式" value={sort} onChange={(value) => updateParams({ sort: value || "updated-desc", page: 1 })} data={[{ value: "updated-desc", label: "最近更新" }, { value: "updated-asc", label: "最早更新" }, { value: "title-asc", label: "名称 A–Z" }]} w={110} />
      <Checkbox size="xs" label="只看待完善" checked={issues} onChange={(event) => updateParams({ issues: event.currentTarget.checked, page: 1 })} />
      {hasFilters ? <button type="button" className="shelf-link" onClick={clearFilters}>清除筛选</button> : null}
      <SegmentedControl size="xs" className="shelf-view" aria-label="显示方式" value={view} onChange={(value) => { setSelected([]); updateParams({ view: value }); }} data={[{ value: "grid", label: "卡片" }, { value: "list", label: "列表" }]} />
    </form>

    {error ? <Alert color="red" role="alert" withCloseButton onClose={() => setError(null)}>{error}</Alert> : null}

    {view === "list" && selected.length ? <div className="shelf-selection" role="status">
      <span>已选 {selected.length} 条</span>
      <Button size="xs" variant="default" loading={busy} onClick={() => void batch("active")}>公开所选</Button>
      <Button size="xs" variant="subtle" color="red" disabled={busy} onClick={() => void batch("archived")}>归档所选</Button>
      <button type="button" className="shelf-link" onClick={() => setSelected([])}>取消</button>
    </div> : null}

    {loading ? <div className={view === "grid" ? "shelf-grid" : "shelf-list"}>{Array.from({ length: 8 }, (_, index) => <Skeleton key={index} h={view === "grid" ? 220 : 52} radius="md" />)}</div>
      : !result.items.length ? empty
      : view === "grid" ? <div className="shelf-grid">{result.items.map((item) => {
        const cover = imageOf(item, "cover"); const logo = imageOf(item, "logo"); const lead = leadOf(item);
        return <Link key={item.id} href={href(item)} className="shelf-card" data-status={item.status}>
          <div className="shelf-card-cover" data-empty={!cover || undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {cover ? <img src={cover} alt="" loading="lazy" /> : <span>{lead || BLOCK_LABELS[item.blockType]}</span>}
          </div>
          <div className="shelf-card-name">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo ? <img src={logo} alt="" /> : null}<span>{item.title}</span>
          </div>
          {cover && lead ? <p className="shelf-card-lead">{lead}</p> : null}
          <div className="shelf-card-meta"><span>{BLOCK_LABELS[item.blockType]}</span><StatusMark item={item} pending={pendingIds.has(item.id)} /></div>
        </Link>;
      })}</div>
      : <div className="shelf-list" role="list">
        <label className="shelf-row shelf-row-head"><Checkbox size="xs" checked={allSelected} indeterminate={selected.length > 0 && !allSelected} onChange={(event) => setSelected(event.currentTarget.checked ? result.items.map((item) => item.id) : [])} aria-label="选择当前页全部" /><span>名称</span><span>类型</span><span>状态</span><span>更新</span></label>
        {result.items.map((item) => <div key={item.id} className="shelf-row" role="listitem" data-selected={selected.includes(item.id) || undefined}>
          <Checkbox size="xs" checked={selected.includes(item.id)} onChange={(event) => toggleOne(item.id, event.currentTarget.checked)} aria-label={`选择 ${item.title}`} />
          <Link href={href(item)} className="shelf-row-title"><b>{item.title}</b><span>{leadOf(item)}</span></Link>
          <span>{BLOCK_LABELS[item.blockType]}</span>
          <StatusMark item={item} pending={pendingIds.has(item.id)} />
          <span className="shelf-date">{new Date(item.updatedAt).toLocaleDateString("zh-CN")}</span>
        </div>)}
      </div>}

    {result.pages > 1 || result.total > 20 ? <footer className="shelf-pager">
      <span>{range}</span>
      <Pagination value={result.page} onChange={(nextPage) => updateParams({ page: nextPage })} total={result.pages} size="sm" />
      <Select size="xs" w={110} aria-label="每页条数" value={String(result.pageSize)} onChange={(value) => updateParams({ pageSize: value || "20", page: 1 })} data={[{ value: "20", label: "每页 20 条" }, { value: "50", label: "每页 50 条" }]} />
    </footer> : null}
  </section>;
}
