import { readFile } from "node:fs/promises";

// Artificial Analysis official Data API (free tier).
// Docs: https://artificialanalysis.ai/data-api/docs
// Free tier: 100 requests per 24h, attribution required (the site credits AA).
const API_URL = "https://artificialanalysis.ai/api/v2/language/models/free";
const MAX_PAGES = 50;

export function num(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fetchPage(page, apiKey) {
  const url = `${API_URL}?page=${page}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "x-api-key": apiKey },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Artificial Analysis API ${res.status} ${res.statusText} ${body.slice(0, 200)}`,
    );
  }
  return res.json();
}

// Map one API model to the camelCase shape the fetch scripts already use.
// Fields the free tier doesn't return come back as null; the scripts fill
// them from the previous snapshot where they can.
function toModel(raw) {
  const creator = raw?.model_creator ?? {};
  const evals = raw?.evaluations ?? {};
  const pricing = raw?.pricing ?? {};
  const name = raw?.name ?? raw?.slug ?? "";
  return {
    // Artificial Analysis keeps a model's id fixed for good, while its slug
    // moves to the newest version of that model. The id is the key to match
    // a model across runs; the slug is only for display and links.
    id: typeof raw?.id === "string" && raw.id ? raw.id : null,
    slug: raw?.slug ?? slugify(name),
    name,
    shortName: name,
    modelCreatorName: creator.name ?? "",
    modelCreatorSlug: creator.slug ?? slugify(creator.name),
    modelCreatorLogo: "",
    intelligenceIndex: num(evals.artificial_analysis_intelligence_index),
    codingIndex: num(evals.artificial_analysis_coding_index),
    agenticIndex: num(evals.artificial_analysis_agentic_index),
    price1mInputTokens: num(pricing.price_1m_input_tokens),
    price1mOutputTokens: num(pricing.price_1m_output_tokens),
    contextWindowTokens: num(raw?.context_window_tokens),
    releaseDate: raw?.release_date ?? null,
    deprecated: false,
  };
}

export async function fetchAaModels() {
  const apiKey = process.env.AA_API_KEY;
  if (!apiKey) {
    throw new Error(
      "AA_API_KEY is not set. Add it as a repository secret (Settings → Secrets and variables → Actions).",
    );
  }

  const models = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const payload = await fetchPage(page, apiKey);
    const data = Array.isArray(payload?.data) ? payload.data : [];
    models.push(...data.map(toModel));
    if (!payload?.pagination?.has_more || data.length === 0) break;
  }

  const missingId = models.filter((m) => !m.id).length;
  if (missingId > 0) {
    console.warn(
      `::warning::Artificial Analysis returned ${missingId} models without an id; they are matched by slug this run.`,
    );
  }

  const scored = models.filter((m) => typeof m.intelligenceIndex === "number");
  if (scored.length === 0) {
    throw new Error("Artificial Analysis API returned no models with an intelligence index");
  }
  return models;
}

// Items of the previous snapshot, so fields the free API doesn't return
// (context window, logos, single benchmarks) keep their last known values
// for models we already had.
export async function loadPrevious(file) {
  try {
    const snapshot = JSON.parse(await readFile(file, "utf8"));
    return Array.isArray(snapshot.items) ? snapshot.items : [];
  } catch {
    return [];
  }
}

// Returns a function that finds a model's entry in the previous snapshot.
// Entries are matched by the stable model id. Entries saved before ids were
// stored are matched by slug, or else by exact name, and only while the
// release date (or, without dates, the name) still agrees: after a slug moves
// to a new version, the new version must not inherit the old one's numbers.
export function previousMatcher(items, slugOf) {
  const byId = new Map();
  const bySlug = new Map();
  const byName = new Map();
  const anyBySlug = new Map();
  for (const item of items) {
    const anySlug = slugOf(item);
    if (anySlug && !anyBySlug.has(anySlug)) anyBySlug.set(anySlug, item);
    if (item.modelId) {
      if (!byId.has(item.modelId)) byId.set(item.modelId, item);
      continue;
    }
    const slug = slugOf(item);
    if (slug && !bySlug.has(slug)) bySlug.set(slug, item);
    if (item.name && !byName.has(item.name)) byName.set(item.name, item);
  }

  const sameVersion = (old, model) => {
    if (old.releaseDate && model.releaseDate) {
      return old.releaseDate === model.releaseDate;
    }
    return old.name === model.name;
  };

  return (model) => {
    // Only when the API left out a model's id: fall back to its slug.
    if (!model.id) return anyBySlug.get(model.slug) ?? null;
    if (byId.has(model.id)) return byId.get(model.id);
    for (const old of [bySlug.get(model.slug), byName.get(model.name)]) {
      if (old && sameVersion(old, model)) return old;
    }
    return null;
  };
}

// Logo file names by creator, taken from a previous snapshot.
export function logosByCreator(previousItems, creatorOf) {
  const map = new Map();
  for (const item of previousItems) {
    const creator = creatorOf(item);
    if (creator && item.creatorLogo && !map.has(creator)) {
      map.set(creator, item.creatorLogo);
    }
  }
  return map;
}

export function pick(...values) {
  for (const v of values) if (v !== null && v !== undefined && v !== "") return v;
  return null;
}

// Refuse to publish a snapshot that lost a big share of its models since the
// last run: that is almost always a broken source, not the market shrinking.
// Throwing keeps the previous JSON on disk, so the site and the share image
// stay on the last good data. Set ALLOW_SHRINK=1 to accept a real drop once.
export const SHRINK_LIMIT = 0.3;

export function assertNoShrink(label, previousCount, nextCount) {
  if (process.env.ALLOW_SHRINK === "1") return;
  if (!previousCount) return;
  if (nextCount >= previousCount * (1 - SHRINK_LIMIT)) return;
  throw new Error(
    `${label}: ${nextCount} models vs ${previousCount} last time (more than ${
      SHRINK_LIMIT * 100
    }% fewer). Keeping the previous data. Re-run with ALLOW_SHRINK=1 if the drop is real.`,
  );
}
