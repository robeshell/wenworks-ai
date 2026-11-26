import { execFile } from "node:child_process";
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

/** Only the files the export writes are ever shipped from the Curator. Code
 *  changes go through a normal commit, never through this button. */
export const SHIP_PATHS = ["data", "content", "public/covers", "public/logos"];

async function git(root, args, { timeout = 20_000 } = {}) {
  const { stdout } = await run("git", args, { cwd: root, timeout, maxBuffer: 4 * 1024 * 1024 });
  return stdout.trim();
}

function shipError(message, code) {
  return Object.assign(new Error(message), { code, statusCode: 409 });
}

async function changedFiles(root) {
  const status = await git(root, ["status", "--porcelain=v1", "--untracked-files=all", "--", ...SHIP_PATHS]);
  return status.split("\n").filter(Boolean).map((line) => line.slice(3).replace(/^"|"$/g, ""));
}

async function titleOf(root, file) {
  if (!/^content\/.+\.md$/.test(file)) return null;
  try {
    const raw = await fs.readFile(path.join(root, file), "utf8");
    return JSON.parse(raw.split(/^---$/m)[1]).title || null;
  } catch { return null; }
}

/** Human summary of what would go live: resource titles, plus counts of the
 *  lists and images that change alongside them. */
async function describe(root, files) {
  const titles = [];
  let images = 0;
  let lists = 0;
  for (const file of files) {
    if (file.startsWith("public/")) { images += 1; continue; }
    const title = await titleOf(root, file);
    if (title) titles.push(title);
    else lists += 1;
  }
  return { titles, images, lists };
}

/** Cloudflare Workers Builds deploys every push to main; this opens its
 *  deployment list for the site's Worker (named in wrangler.jsonc). */
export const DEPLOY_URL = "https://github.com/robeshell/wenworks-ai/actions/workflows/deploy.yml";

/** What the 上线 button would ship, without touching anything. */
export async function shipStatus({ root }) {
  const files = await changedFiles(root);
  const last = await git(root, ["log", "-1", "--format=%cI", "--", "data", "content"]).catch(() => "");
  return { changed: files.length, files: files.slice(0, 100), ...(await describe(root, files)), lastPublishedAt: last };
}

/**
 * Commit the exported public files and push them to origin/main. Refuses
 * rather than guessing: off main, mid-merge, or behind the remote. Bumps the
 * public "last updated" date as part of the same commit.
 */
export async function ship({ root, today, remote = "origin", branch = "main", beforeCommit }) {
  const current = await git(root, ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (current !== branch) throw shipError(`当前在 ${current} 分支，上线只从 ${branch} 分支进行`, "wrong-branch");
  if (existsSync(path.join(root, ".git", "MERGE_HEAD")) || existsSync(path.join(root, ".git", "rebase-merge"))) {
    throw shipError("仓库正在合并或变基，请先在终端完成", "mid-merge");
  }
  await git(root, ["fetch", remote, branch], { timeout: 30_000 });
  const behind = Number(await git(root, ["rev-list", "--count", `HEAD..${remote}/${branch}`]));
  if (behind > 0) throw shipError(`远端有 ${behind} 个新提交，请先在终端同步后再上线`, "behind-remote");

  await beforeCommit?.();
  let files = await changedFiles(root);
  if (!files.length) throw shipError("没有要上线的内容改动", "nothing-to-ship");

  const siteFile = path.join(root, "data", "site.json");
  if (today && existsSync(siteFile)) {
    const site = JSON.parse(await fs.readFile(siteFile, "utf8"));
    if (site.updatedAt !== today) {
      site.updatedAt = today;
      await fs.writeFile(siteFile, `${JSON.stringify(site, null, 2)}\n`, "utf8");
      files = await changedFiles(root);
    }
  }

  const { titles, images, lists } = await describe(root, files);
  const subject = titles.length ? `content: 上线 ${titles.length} 条内容改动` : "content: 更新公开数据";
  const body = [
    ...titles.map((title) => `- ${title}`),
    ...(images ? [`- 图片 ${images} 张`] : []),
    ...(lists ? [`- 列表与站点数据 ${lists} 个文件`] : []),
  ].join("\n");

  // Commit exactly these paths; anything else staged in the tree stays out.
  const paths = SHIP_PATHS.filter((p) => existsSync(path.join(root, p)));
  await git(root, ["add", "-A", "--", ...paths]);
  await git(root, ["commit", "-m", subject, ...(body ? ["-m", body] : []), "--only", "--", ...paths]);
  const commit = await git(root, ["rev-parse", "--short", "HEAD"]);
  try {
    await git(root, ["push", remote, `HEAD:${branch}`], { timeout: 60_000 });
  } catch (error) {
    throw Object.assign(new Error(`已提交 ${commit}，但推送失败：${String(error.stderr || error.message).trim().split("\n").pop()}`), { code: "push-failed", statusCode: 502, commit });
  }
  return { commit, titles, images, lists, deployUrl: DEPLOY_URL };
}
