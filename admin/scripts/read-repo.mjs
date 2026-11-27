// Read the tools catalog out of the repository as admin entries.
import fs from 'node:fs';
import path from 'node:path';
import { ALIASES_FILE, KINDS, TAXONOMY_FILE, TOOLS_FILE, entryFromMarkdown, entryFromTool } from '../shared/content.mjs';

export function readRepo(root) {
  const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
  const entries = JSON.parse(read(TOOLS_FILE)).items.map((tool, i) => entryFromTool(tool, i));
  let order = entries.length;
  for (const kind of KINDS.filter((k) => k !== 'tool')) {
    const dir = path.join(root, 'sites/tools/content', `${kind}s`);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) entries.push(entryFromMarkdown(fs.readFileSync(path.join(dir, file), 'utf8'), order++));
  }
  const files = {};
  for (const file of [TOOLS_FILE, ALIASES_FILE]) files[file] = read(file);
  for (const kind of KINDS.filter((k) => k !== 'tool')) {
    const dir = path.join(root, 'sites/tools/content', `${kind}s`);
    if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) files[`sites/tools/content/${kind}s/${f}`] = read(`sites/tools/content/${kind}s/${f}`);
  }
  return { entries, aliases: JSON.parse(read(ALIASES_FILE)), taxonomy: read(TAXONOMY_FILE), files };
}
