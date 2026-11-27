// Publishing: compare the public files with the repository and commit what changed.
import type { Change } from '../shared/content.mjs';
import { isOwnedFile } from '../shared/content.mjs';
import type { Env } from './env';

export async function gh<T>(env: Env, path: string, init: RequestInit = {}): Promise<T> {
  if (!env.GITHUB_TOKEN) throw new HttpError(503, '还没有配置 GitHub 令牌（GITHUB_TOKEN），暂时不能发布。');
  const res = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'wenworks-admin',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
    },
  });
  if (!res.ok) throw new HttpError(502, `GitHub 返回 ${res.status}：${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** The branch head, and the blob ids of the files the admin owns and of the images under sites/tools/public/. */
export async function repoState(env: Env): Promise<{ head: string; tree: string; files: Record<string, string>; images: Record<string, string> }> {
  const ref = await gh<{ object: { sha: string } }>(env, `/git/ref/heads/${env.GITHUB_BRANCH}`);
  const commit = await gh<{ tree: { sha: string } }>(env, `/git/commits/${ref.object.sha}`);
  const tree = await gh<{ tree: { path: string; sha: string; type: string }[]; truncated: boolean }>(env, `/git/trees/${commit.tree.sha}?recursive=1`);
  if (tree.truncated) throw new HttpError(502, '仓库文件太多，GitHub 没有返回完整列表。');
  const files: Record<string, string> = {};
  const images: Record<string, string> = {};
  for (const item of tree.tree) {
    if (item.type !== 'blob') continue;
    if (isOwnedFile(item.path)) files[item.path] = item.sha;
    else if (/^sites\/tools\/public\/(covers|logos)\//.test(item.path)) images[item.path] = item.sha;
  }
  return { head: ref.object.sha, tree: commit.tree.sha, files, images };
}

/** One commit with all the changes, on top of `head`. Fails rather than overwrite a newer branch. */
export async function commitChanges(env: Env, head: string, baseTree: string, changes: Change[], message: string): Promise<string> {
  // Text goes inline in the tree; images are uploaded as blobs first.
  const entries = [];
  for (const c of changes) {
    if (c.change === 'removed') entries.push({ path: c.path, mode: '100644', type: 'blob', sha: null });
    else if (typeof c.content === 'string') entries.push({ path: c.path, mode: '100644', type: 'blob', content: c.content });
    else {
      const blob = await gh<{ sha: string }>(env, '/git/blobs', { method: 'POST', body: JSON.stringify({ content: toBase64(c.content!), encoding: 'base64' }) });
      entries.push({ path: c.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
  }
  const tree = await gh<{ sha: string }>(env, '/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: baseTree, tree: entries }) });
  const commit = await gh<{ sha: string }>(env, '/git/commits', { method: 'POST', body: JSON.stringify({ message, tree: tree.sha, parents: [head] }) });
  // force: false — if the branch moved since we read it, GitHub refuses and nothing is lost.
  await gh(env, `/git/refs/heads/${env.GITHUB_BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false }) });
  return commit.sha;
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
