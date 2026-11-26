import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, rm, stat, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { assertUrlShape } from "./curator-content-rules.mjs";

const run = promisify(execFile);

/** Cover images are what make the public board read as a gallery rather than
 *  a list. The official page is screenshotted in headless Chrome; GitHub repos
 *  use their social card instead, since a screenshot of GitHub's chrome says
 *  nothing about the project. Either way the result is a local webp under
 *  public/covers/, named by item id plus a content hash so a recapture busts
 *  caches and leaves no stale file behind. */

const CHROME_CANDIDATES = [
  process.env.CURATOR_CHROME,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

const CWEBP_CANDIDATES = [process.env.CURATOR_CWEBP, "/opt/homebrew/bin/cwebp", "/usr/local/bin/cwebp", "/usr/bin/cwebp"].filter(Boolean);

const VIEWPORT = { width: 1440, height: 900 };
// Keep a 16:9 frame from the top of the page: close to the 2:1 social cards
// GitHub serves, so both kinds of cover crop alike in one grid.
const CROP = { width: 1440, height: 810 };
// Shoot well below the crop so banners fixed to the bottom of the viewport
// (cookie consent, chat bubbles) fall outside the frame that is kept.
const SHOT_HEIGHT = VIEWPORT.height + 320;
// A plain desktop Chrome; "HeadlessChrome" in the UA trips bot walls.
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const OUTPUT_WIDTH = 1200;
// A 1440×900 PNG this small is a blank or near-blank page.
const MIN_SCREENSHOT_BYTES = 20_000;

export function findChrome() {
  return CHROME_CANDIDATES.find((file) => existsSync(file)) || null;
}

function findCwebp() {
  return CWEBP_CANDIDATES.find((file) => existsSync(file)) || null;
}

export function isGithubRepo(url) {
  try {
    const { hostname, pathname } = new URL(url);
    return hostname === "github.com" && pathname.split("/").filter(Boolean).length >= 2;
  } catch {
    return false;
  }
}

const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
  .map((m) => [m[1].toLowerCase(), (m[2] ?? m[3] ?? m[4]).replaceAll("&amp;", "&")]));

export function pageImageUrl(html, pageUrl) {
  const wanted = ["og:image", "og:image:url", "twitter:image", "twitter:image:src"];
  const found = new Map();
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrs(match[0]);
    const key = (a.property || a.name || "").toLowerCase();
    if (wanted.includes(key) && a.content && !found.has(key)) found.set(key, a.content);
  }
  for (const key of wanted) {
    if (!found.has(key)) continue;
    try {
      const url = new URL(found.get(key), pageUrl).href;
      assertUrlShape(url);
      return url;
    } catch { /* Try the next tag. */ }
  }
  return null;
}

async function fetchBounded(url, { max, accept, signal, fetchFn }) {
  for (let redirects = 0; redirects <= 4; redirects++) {
    assertUrlShape(url);
    const response = await fetchFn(url, {
      redirect: "manual",
      signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36", Accept: accept },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const target = response.headers.get("location");
      await response.body?.cancel();
      if (!target) throw new Error("重定向缺少地址");
      url = new URL(target, url).href;
      continue;
    }
    if (!response.ok) { await response.body?.cancel(); throw new Error(`HTTP ${response.status}`); }
    if (Number(response.headers.get("content-length")) > max) { await response.body?.cancel(); throw new Error("文件过大"); }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > max) throw new Error("文件过大");
    return { bytes, url };
  }
  throw new Error("重定向过多");
}

function rasterExtension(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpg";
  if (bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP") return "webp";
  return null;
}

/** Headless Chrome writes the screenshot and then may linger (it spawns the
 *  updater, keeps the profile open). Watch for the file instead of waiting for
 *  the process: once its size is stable, the capture is done and Chrome can go. */
function runChrome(chrome, args, { file, timeout, signal }) {
  return new Promise((resolve, reject) => {
    const child = spawn(chrome, args, { stdio: "ignore" });
    let lastSize = -1;
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearInterval(poll);
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      child.kill("SIGKILL");
      if (error) reject(error); else resolve();
    };
    const poll = setInterval(async () => {
      const info = await stat(file).catch(() => null);
      if (info && info.size > 0 && info.size === lastSize) finish();
      lastSize = info?.size ?? -1;
    }, 400);
    const timer = setTimeout(() => finish(new Error("截图超时")), timeout);
    const abort = () => finish(signal.reason);
    signal?.addEventListener("abort", abort, { once: true });
    child.once("error", (error) => finish(error));
    child.once("exit", () => setTimeout(() => finish(lastSize > 0 ? undefined : new Error("Chrome 未生成截图")), 500));
  });
}

async function screenshot(pageUrl, workDir, { chrome, signal }) {
  const file = path.join(workDir, "shot.png");
  await runChrome(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--mute-audio",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-sync",
    "--no-service-autorun",
    // Never touch the login keychain; macOS would otherwise prompt for access.
    "--use-mock-keychain",
    "--password-store=basic",
    // A private profile keeps headless Chrome from attaching to the user's
    // running browser and from reading their cookies.
    `--user-data-dir=${path.join(workDir, "profile")}`,
    `--window-size=${VIEWPORT.width},${SHOT_HEIGHT}`,
    `--user-agent=${USER_AGENT}`,
    // Official pages in English read the same for both locales of the site.
    "--lang=en-US",
    "--accept-lang=en-US,en",
    "--force-device-scale-factor=1",
    "--virtual-time-budget=8000",
    `--screenshot=${file}`,
    pageUrl,
  ], { file, timeout: 40_000, signal });
  const info = await stat(file).catch(() => null);
  if (!info || info.size < MIN_SCREENSHOT_BYTES) throw new Error("截图为空白页");
  return file;
}

async function toWebp(input, output, { crop } = {}) {
  const cwebp = findCwebp();
  if (!cwebp) throw new Error("缺少 cwebp，无法压缩封面图（brew install webp）");
  const cropArgs = crop ? ["-crop", "0", "0", String(crop.width), String(crop.height)] : [];
  await run(cwebp, ["-quiet", ...cropArgs, "-resize", String(OUTPUT_WIDTH), "0", "-q", "80", "-m", "6", input, "-o", output], { timeout: 30_000 });
}

async function persist(webpFile, { id, outputRoot }) {
  const bytes = await readFile(webpFile);
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 10);
  const dir = path.join(outputRoot, "public", "covers");
  await mkdir(dir, { recursive: true });
  const safeId = String(id).replace(/[^a-zA-Z0-9_-]/g, "-");
  const filename = `${safeId}-${hash}.webp`;
  await writeFile(path.join(dir, filename), bytes);
  // Drop earlier captures of the same item so public/ does not accumulate them.
  for (const name of await readdir(dir)) {
    if (name !== filename && name.startsWith(`${safeId}-`) && /^[0-9a-f]{10}\.webp$/.test(name.slice(safeId.length + 1))) {
      await unlink(path.join(dir, name)).catch(() => {});
    }
  }
  return `/covers/${filename}`;
}

/**
 * @returns {Promise<{ cover: string, method: "screenshot" | "og-image" }>}
 */
export async function collectResourceCover({ pageUrl, id, outputRoot, signal, fetchFn = fetch, prefer }) {
  assertUrlShape(pageUrl);
  const bounded = signal ? AbortSignal.any([signal, AbortSignal.timeout(90_000)]) : AbortSignal.timeout(90_000);
  const chrome = findChrome();
  const order = prefer ? [prefer] : isGithubRepo(pageUrl) ? ["og-image"] : ["screenshot", "og-image"];
  const workDir = await mkdtemp(path.join(os.tmpdir(), "curator-cover-"));
  const failures = [];
  try {
    for (const method of order) {
      try {
        let source;
        if (method === "screenshot") {
          if (!chrome) throw new Error("未找到 Chrome，可设置 CURATOR_CHROME");
          source = await screenshot(pageUrl, workDir, { chrome, signal: bounded });
        } else {
          const { bytes: html, url } = await fetchBounded(pageUrl, { max: 3_000_000, accept: "text/html,*/*;q=0.5", signal: bounded, fetchFn });
          const imageUrl = pageImageUrl(html.toString("utf8"), url);
          if (!imageUrl) throw new Error("页面没有 og:image");
          const { bytes } = await fetchBounded(imageUrl, { max: 8_000_000, accept: "image/*", signal: bounded, fetchFn });
          const ext = rasterExtension(bytes);
          if (!ext) throw new Error("og:image 不是可用的图片");
          source = path.join(workDir, `og.${ext}`);
          await writeFile(source, bytes);
        }
        const webp = path.join(workDir, "cover.webp");
        await toWebp(source, webp, method === "screenshot" ? { crop: CROP } : {});
        return { cover: await persist(webp, { id, outputRoot }), method };
      } catch (error) {
        bounded.throwIfAborted();
        failures.push(`${method === "screenshot" ? "截图" : "og:image"}：${error.message}`);
      }
    }
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
  throw new Error(`未能采集封面图（${failures.join("；")}）`);
}
