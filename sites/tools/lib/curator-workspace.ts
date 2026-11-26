import { curatorRequest, type CuratorContentItem, type Conversation } from "./curator-client";

export type WorkspaceOperation = { id: string; status: "queued" | "running" | "completed" | "failed" | "cancelled"; input: { text: string; mode: string; model?: string; autoType?: boolean }; result?: { logo?: { status: string; error?: string }; text?: string; stage?: string; timings?: { acceptedAt: string; startedAt: string; firstResponseAt?: string; firstDraftAt?: string; completedAt?: string; tools: Array<{ tool: string; durationMs: number; failed: boolean }> } }; error?: string };
export type Workspace = {
  id: string; contentId: string | null; draft: CuratorContentItem; version: number; savedVersion: number;
  externalChanged: boolean; item: CuratorContentItem | null; publication: { item: CuratorContentItem; revisionId: number; updatedAt: string } | null;
  conversation: Conversation; sequence: number; disposition: string;
  operations: WorkspaceOperation[];
  sources: Array<{ id: number; url: string; title: string; text: string; kind: string }>;
  changes: Array<{ id: number; version: number; kind: string; note: string; createdAt: string }>;
  proposals: Array<{ id: string; note: string; kind: string; baseVersion: number; changes: Array<{ path: string; before: unknown; after: unknown }> }>;
  exportJob: { id: number; status: string; error: string } | null;
};
export const workspaceHref = (id: string) => `/curator/editor/?workspace=${encodeURIComponent(id)}`;
export const workspacePost = <T = Workspace>(path: string, data: unknown) => curatorRequest<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
