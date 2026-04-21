#!/usr/bin/env node
/**
 * Partitions a ZIP → plan-numbers map into 100 gz files by 2-digit ZIP prefix.
 * Input:  the assembled map (from scripts/rebuild-zip-plans.py or similar)
 * Output: data/zip_partitions/{00..99}.json.gz
 *
 * Why partitioned: the flat 81 MB (uncompressed) map blew past Vercel's
 * serverless function memory when JSON.parse'd. With 100 buckets, any one
 * request only ever loads the one that matches the requested ZIP (~1 MB
 * parsed), so peak memory stays small and predictable regardless of
 * function tier or Vercel setting drift.
 *
 * Usage: node scripts/partition-zip-plans.js <input-path>
 *   where <input-path> is either:
 *     - a .json.gz of { zip: [plan, plan, ...] } (default:
 *       data/zip_backend_plans.json.gz if present)
 *     - a .json file of the same shape
 */

const fs = require("fs");
const path = require("path");
const { gzipSync, gunzipSync } = require("zlib");

const OUT_DIR = path.join(__dirname, "..", "data", "zip_partitions");
const DEFAULT_INPUT = path.join(__dirname, "..", "data", "zip_backend_plans.json.gz");

const input = process.argv[2] || DEFAULT_INPUT;
if (!fs.existsSync(input)) {
  console.error(`Input not found: ${input}`);
  process.exit(1);
}

let raw;
if (input.endsWith(".gz")) {
  raw = gunzipSync(fs.readFileSync(input)).toString("utf8");
} else {
  raw = fs.readFileSync(input, "utf8");
}

const data = JSON.parse(raw);
const buckets = {};
for (const [zip, plans] of Object.entries(data)) {
  const prefix = zip.slice(0, 2);
  (buckets[prefix] ??= {})[zip] = plans;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
// Purge any stale partitions
for (const f of fs.readdirSync(OUT_DIR)) fs.unlinkSync(path.join(OUT_DIR, f));

let totalCompressed = 0;
for (const [prefix, bucket] of Object.entries(buckets).sort()) {
  const serialized = JSON.stringify(bucket);
  const compressed = gzipSync(Buffer.from(serialized, "utf8"), { level: 9 });
  const outFile = path.join(OUT_DIR, `${prefix}.json.gz`);
  fs.writeFileSync(outFile, compressed);
  totalCompressed += compressed.length;
}

const partitionCount = Object.keys(buckets).length;
console.log(
  `Partitioned ${Object.keys(data).length.toLocaleString()} ZIPs into ${partitionCount} buckets ` +
    `(${(totalCompressed / 1024).toFixed(0)} KB total, ` +
    `${(totalCompressed / partitionCount / 1024).toFixed(0)} KB avg) -> ${OUT_DIR}`
);
