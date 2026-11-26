import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { collectResourceLogo, pageIconUrls } from "./curator-logo.mjs";
import { workingDraftFromLegacy } from "./curator-workspace-data.mjs";
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6e8sAAAAASUVORK5CYII=', 'base64');
test("discovers only page icons, resolves paths and rejects local targets", () => {
  assert.deepEqual(pageIconUrls('<link rel="shortcut icon" href="/icon.png?a=1&amp;b=2"><link href="touch.png" rel="apple-touch-icon"><link rel="icon" href="http://127.0.0.1/x"><link rel="stylesheet" href="app.css">', 'https://example.com/docs/'), ['https://example.com/icon.png?a=1&b=2','https://example.com/docs/touch.png']);
});
test("freezes a verified icon without overwriting existing files; bogus images fall back", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(),'curator-logo-'));
  const calls = [];
  const fetchFn = async (url) => { calls.push(url); if (url === 'https://example.com/') return new Response('<link rel="icon" href="/icon.png">'); if (url.endsWith('bad.png')) return new Response('<html>login page</html>'); return new Response(png); };
  try {
    const args = { pageUrl:'https://example.com/', logoUrl:'https://example.com/bad.png',outputRoot:root,fetchFn };
    const icon = await collectResourceLogo(args); assert.equal(icon.sourceUrl,'https://example.com/icon.png');
    assert.deepEqual(await readFile(path.join(root,'public',icon.logo)),png);
    assert.equal((await collectResourceLogo(args)).logo, icon.logo);
    assert.ok(calls.includes('https://example.com/bad.png'));
  } finally { await rm(root,{recursive:true,force:true}); }
});
test("rejects active SVG and redirects to private addresses", async () => {
  const calls=[];
  await assert.rejects(collectResourceLogo({pageUrl:'https://example.com',outputRoot:'/unused',fetchFn:async url=> { calls.push(url); return url.endsWith('favicon.ico') ? new Response('<svg onload="alert(1)"><path d="M0 0"/></svg>') : new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}}); }}),/未找到可用图标/);
  assert.ok(!calls.some(url=>url.includes('127.0.0.1')));
});
test("reads model logoUrl and preserves existing logo when absent", () => {
 const current={id:'test',blockType:'tool',payload:{logo:'/logos/existing.png'}};
 assert.equal(workingDraftFromLegacy({blockType:'tool',logoUrl:'https://example.com/icon.png'},current).payload.logo,'https://example.com/icon.png');
 assert.equal(workingDraftFromLegacy({blockType:'tool'},current).payload.logo,'/logos/existing.png');
});
