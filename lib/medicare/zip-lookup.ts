import { createReadStream } from "fs";
import { createGunzip } from "zlib";
import path from "path";

// Cached in-memory map — loaded once per server process
let cache: Map<string, Set<string>> | null = null;

async function loadZipMap(): Promise<Map<string, Set<string>>> {
  if (cache) return cache;

  const filePath = path.join(process.cwd(), "data", "zip_backend_plans.json.gz");
  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    createReadStream(filePath)
      .pipe(createGunzip())
      .on("data", (chunk: Buffer) => chunks.push(chunk))
      .on("end", resolve)
      .on("error", reject);
  });

  const raw: Record<string, string[]> = JSON.parse(
    Buffer.concat(chunks).toString("utf8")
  );

  cache = new Map(
    Object.entries(raw).map(([zip, plans]) => [zip, new Set(plans)])
  );

  return cache;
}

/**
 * Returns the set of plan numbers available for a ZIP.
 * Plan numbers are in their original backend format (e.g. H0169-001-000 or H0028-007).
 */
export async function getPlansForZip(zip: string): Promise<Set<string> | null> {
  if (!zip || zip.length < 5) return null;
  const map = await loadZipMap();
  return map.get(zip) ?? null;
}

/** Normalise a backend plan number to HXXXX-XXX (strip trailing -XXX segment if present) */
export function normalizePlanNumber(planNumber: string): string {
  const parts = planNumber.split("-");
  if (parts.length >= 3) return `${parts[0]}-${parts[1]}`;
  return planNumber;
}
