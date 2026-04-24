import { createReadStream } from "fs";
import { createGunzip } from "zlib";
import path from "path";
import { normalizePlanNumber } from "./zip-lookup";

// Cached in-memory map — loaded once per server process.
// `loadingPromise` guards against a cache stampede: when N concurrent
// requests hit a cold serverless instance, only one parses the 5MB
// gzipped bundle; the rest await the same promise.
let cache: Map<string, Record<string, unknown>> | null = null;
let loadingPromise: Promise<Map<string, Record<string, unknown>>> | null = null;

async function loadCmsBundle(): Promise<Map<string, Record<string, unknown>>> {
  if (cache) return cache;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const filePath = path.join(process.cwd(), "data", "extracted_cms.json.gz");
    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      createReadStream(filePath)
        .pipe(createGunzip())
        .on("data", (chunk: Buffer) => chunks.push(chunk))
        .on("end", resolve)
        .on("error", reject);
    });

    const raw: Record<string, Record<string, unknown>> = JSON.parse(
      Buffer.concat(chunks).toString("utf8")
    );

    cache = new Map(Object.entries(raw));
    return cache;
  })();

  try {
    return await loadingPromise;
  } finally {
    // Clear on failure so the next call can retry; leave in place on
    // success because `cache` is set (fast path handles it next time).
    if (!cache) loadingPromise = null;
  }
}

/**
 * Load a single CMS plan by plan number.
 * Tries the raw key first (e.g. "H0016-001"), then falls back to the
 * normalized form (strips trailing -XXX segment, e.g. "H1889-002-002" → "H1889-002").
 */
export async function loadCmsPlan(planNumber: string): Promise<Record<string, unknown> | null> {
  const map = await loadCmsBundle();
  const direct = map.get(planNumber);
  if (direct) return direct;

  const normalized = normalizePlanNumber(planNumber);
  if (normalized !== planNumber) {
    return map.get(normalized) ?? null;
  }
  return null;
}
