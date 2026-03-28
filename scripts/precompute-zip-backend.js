/**
 * Pre-computes ZIP → backend plans intersection.
 *
 * Reads zip_plans.json.gz (516 MB decompressed — too large to stringify),
 * scans the raw buffer byte-by-byte for ZIP entries,
 * filters each ZIP's plans to only those in data/backend_plans.json,
 * writes the compact result to data/zip_backend_plans.json.gz.
 *
 * Run once: node scripts/precompute-zip-backend.js
 */

const { createReadStream, createWriteStream } = require("fs");
const { createGunzip, createGzip } = require("zlib");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const IN_FILE = path.join(DATA_DIR, "zip_plans.json.gz");
const OUT_FILE = path.join(DATA_DIR, "zip_backend_plans.json.gz");
const BACKEND_FILE = path.join(DATA_DIR, "backend_plans.json");

// ASCII byte constants
const QUOTE = 0x22; // "
const COLON = 0x3a; // :
const COMMA = 0x2c; // ,
const LBRACKET = 0x5b; // [
const RBRACKET = 0x5d; // ]
const LBRACE = 0x7b; // {
const RBRACE = 0x7d; // }

function normalizePlan(pn) {
  const parts = pn.split("-");
  if (parts.length >= 3) return `${parts[0]}-${parts[1]}`;
  return pn;
}

async function main() {
  console.log("Loading backend plan numbers...");
  const backendRaw = require(BACKEND_FILE);

  // Build normalized → [original plan numbers] map so we can match by
  // the 2-segment key but store the ORIGINAL plan numbers that the
  // Concierge API actually recognises.
  const normToOriginals = new Map();
  for (const plan of backendRaw) {
    const norm = normalizePlan(plan);
    if (!normToOriginals.has(norm)) normToOriginals.set(norm, []);
    normToOriginals.get(norm).push(plan);
  }
  console.log(`Backend plans: ${normToOriginals.size} (normalized groups)`);

  console.log("Decompressing zip_plans.json.gz (516 MB)...");
  const chunks = [];
  let totalBytes = 0;

  await new Promise((resolve, reject) => {
    createReadStream(IN_FILE)
      .pipe(createGunzip())
      .on("data", (chunk) => {
        chunks.push(chunk);
        totalBytes += chunk.length;
        if (totalBytes % (50 * 1024 * 1024) < chunk.length) {
          process.stdout.write(`  ${(totalBytes / 1024 / 1024).toFixed(0)} MB read...\r`);
        }
      })
      .on("end", resolve)
      .on("error", reject);
  });

  const buf = Buffer.concat(chunks);
  console.log(`\nDecompressed: ${(buf.length / 1024 / 1024).toFixed(1)} MB`);
  console.log("Scanning buffer for ZIP entries...");

  // Parse the buffer byte-by-byte without converting to string
  const result = {};
  let pos = 0;
  let zipsProcessed = 0;
  let zipsMatched = 0;

  // Skip opening '{'
  while (pos < buf.length && buf[pos] !== LBRACE) pos++;
  pos++;

  while (pos < buf.length) {
    // Skip whitespace and commas
    while (pos < buf.length && (buf[pos] === COMMA || buf[pos] === 0x20 || buf[pos] === 0x0a || buf[pos] === 0x0d || buf[pos] === 0x09)) pos++;

    if (pos >= buf.length || buf[pos] === RBRACE) break;

    // Read ZIP key (expect opening '"')
    if (buf[pos] !== QUOTE) { pos++; continue; }
    pos++;
    const keyStart = pos;
    while (pos < buf.length && buf[pos] !== QUOTE) pos++;
    const zip = buf.slice(keyStart, pos).toString("ascii");
    pos++; // skip closing '"'

    // Skip ':' and whitespace
    while (pos < buf.length && (buf[pos] === COLON || buf[pos] === 0x20)) pos++;

    // Read array '['
    if (pos >= buf.length || buf[pos] !== LBRACKET) continue;
    pos++; // skip '['

    const plans = [];
    while (pos < buf.length && buf[pos] !== RBRACKET) {
      if (buf[pos] === QUOTE) {
        pos++;
        const planStart = pos;
        while (pos < buf.length && buf[pos] !== QUOTE) pos++;
        const plan = buf.slice(planStart, pos).toString("ascii");
        pos++; // skip closing '"'
        const normalized = normalizePlan(plan);
        if (normToOriginals.has(normalized)) {
          // Store the ORIGINAL backend plan numbers so the Concierge
          // API receives the exact IDs it expects (e.g. H0169-001-000
          // instead of the truncated H0169-001).
          for (const orig of normToOriginals.get(normalized)) {
            plans.push(orig);
          }
        }
      } else {
        pos++;
      }
    }
    pos++; // skip ']'

    zipsProcessed++;
    if (plans.length > 0) {
      result[zip] = [...new Set(plans)]; // dedupe
      zipsMatched++;
    }

    if (zipsProcessed % 5000 === 0) {
      process.stdout.write(`  ${zipsProcessed} ZIPs processed, ${zipsMatched} matched...\r`);
    }
  }

  console.log(`\nZIPs processed: ${zipsProcessed}, with backend plans: ${zipsMatched}`);

  console.log("Writing zip_backend_plans.json.gz...");
  const json = JSON.stringify(result);
  console.log(`Output JSON size: ${(json.length / 1024).toFixed(1)} KB`);

  await new Promise((resolve, reject) => {
    const gz = createGzip({ level: 9 });
    const out = createWriteStream(OUT_FILE);
    gz.pipe(out);
    out.on("finish", resolve);
    out.on("error", reject);
    gz.write(json);
    gz.end();
  });

  const { statSync } = require("fs");
  const size = statSync(OUT_FILE).size;
  console.log(`Done! zip_backend_plans.json.gz: ${(size / 1024).toFixed(1)} KB`);
}

main().catch(console.error);
