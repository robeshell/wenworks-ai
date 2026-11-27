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
