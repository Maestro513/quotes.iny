import { createReadStream } from "fs";
import { createGunzip } from "zlib";
import path from "path";

// Cached in-memory map — loaded once per server process
let cache: Map<string, Record<string, unknown>> | null = null;

async function loadCmsBundle(): Promise<Map<string, Record<string, unknown>>> {
  if (cache) return cache;

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
}

/** Load a single CMS plan by plan number (e.g. H0016-001) */
export async function loadCmsPlan(planNumber: string): Promise<Record<string, unknown> | null> {
  const map = await loadCmsBundle();
  return map.get(planNumber) ?? null;
}
