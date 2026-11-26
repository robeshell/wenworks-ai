import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createContentRepository, importLegacyCatalog, openContentDb } from "./curator-db.mjs";
import { contentIssues } from "./curator-content-rules.mjs";
import { collectResourceLogo } from "./curator-logo.mjs";
import { collectResourceCover } from "./curator-cover.mjs";
import { createWorkspaceService } from "./curator-workspace-service.mjs";
import { exportContent } from "./curator-export.mjs";
import { ship, shipStatus } from "./curator-ship.mjs";
import { deletePiProjectConfig, loadPiGatewayConfig, publicPiProjectConfig, readPiProjectConfig, writePiProjectConfig } from "./curator-ai.mjs";

/**
 * The Curator's local API. Everything a person does goes through resource
 * workspaces (/workspaces, see curator-workspace-service.mjs); this file adds
 * the library listing, the AI connection settings, the build check and
 * shipping exported content to GitHub. It only listens on 127.0.0.1 and only
 * answers the Curator's own origin.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.CURATOR_PORT || 4317);
const HOST = process.env.CURATOR_HOST || "127.0.0.1";
const SITE_PORT = process.env.CURATOR_SITE_PORT || "3000";
const MAX_REQUEST_BYTES = 2 * 1024 * 1024;
const INGEST_BLOCKS = ["tool", "skill", "project", "site", "prompt"];
const allowedOrigins = new Set([
  `http://localhost:${SITE_PORT}`,
  `http://127.0.0.1:${SITE_PORT}`,
  ...(process.env.CURATOR_ALLOWED_ORIGIN || "").split(",").map((item) => item.trim()).filter(Boolean),
]);
const CURATOR_DIR = path.resolve(process.env.CURATOR_STATE_DIR || path.join(ROOT, ".curator"));
const CONTENT_DB_FILE = path.resolve(process.env.CURATOR_CONTENT_DB || path.join(CURATOR_DIR, "content.sqlite"));
const OUTPUT_ROOT = path.resolve(process.env.CURATOR_OUTPUT_ROOT || ROOT);
const NEXT_BIN = path.join(ROOT, "node_modules/next/dist/bin/next");

let contentRepository, workspaceService, storePromise;
async function contentStore() {
  if (contentRepository) return contentRepository;
  if (!storePromise) storePromise = (async () => {
    const exists = await fs.access(CONTENT_DB_FILE).then(() => true).catch(() => false);
    if (!exists) await importLegacyCatalog({ file: CONTENT_DB_FILE, dryRun: false });
    const db = await openContentDb({ file: CONTENT_DB_FILE });
    contentRepository = createContentRepository(db);
    workspaceService = createWorkspaceService(db, {
      exportContent: exportPublicContent,
      collectLogo: (options) => collectResourceLogo({ ...options, outputRoot: OUTPUT_ROOT }),
      collectCover: (options) => collectResourceCover({ ...options, outputRoot: OUTPUT_ROOT }),
    });
    // Workspaces opened from the library and never edited are not tasks;
    // close the week-old ones quietly instead of asking the user to.
    workspaceService.dismissIdle();
    return contentRepository;
  })().catch((error) => { storePromise = null; contentRepository = null; workspaceService = null; throw error; });
  return storePromise;
}
async function exportPublicContent() {
  return exportContent({ outputRoot: OUTPUT_ROOT, dbFile: CONTENT_DB_FILE, write: true });
}

function sendJson(response, status, payload, origin) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
  });
  response.end(JSON.stringify(payload));
}

function allowedOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return null;
  return allowedOrigins.has(origin) ? origin : false;
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_REQUEST_BYTES) throw new Error("请求内容过大");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw new Error("请求不是有效 JSON");
  }
}

function addModel(models, id, label, group) {
  const value = String(id || "").trim();
  if (!value) return;
  if (models.some((item) => item.id === value)) return;
  models.push({ id: value, label: String(label || value).trim() || value, ...(group ? { group } : {}) });
}

function gatewayError(status, detail, apiKey) {
  const safe = String(detail || "").replaceAll(apiKey, "[REDACTED]").slice(0, 500);
  return new Error(`网关请求失败（HTTP ${status}）${safe ? `：${safe}` : ""}`);
}

async function listGatewayModels({ strict = false, config } = {}) {
  const models = [];
  const piConfig = await loadPiGatewayConfig(config ? { config } : {}).catch(() => null);
  if (piConfig) {
    try {
      const base = piConfig.model.baseUrl;
      const key = piConfig.apiKey;
      const response = await fetch(`${base}${base.endsWith("/v1") ? "" : "/v1"}/models`, {
        signal: AbortSignal.timeout(8000),
        headers: {
          "x-api-key": key,
          Authorization: `Bearer ${key}`,
          "anthropic-version": "2023-06-01",
        },
      });
      if (response.ok) {
        const payload = await response.json();
        const list = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.models) ? payload.models : [];
        for (const item of list) {
          const id = String(item.id || item.name || item.slug || "").trim();
          if (!id) continue;
          addModel(models, id, item.display_name || item.name || id, "网关模型");
        }
      } else if (strict) {
        throw gatewayError(response.status, await response.text(), key);
      }
    } catch (error) {
      if (strict) throw error;
    }
  } else if (strict) {
    throw new Error("请先保存 AI 连接");
  }
  return models;
}

async function testGatewayConnection(config) {
  const piConfig = await loadPiGatewayConfig(config ? { config } : {});
  const base = piConfig.model.baseUrl;
  const key = piConfig.apiKey;
  const response = await fetch(`${base}${base.endsWith("/v1") ? "" : "/v1"}/messages`, {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      Authorization: `Bearer ${key}`,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: piConfig.model.id, max_tokens: 1, messages: [{ role: "user", content: "Reply with OK." }] }),
  });
  if (!response.ok) throw gatewayError(response.status, await response.text(), key);
  await response.arrayBuffer();
  return piConfig.model.id;
}

async function mergedPiConfig(input = {}) {
  const current = await readPiProjectConfig();
  return {
    ...current,
    ...input,
    apiKey: String(input.apiKey || "").trim() || current.apiKey,
  };
}

async function listAgents() {
  const models = await listGatewayModels();
  const piConfig = await loadPiGatewayConfig().catch(() => null);
  const tools = [
    {
      id: "pi",
      label: "AI 连接",
      available: Boolean(piConfig),
      defaultModelLabel: piConfig?.model.id || "",
      models,
    },
  ];
  return {
    tools,
    publicUrl: `http://localhost:${SITE_PORT}/`,
  };
}

let buildJob = { status: "idle", log: "", error: "", publicUrl: `http://localhost:${SITE_PORT}/` };
function appendBuildLog(chunk) {
  buildJob.log = `${buildJob.log}${chunk}`.slice(-8000);
}

async function touchBuildSources() {
  const now = new Date();
  await Promise.all([
    "lib/data.ts",
    "lib/public-content.ts",
    "data/tools.json",
    "data/site.json",
  ].map((file) => fs.utimes(path.join(ROOT, file), now, now).catch(() => undefined)));
}

function startBuildCheck() {
  if (buildJob.status === "running") {
    throw Object.assign(new Error("已有构建在进行"), { statusCode: 409 });
  }
  buildJob = {
    status: "running",
    log: "",
    error: "",
    publicUrl: `http://localhost:${SITE_PORT}/`,
  };
  const child = spawn(process.execPath, [NEXT_BIN, "build"], {
    cwd: ROOT,
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => appendBuildLog(chunk.toString()));
  child.stderr.on("data", (chunk) => appendBuildLog(chunk.toString()));
  child.on("error", (error) => {
    buildJob.status = "error";
    buildJob.error = error.message;
  });
  child.on("exit", async (code) => {
    if (code === 0) {
      await touchBuildSources();
      buildJob.status = "ok";
    } else {
      buildJob.status = "error";
      buildJob.error = buildJob.log.trim().slice(-400) || `构建失败（${code}）`;
    }
  });
  touchBuildSources().catch(() => undefined);
  return buildJob;
}

function shanghaiDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

async function listContentPage(searchParams) {
  const repository = await contentStore();
  const block = searchParams.get("block") || "all";
  const status = searchParams.get("status") || "all";
  const query = String(searchParams.get("query") || "").trim().toLowerCase();
  const issuesOnly = searchParams.get("issues") === "true";
  const sort = searchParams.get("sort") || "updated-desc";
  const pageSize = [6, 20, 50, 100].includes(Number(searchParams.get("pageSize"))) ? Number(searchParams.get("pageSize")) : 20;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  if (block !== "all" && !INGEST_BLOCKS.includes(block)) throw new Error("未知内容板块");
  if (status !== "all" && !["draft", "active", "archived"].includes(status)) throw new Error("未知内容状态");
  // Unfiltered stats so the dashboard never has to count a single page of
  // results and get the wrong total.
  const every = repository.list();
  const withIssuesAll = every.map((item) => ({ ...item, issueCount: contentIssues(item).length }));
  const counts = {
    all: every.length,
    tool: every.filter((item) => item.blockType === "tool").length,
    skill: every.filter((item) => item.blockType === "skill").length,
    project: every.filter((item) => item.blockType === "project").length,
    site: every.filter((item) => item.blockType === "site").length,
    prompt: every.filter((item) => item.blockType === "prompt").length,
    active: every.filter((item) => item.status === "active").length,
    archived: every.filter((item) => item.status === "archived").length,
    draft: every.filter((item) => item.status === "draft").length,
    issues: withIssuesAll.filter((item) => item.issueCount > 0).length,
    issueTotal: withIssuesAll.reduce((total, item) => total + item.issueCount, 0),
    blocks: Object.fromEntries(INGEST_BLOCKS.map((block) => {
      const inBlock = every.filter((item) => item.blockType === block);
      return [block, {
        total: inBlock.length,
        active: inBlock.filter((item) => item.status === "active").length,
        draft: inBlock.filter((item) => item.status === "draft").length,
      }];
    })),
  };
  let items = every;
  if (block !== "all") items = items.filter((item) => item.blockType === block);
  if (status !== "all") items = items.filter((item) => item.status === status);
  if (query) items = items.filter((item) => `${item.title} ${item.slug} ${item.sourceUrl || ""} ${item.payload?.summary?.zh || ""} ${item.payload?.summary?.en || ""}`.toLowerCase().includes(query));
  const withIssues = items.map((item) => { const issues = contentIssues(item); return { ...item, issues, issueCount: issues.length }; });
  items = issuesOnly ? withIssues.filter((item) => item.issueCount > 0) : withIssues;
  items.sort((a, b) => sort === "title-asc" ? a.title.localeCompare(b.title) : sort === "updated-asc" ? a.updatedAt.localeCompare(b.updatedAt) : b.updatedAt.localeCompare(a.updatedAt));
  const navigationIds = items.map((item) => item.id);
  if (searchParams.get("navigation") === "true") return { navigationIds };
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pages);
  return { items: items.slice((currentPage - 1) * pageSize, currentPage * pageSize), total, page: currentPage, pageSize, pages, counts, navigationIds };
}

async function updateContentBatch(ids, status) {
  await contentStore();
  const updated = workspaceService.store.batchStatus((ids || []).map(String), status);
  await workspaceService.exportPending();
  const failed = workspaceService.store.exportJobs().find((job) => job.status === "failed");
  return { updated, message: failed ? `已保存 ${updated} 条内容，公开文件更新失败：${failed.error}` : `已${status === "active" ? "更新公开目录" : "归档"} ${updated} 条内容`, exportFailed: Boolean(failed) };
}

const server = http.createServer(async (request, response) => {
  const origin = allowedOrigin(request);
  if (origin === false) return sendJson(response, 403, { error: "当前页面来源不允许访问本地整理服务" });
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "600",
    });
    return response.end();
  }
  try {
    const url = new URL(request.url || "/", `http://127.0.0.1:${PORT}`);
    if (url.pathname.startsWith("/workspaces")) {
      await contentStore();
      if (await workspaceService.handle(request, response, url, { readJson, sendJson, origin })) return;
    }
    if (request.method === "GET" && url.pathname === "/health") {
      const agents = await listAgents();
      return sendJson(response, 200, { ok: true, ...agents, build: buildJob }, origin);
    }
    if (request.method === "GET" && url.pathname === "/agents") {
      return sendJson(response, 200, await listAgents(), origin);
    }
    if (request.method === "GET" && url.pathname === "/pi-config") {
      return sendJson(response, 200, publicPiProjectConfig(await readPiProjectConfig()), origin);
    }
    if (request.method === "PUT" && url.pathname === "/pi-config") {
      const saved = await writePiProjectConfig(await readJson(request));
      return sendJson(response, 200, {
        ...publicPiProjectConfig(saved),
        message: "AI 连接已保存在当前项目",
        agents: await listAgents(),
      }, origin);
    }
    if (request.method === "DELETE" && url.pathname === "/pi-config") {
      await deletePiProjectConfig();
      return sendJson(response, 200, {
        ...publicPiProjectConfig(),
        message: "已清除当前项目的 AI 连接",
        agents: await listAgents(),
      }, origin);
    }
    if (request.method === "POST" && url.pathname === "/pi-config/test") {
      const model = await testGatewayConnection(await mergedPiConfig(await readJson(request)));
      return sendJson(response, 200, { message: `连接成功，${model} 可以正常响应` }, origin);
    }
    if (request.method === "POST" && url.pathname === "/pi-config/models") {
      const models = await listGatewayModels({ strict: true, config: await mergedPiConfig(await readJson(request)) });
      return sendJson(response, 200, { message: `已读取 ${models.length} 个模型`, models }, origin);
    }
    if (request.method === "GET" && url.pathname === "/build") {
      return sendJson(response, 200, buildJob, origin);
    }
    if (request.method === "POST" && url.pathname === "/build") {
      return sendJson(response, 200, startBuildCheck(), origin);
    }
    if (request.method === "GET" && url.pathname === "/content") {
      return sendJson(response, 200, await listContentPage(url.searchParams), origin);
    }
    if (request.method === "PUT" && url.pathname === "/content/batch") {
      const body = await readJson(request);
      return sendJson(response, 200, await updateContentBatch(body.ids, body.status), origin);
    }
    if (request.method === "POST" && url.pathname === "/dashboard/fix") {
      await contentStore();
      const body = await readJson(request);
      const ids = Array.isArray(body.ids) ? body.ids.map(String).slice(0, 100) : [];
      if (!ids.length) throw new Error("没有要处理的资源");
      return sendJson(response, 202, workspaceService.autoFix(ids), origin);
    }
    if (request.method === "GET" && url.pathname === "/ship") {
      return sendJson(response, 200, await shipStatus({ root: OUTPUT_ROOT }), origin);
    }
    if (request.method === "POST" && url.pathname === "/ship") {
      await contentStore();
      const result = await ship({ root: OUTPUT_ROOT, today: shanghaiDate(), beforeCommit: () => workspaceService.exportPending() });
      return sendJson(response, 200, result, origin);
    }
    return sendJson(response, 404, { error: "接口不存在" }, origin);
  } catch (error) {
    const status = Number(error?.statusCode) || 400;
    return sendJson(response, status, {
      error: error instanceof Error ? error.message : "处理失败",
      ...(error?.code ? { code: error.code } : {}),
    }, origin || undefined);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Curator service: http://${HOST}:${PORT}`);
  console.log(`Allowed browser origins: ${[...allowedOrigins].join(", ")}`);
});
