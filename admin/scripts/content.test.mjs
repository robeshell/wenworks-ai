import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { entryIssues, gitBlobSha, planPublish, publicFiles } from '../shared/content.mjs';
import { readRepo } from './read-repo.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('importing the repository and publishing it again changes no file', () => {
  const { entries, aliases, files } = readRepo(ROOT);
  assert.ok(entries.length > 20);
  const next = publicFiles(entries, aliases);
  assert.deepEqual(planPublish(next, files), []);
  assert.deepEqual(Object.keys(next).sort(), Object.keys(files).sort());
});

test('publishing reflects edits, drafts and archiving', () => {
  const { entries, aliases, files } = readRepo(ROOT);
  const project = entries.find((e) => e.kind === 'project');
  const tool = entries.find((e) => e.kind === 'tool');
  const edited = entries.map((e) => (e === project ? { ...e, status: 'archived' } : e === tool ? { ...e, title: `${e.title} 2` } : e));
  const changes = planPublish(publicFiles(edited, aliases), files);
  assert.deepEqual(changes.map((c) => [c.change, c.path]), [
    ['removed', `sites/tools/content/projects/${project.slug}.md`],
    ['modified', 'sites/tools/data/tools.json'],
  ]);
  const draft = { ...project, id: 'new-one', slug: 'new-one', status: 'draft' };
  assert.deepEqual(planPublish(publicFiles([...entries, draft], aliases), files), []);
  const live = planPublish(publicFiles([...entries, { ...draft, status: 'active' }], aliases), files);
  assert.deepEqual(live.map((c) => c.change + ' ' + c.path), ['added sites/tools/content/projects/new-one.md']);
});

test('the to-do list names what an entry is missing', () => {
  const codes = (e) => entryIssues(e).map((i) => i.code);
  assert.deepEqual(codes({ kind: 'tool', title: 'X', slug: 'x', category: 'chat', payload: { tagline: { zh: 'a', en: 'b' }, summary: { zh: 'a', en: 'b' }, url: 'https://x', cover: '/c.webp' } }), []);
  assert.deepEqual(codes({ kind: 'tool', title: 'X', slug: 'X Y', category: '', payload: {} }), ['slug', 'category', 'summary-zh', 'summary-en', 'tagline', 'url', 'cover']);
});

test('blob ids match git', async () => {
  assert.equal(await gitBlobSha('hello\n'), 'ce013625030ba8dba906f756967f9e9ca394464a');
});

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { entryFromDraft, normalizeDraft, picksFile } from '../shared/content.mjs';

test('picks.json matches what the home part has now, and keeps order and only filled fields', () => {
  assert.equal(picksFile([]), fs.readFileSync(path.join(ROOT, 'sites/home/data/picks.json'), 'utf8'));
  assert.equal(picksFile([{ id: 2, url: 'https://b', sort: 1 }, { id: 1, url: 'https://a', title: 'A', note: '', sort: 0 }]), '[\n  {\n    "url": "https://a",\n    "title": "A"\n  },\n  {\n    "url": "https://b"\n  }\n]\n');
});

test('blob ids of image bytes match git', async () => {
  const file = path.join(ROOT, 'sites/tools/public/og.png');
  const expected = execFileSync('git', ['hash-object', file], { encoding: 'utf8' }).trim();
  assert.equal(await gitBlobSha(new Uint8Array(fs.readFileSync(file))), expected);
});

test('a model draft is cleaned into an entry', () => {
  const d = normalizeDraft({ kind: 'open-source', name: 'Comfy UI!', slug: '', category: 'image', tags: ['free', 'free', ' cli '], verdict: { zh: '节点式生成', en: 'Node graphs' }, summary: { zh: '简介', en: 'Summary' }, body: '## 它是什么\n\n正文', links: [{ label: 'Repo', url: 'https://github.com/x/y', kind: 'repository' }, { url: 'javascript:alert(1)' }] }, 'https://github.com/x/y');
  assert.equal(d.kind, 'project');
  assert.equal(d.slug, 'comfy-ui');
  assert.deepEqual(d.tags, ['free', 'cli']);
  assert.equal(d.links.length, 1);
  const e = entryFromDraft(d);
  assert.equal(e.status, 'draft');
  assert.equal(e.sourceUrl, 'https://github.com/x/y');
  assert.equal(e.payload.body.zh, '## 它是什么\n\n正文');
  assert.equal(entryFromDraft(normalizeDraft({ kind: 'tool', name: 'X', url: 'https://x.dev' }, 'https://x.dev')).payload.url, 'https://x.dev');
});
