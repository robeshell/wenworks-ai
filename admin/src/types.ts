import type { Entry, Issue, Kind, Status } from '../shared/content.mjs';

export type EntrySummary = {
  id: string; kind: Kind; slug: string; title: string; status: Status; category: string; tags: string[];
  updatedAt?: string; updatedBy?: string; cover: string; logo: string; line: string; issues: Issue[];
};
export type FullEntry = Entry & { issues: Issue[] };
export type Taxonomy = {
  categories: { id: string; blocks: string[]; label: { zh: string; en: string }; hint?: string }[];
  tags: { id: string; label: { zh: string; en: string }; hint?: string }[];
};
export type Status_ = { repo: string; branch: string; site: string; githubToken: boolean; openrouter: boolean; access: boolean; dev: boolean };
export type Overview = {
  counts: Record<Kind, Record<Status, number>>;
  total: number;
  todo: EntrySummary[];
  recent: EntrySummary[];
  lastPublish: { published_at: string; published_by: string; commit_sha: string; message: string } | null;
  editedSinceLastPublish: number;
  publishReady: boolean;
  inbox: number;
  inboxItems: { id: number; url: string; status: 'new' | 'drafted' | 'failed'; title: string; at: string }[];
  activity: { at: string; by: string; kind: 'save' | 'publish' | 'inbox'; text: string; link: string | null }[];
};
export type Health = {
  pending: number | null;
  pendingError: string | null;
  workflows: { file: string; label: string; hint: string; available: boolean; status: string | null; conclusion: string | null; at: string | null; event: string | null; url: string }[];
};
export type InboxItem = {
  id: number; url: string; note: string; status: 'new' | 'drafted' | 'failed' | 'accepted' | 'picked' | 'dismissed';
  draft: import('../shared/content.mjs').Draft | null; error: string; entry_id: string | null; created_at: string; updated_at: string;
};
export type Pick = { id?: number; url: string; title: string; author: string; note: string; date: string };
