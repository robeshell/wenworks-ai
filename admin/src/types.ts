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
export type Status_ = { repo: string; branch: string; site: string; githubToken: boolean; access: boolean; dev: boolean };
export type Overview = {
  counts: Record<Kind, Record<Status, number>>;
  total: number;
  todo: EntrySummary[];
  recent: EntrySummary[];
  lastPublish: { published_at: string; published_by: string; commit_sha: string; message: string } | null;
  editedSinceLastPublish: number;
  publishReady: boolean;
};
