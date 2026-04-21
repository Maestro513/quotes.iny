#!/usr/bin/env node
/**
 * Upload local Summary of Benefits PDFs to Vercel Blob and emit a manifest.
 *
 * Usage (run on whichever machine has the PDFs):
 *
 *   export BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
 *   node scripts/upload-sobs.js /absolute/path/to/sobs-dir
 *
 * The script:
 *   1. Walks the given directory for *.pdf files.
 *   2. Extracts the plan id from each filename. Accepts:
 *        HXXXX-XXX.pdf
 *        HXXXX-XXX-001.pdf          (segment-qualified)
 *        anything_HXXXX-XXX.pdf     (carrier prefix ok — first match wins)
 *        HXXXX-XXX_anything.pdf
 *   3. Uploads to medicare-sobs/<plan-id>.pdf on Vercel Blob with
 *      addRandomSuffix: false so the URL is deterministic per plan id.
 *      Re-uploads are idempotent (allowOverwrite: true).
 *   4. Writes data/sob-manifest.json: { [planId]: { url, uploadedAt, sizeKb } }.
 *      That file gets committed to the repo so the runtime helper doesn't need
 *      to list the blob bucket on every render.
 *
 * Resumable: reads the existing manifest if present and skips files whose
 * planId is already recorded and whose local mtime isn't newer. Pass
 * --force to re-upload everything.
 */

const fs = require("fs");
const path = require("path");
const { put } = require("@vercel/blob");

const SRC_DIR = process.argv[2];
const FORCE = process.argv.includes("--force");
const DRY_RUN = process.argv.includes("--dry-run");

if (!SRC_DIR || !fs.existsSync(SRC_DIR) || !fs.statSync(SRC_DIR).isDirectory()) {
  console.error("Usage: node scripts/upload-sobs.js /absolute/path/to/sobs-dir [--force] [--dry-run]");
  console.error("Point the first argument at a directory containing SOB PDFs.");
  process.exit(1);
}

if (!DRY_RUN && !process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("Missing BLOB_READ_WRITE_TOKEN. Grab it from Vercel dashboard");
  console.error("  → Project → Storage → <blob store> → .env.local snippet");
  console.error("then: export BLOB_READ_WRITE_TOKEN=... (or set it on Windows)");
  process.exit(1);
}

const MANIFEST_PATH = path.join(__dirname, "..", "data", "sob-manifest.json");
const PLAN_ID_RE = /(H\d{4}-\d{3}(?:-\d{3})?)/i;

function extractPlanId(filename) {
  const base = path.basename(filename, path.extname(filename));
  const m = base.match(PLAN_ID_RE);
  return m ? m[1].toUpperCase() : null;
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return {};
  try { return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")); }
  catch { return {}; }
}

function saveManifest(manifest) {
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
}

async function main() {
  const files = fs.readdirSync(SRC_DIR).filter((f) => f.toLowerCase().endsWith(".pdf"));
  console.log(`Found ${files.length} PDFs in ${SRC_DIR}`);

  const manifest = loadManifest();
  const unmatched = [];
  const skipped = [];
  const uploaded = [];
  const failed = [];

  for (const file of files) {
    const full = path.join(SRC_DIR, file);
    const planId = extractPlanId(file);
    if (!planId) {
      unmatched.push(file);
      continue;
    }

    const stat = fs.statSync(full);
    const existing = manifest[planId];
    const localMtime = stat.mtimeMs;

    if (!FORCE && existing && existing.localMtime && existing.localMtime >= localMtime) {
      skipped.push(planId);
      continue;
    }

    if (DRY_RUN) {
      console.log(`  would upload ${planId} (${file}, ${(stat.size / 1024).toFixed(0)} KB)`);
      continue;
    }

    try {
      const buffer = fs.readFileSync(full);
      const blob = await put(`medicare-sobs/${planId}.pdf`, buffer, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/pdf",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      manifest[planId] = {
        url: blob.url,
        uploadedAt: new Date().toISOString(),
        sizeKb: Math.round(stat.size / 1024),
        sourceFile: file,
        localMtime,
      };
      uploaded.push(planId);
      // Save manifest periodically so a mid-run failure doesn't lose progress
      if (uploaded.length % 25 === 0) saveManifest(manifest);
      process.stdout.write(`\r  uploaded ${uploaded.length}/${files.length - skipped.length - unmatched.length}...`);
    } catch (err) {
      failed.push({ planId, file, error: err.message });
      console.error(`\n  ✗ ${planId} (${file}): ${err.message}`);
    }
  }

  saveManifest(manifest);

  console.log(`\n
Summary
  Uploaded:  ${uploaded.length}
  Skipped:   ${skipped.length} (already in manifest, source not modified)
  Unmatched: ${unmatched.length} (no HXXXX-XXX plan id in filename)
  Failed:    ${failed.length}
  Manifest:  ${MANIFEST_PATH}
  Total in manifest: ${Object.keys(manifest).length}`);

  if (unmatched.length > 0 && unmatched.length <= 20) {
    console.log(`\nUnmatched filenames:`);
    unmatched.forEach((f) => console.log(`  ${f}`));
    console.log(`Rename these to include an HXXXX-XXX id, or drop them into a sub-folder that does.`);
  }
  if (failed.length > 0) {
    console.error(`\nFailed uploads — re-run with --force to retry.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
