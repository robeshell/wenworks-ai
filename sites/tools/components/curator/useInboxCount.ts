"use client";

import { useEffect, useState } from "react";
import { curatorRequest } from "@/lib/curator-client";

type Item = { id: string; status: string; issues?: string[] };
type WorkspaceSummary = { contentId: string | null; disposition: string; version: number; savedVersion: number; operationStatus: string | null; proposalCount?: number };

/** Everything the inbox asks a person to look at, for the sidebar badge. */
export function inboxCount(items: Item[], workspaces: WorkspaceSummary[]) {
  const attention = workspaces.filter((w) => w.disposition === "open" && (["running", "queued", "failed", "cancelled"].includes(w.operationStatus || "") || w.version !== w.savedVersion || (w.proposalCount ?? 0) > 0 || !w.contentId));
  const inAttention = new Set(attention.map((w) => w.contentId).filter(Boolean));
  const waiting = items.filter((item) => !inAttention.has(item.id) && (item.status === "draft" || (item.status === "active" && (item.issues?.length ?? 0) > 0)));
  return attention.length + waiting.length;
}

export const INBOX_REFRESH_EVENT = "curator:inbox-refresh";

export function useInboxCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    const load = () => Promise.all([
      curatorRequest<{ items: Item[] }>("/content?pageSize=100"),
      curatorRequest<{ items: WorkspaceSummary[] }>("/workspaces"),
    ]).then(([content, workspaces]) => { if (active) setCount(inboxCount(content.items, workspaces.items)); }).catch(() => undefined);
    void load();
    const timer = window.setInterval(load, 20_000);
    window.addEventListener("focus", load);
    window.addEventListener(INBOX_REFRESH_EVENT, load);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", load); window.removeEventListener(INBOX_REFRESH_EVENT, load); };
  }, []);
  return count;
}
