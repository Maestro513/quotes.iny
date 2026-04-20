import { createReadStream } from "fs";
import { createGunzip } from "zlib";
import path from "path";

// Per-partition cache — only loads the 2-digit prefix bucket the ZIP belongs to.
// Old impl loaded the full 81 MB zip_backend_plans.json.gz on first call and
// blew past Vercel's function memory. Partitioned buckets are ~1 MB parsed each
// so a single request never touches more than one.
const partitionCache = new Map<string, Map<string, Set<string>>>();

async function loadPartition(prefix: string): Promise<Map<string, Set<string>>> {
  if (partitionCache.has(prefix)) return partitionCache.get(prefix)!;

  const filePath = path.join(process.cwd(), "data", "zip_partitions", `${prefix}.json.gz`);
  const chunks: Buffer[] = [];

  try {
    await new Promise<void>((resolve, reject) => {
      createReadStream(filePath)
        .pipe(createGunzip())
        .on("data", (chunk: Buffer) => chunks.push(chunk))
        .on("end", resolve)
        .on("error", reject);
    });
  } catch {
    // Missing partition = no plans for that ZIP prefix
    const empty = new Map<string, Set<string>>();
    partitionCache.set(prefix, empty);
    return empty;
  }

  const raw: Record<string, string[]> = JSON.parse(
    Buffer.concat(chunks).toString("utf8")
  );

  const map = new Map(
    Object.entries(raw).map(([zip, plans]) => [zip, new Set(plans)])
  );
  partitionCache.set(prefix, map);
  return map;
}

/**
 * Returns the set of plan numbers available for a ZIP.
 * Plan numbers in the lookup are HXXXX-XXX format.
 * Some backend plan numbers may have an extra -XXX suffix — strip it before comparing.
 */
export async function getPlansForZip(zip: string): Promise<Set<string> | null> {
  if (!zip || zip.length < 5) return null;
  const prefix = zip.slice(0, 2);
  const map = await loadPartition(prefix);
  return map.get(zip) ?? null;
}

/** Normalise a backend plan number to HXXXX-XXX (strip trailing -XXX segment if present) */
export function normalizePlanNumber(planNumber: string): string {
  const parts = planNumber.split("-");
  if (parts.length >= 3) return `${parts[0]}-${parts[1]}`;
  return planNumber;
}
