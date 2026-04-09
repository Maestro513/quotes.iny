#!/usr/bin/env node
/**
 * Bundles all data/extracted_cms/*.json into a single gzip'd file
 * keyed by plan number (HXXXX-XXX).
 *
 * Usage: node scripts/bundle-cms.js
 * Output: data/extracted_cms.json.gz
 */

const fs = require("fs");
const path = require("path");
const { gzipSync } = require("zlib");

const CMS_DIR = path.join(__dirname, "..", "data", "extracted_cms");
const OUT_FILE = path.join(__dirname, "..", "data", "extracted_cms.json.gz");

const files = fs.readdirSync(CMS_DIR).filter((f) => f.endsWith(".json"));
const bundle = {};

let count = 0;
for (const file of files) {
  const match = file.match(/([HRS]\d{4}-\d{3})\.json$/);
  if (!match) {
    console.warn(`Skipping (no plan number): ${file}`);
    continue;
  }
  const planNumber = match[1];
  const raw = fs.readFileSync(path.join(CMS_DIR, file), "utf-8");
  bundle[planNumber] = JSON.parse(raw);
  count++;
}

const json = JSON.stringify(bundle);
const gzipped = gzipSync(Buffer.from(json, "utf-8"), { level: 9 });
fs.writeFileSync(OUT_FILE, gzipped);

const sizeMB = (gzipped.length / 1024 / 1024).toFixed(2);
console.log(`Bundled ${count} plans → ${OUT_FILE} (${sizeMB} MB)`);
