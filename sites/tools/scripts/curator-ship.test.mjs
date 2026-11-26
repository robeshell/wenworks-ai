import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ship, shipStatus } from "./curator-ship.mjs";

const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

async function fixture(fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "curator-ship-"));
  const remote = path.join(dir, "remote.git"), root = path.join(dir, "work");
  try {
    git(dir, "init", "--bare", "-b", "main", remote);
    git(dir, "clone", remote, root);
    git(root, "config", "user.email", "test@example.com");
    git(root, "config", "user.name", "Test");
    await mkdir(path.join(root, "data"), { recursive: true });
    await mkdir(path.join(root, "content", "sites"), { recursive: true });
    await writeFile(path.join(root, "data", "site.json"), `${JSON.stringify({ updatedAt: "2026-09-01" }, null, 2)}\n`);
    await writeFile(path.join(root, "app.ts"), "export {};\n");
    git(root, "add", "-A"); git(root, "commit", "-m", "init"); git(root, "push", "origin", "HEAD:main");
    await fn({ dir, remote, root });
  } finally { await rm(dir, { recursive: true, force: true }); }
}
const site = (title) => `---\n${JSON.stringify({ id: title, title, status: "active" })}\n---\n\n正文\n`;

test("ships only the exported public files, bumps the date and pushes", async () => fixture(async ({ root, remote }) => {
  await writeFile(path.join(root, "content", "sites", "a.md"), site("Alpha"));
  await mkdir(path.join(root, "public", "covers"), { recursive: true });
  await writeFile(path.join(root, "public", "covers", "a.webp"), "img");
  await writeFile(path.join(root, "app.ts"), "export const changed = true;\n");
  const status = await shipStatus({ root });
  assert.deepEqual(status.titles, ["Alpha"]);
  assert.equal(status.images, 1);
  const result = await ship({ root, today: "2026-09-28" });
  assert.deepEqual(result.titles, ["Alpha"]);
  assert.match(git(remote, "log", "-1", "--format=%s", "main"), /上线 1 条内容改动/);
  const shipped = git(remote, "show", "--name-only", "--format=", "main").split("\n").sort();
  assert.deepEqual(shipped, ["content/sites/a.md", "data/site.json", "public/covers/a.webp"]);
  assert.equal(JSON.parse(await readFile(path.join(root, "data", "site.json"), "utf8")).updatedAt, "2026-09-28");
  assert.match(git(root, "status", "--porcelain"), /app\.ts/, "code changes are left for a normal commit");
}));

test("refuses off main, when behind the remote, and when there is nothing to ship", async () => fixture(async ({ dir, remote, root }) => {
  await assert.rejects(ship({ root, today: "2026-09-28" }), { code: "nothing-to-ship" });

  const other = path.join(dir, "other");
  git(dir, "clone", remote, other);
  git(other, "config", "user.email", "o@example.com"); git(other, "config", "user.name", "O");
  await writeFile(path.join(other, "README.md"), "x\n");
  git(other, "add", "-A"); git(other, "commit", "-m", "remote change"); git(other, "push", "origin", "HEAD:main");
  await writeFile(path.join(root, "content", "sites", "b.md"), site("Beta"));
  await assert.rejects(ship({ root, today: "2026-09-28" }), { code: "behind-remote" });
  assert.equal(git(root, "log", "-1", "--format=%s"), "init", "nothing was committed");

  git(root, "checkout", "-b", "feature");
  await assert.rejects(ship({ root, today: "2026-09-28" }), { code: "wrong-branch" });
}));
