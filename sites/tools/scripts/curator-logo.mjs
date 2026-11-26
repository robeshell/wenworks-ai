import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { assertUrlShape } from "./curator-content-rules.mjs";

const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map((m) => [m[1].toLowerCase(), (m[2] ?? m[3] ?? m[4]).replaceAll("&amp;", "&")]));
export function pageIconUrls(html, pageUrl) {
  const icons = [];
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const a = attrs(match[0]);
    if (!/(?:^|\s)(?:icon|apple-touch-icon|apple-touch-icon-precomposed)(?:\s|$)/i.test(a.rel || "") || !a.href) continue;
    try { const url = new URL(a.href, pageUrl).href; assertUrlShape(url); icons.push(url); } catch { /* Ignore unusable metadata. */ }
  }
  return [...new Set(icons)];
}
async function readBounded(response, max) {
  if (Number(response.headers.get("content-length")) > max) { await response.body?.cancel(); throw new Error("文件过大"); }
  const reader = response.body?.getReader(); if (!reader) throw new Error("空响应");
  const chunks = []; let size = 0;
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > max) throw new Error("文件过大"); chunks.push(Buffer.from(value)); } }
  finally { await reader.cancel(); }
  return Buffer.concat(chunks);
}
function imageExtension(bytes) {
  if (bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpg";
  if (["GIF87a", "GIF89a"].includes(bytes.subarray(0,6).toString())) return "gif";
  if (bytes.subarray(0,4).toString() === "RIFF" && bytes.subarray(8,12).toString() === "WEBP") return "webp";
  if (bytes.subarray(0,4).equals(Buffer.from([0,0,1,0]))) return "ico";
  // Do not persist active SVG documents under the app origin.
  const svg = bytes.toString("utf8");
  if (/<svg[\s>]/i.test(svg) && !/<(?:script|foreignObject|iframe|html|image|use|animate|set)\b|\bon\w+\s*=|(?:href|src)\s*=|<!ENTITY|<!DOCTYPE|url\s*\(|@import/i.test(svg)) return "svg";
  return null;
}
export async function collectResourceLogo({ pageUrl, logoUrl, outputRoot, signal, fetchFn = fetch }) {
  const deadline = AbortSignal.timeout(15_000);
  const boundedSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
  async function request(url) {
    for (let redirects = 0; redirects <= 4; redirects++) {
      assertUrlShape(url);
      const response = await fetchFn(url, { redirect: "manual", signal: AbortSignal.any([boundedSignal, AbortSignal.timeout(5000)]), headers: { "User-Agent": "Mozilla/5.0 Curator", Accept: "image/*,text/html;q=0.8,*/*;q=0.5" } });
      if ([301,302,303,307,308].includes(response.status)) { const target = response.headers.get("location"); await response.body?.cancel(); if (!target) throw new Error("重定向缺少地址"); url = new URL(target, url).href; continue; }
      if (!response.ok) { await response.body?.cancel(); throw new Error(`HTTP ${response.status}`); }
      return { response, url };
    }
    throw new Error("重定向过多");
  }
  const candidates = [];
  if (logoUrl && !logoUrl.startsWith("/")) { try { assertUrlShape(logoUrl); candidates.push(logoUrl); } catch {} }
  if (pageUrl) {
    assertUrlShape(pageUrl);
    try { const { response, url } = await request(pageUrl); const html = (await readBounded(response, 2_000_000)).toString("utf8"); candidates.push(...pageIconUrls(html, url)); } catch { signal?.throwIfAborted(); }
    candidates.push(new URL("/favicon.ico", pageUrl).href);
  }
  for (const candidate of [...new Set(candidates)].slice(0, 8)) {
    try {
      const { response, url } = await request(candidate);
      const bytes = await readBounded(response, 512_000), ext = imageExtension(bytes);
      if (!ext || bytes.length < 32) continue;
      boundedSignal.throwIfAborted();
      const filename = `resource-${createHash("sha256").update(bytes).digest("hex").slice(0,24)}.${ext}`;
      const dir = path.join(outputRoot, "public", "logos"); await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, filename), bytes, { flag: "wx" }).catch((error) => { if (error.code !== "EEXIST") throw error; });
      return { logo: `/logos/${filename}`, sourceUrl: url };
    } catch { signal?.throwIfAborted(); if (deadline.aborted) break; }
  }
  throw new Error("未找到可用图标，可在来源属性中重试采集或填写图标地址。");
}
