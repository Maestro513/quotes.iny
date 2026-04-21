#!/usr/bin/env node
/**
 * Upload local Summary of Benefits PDFs to Vercel Blob and emit a manifest.
 *
 * Usage (run on whichever machine has the PDFs):
 *
 *   export BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
 *   node scripts/upload-sobs.js "C:\\path\\to\\sobs-dir"
 *
 * The script:
 *   1. Recursively walks the given directory for *.pdf / *.PDF files
 *      (15 carrier subfolders are handled, non-PDF files skipped).
 *   2. Extracts a canonical plan id from each filename. Four patterns
 *      are supported, in order:
 *        a. H/R/S + 4 digits + "-" + 3 digits [+ "-" + 3 digits]
 *           (standard CMS dashed form — matches most Aetna/Humana/BCBS
 *           named files and UHC 3-segment named files)
 *        b. 11-char compact CMS form HHHHHPPPSSSSB26.PDF where
 *           HHHHH = contract, PPP = plan, SSS = segment — common on
 *           Humana's raw CMS exports. Regrouped to H####-###-###.
 *        c. Fallback: first H/R/S + 4 digits anywhere in the name.
 *      Hex-hash orphans (no plan id in filename) are logged as
 *      unmatched so they can be mapped manually.
 *   3. Deduplicates by canonical plan id: if `X (1).pdf` and `X.pdf`
 *      both match the same id, prefers the non-"(1)" version.
 *   4. Uploads to medicare-sobs/<plan-id>.pdf on Vercel Blob with
 *      addRandomSuffix: false + allowOverwrite: true so the URL is
 *      deterministic per plan id and re-uploads are idempotent.
 *   5. Writes data/sob-manifest.json keyed by plan id. When a file is
 *      3-segment (HXXXX-XXX-NNN), also writes a 2-segment alias
 *      (HXXXX-XXX) so lookups from Zoho / the CMS bundle (which
 *      currently stores plan ids in 2-seg form) resolve without
 *      transformation. Aliases point to the same URL as the first
 *      3-seg variant found for that contract-plan.
 *
 * Flags:
 *   --dry-run   walk + match only; no uploads; manifest not written.
 *   --force     re-upload files whose mtime is unchanged.
 *   --verbose   print every matched file.
 */

const fs = require("fs");
const path = require("path");
const { put } = require("@vercel/blob");

const SRC_DIR = process.argv[2];
const FORCE = process.argv.includes("--force");
const DRY_RUN = process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose");

if (!SRC_DIR || !fs.existsSync(SRC_DIR) || !fs.statSync(SRC_DIR).isDirectory()) {
  console.error('Usage: node scripts/upload-sobs.js "/absolute/path/to/sobs-dir" [--force] [--dry-run] [--verbose]');
  console.error("Point the first argument at the directory that contains SOB PDFs (recurses into subfolders).");
  process.exit(1);
}

if (!DRY_RUN && !process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("Missing BLOB_READ_WRITE_TOKEN. Grab it from Vercel dashboard:");
  console.error("  Project -> Stores -> <blob store> -> .env.local snippet");
  console.error("PowerShell: $env:BLOB_READ_WRITE_TOKEN=\"vercel_blob_rw_...\"");
  console.error("bash:       export BLOB_READ_WRITE_TOKEN=\"vercel_blob_rw_...\"");
  process.exit(1);
}

const MANIFEST_PATH = path.join(__dirname, "..", "data", "sob-manifest.json");

// Pattern (a): dashed CMS id, 2-seg or 3-seg. Case-insensitive for the letter prefix.
// Matches "H1608-029", "R0110-001", "H1045-067-000" embedded anywhere.
const RE_DASHED = /([HRS])(\d{4})-(\d{3})(?:-(\d{3}))?/i;

// Pattern (b): 11-char compact CMS form. "H0028007000SB26.PDF" → "H0028-007-000".
// Also tolerates Spanish "SBSP24" suffix (Spanish Summary of Benefits) and a
// trailing " (1)" / " (2)" copy marker from Windows duplicate downloads.
// Anchored because it's a filename shape, not a substring.
const RE_COMPACT = /^([HRS])(\d{4})(\d{3})(\d{3})SB(?:SP)?\d{2}$/i;

// Pattern (c): Aetna underscore form.
// "Y0001_S5601_038_SB_2026_M.pdf" -> S5601-038 (2-seg)
// "Y0001_S5601_038_001_SB_2026_M.pdf" -> S5601-038-001 (if the segment is present)
// The Y-token is the CMS marketing org id — we ignore it and pull the contract+plan
// from the 2nd/3rd underscore tokens. Contract + plan tokens sit before _SB_.
const RE_AETNA_UNDERSCORE = /(?:^|_)([HRS])(\d{4})_(\d{3})(?:_(\d{3}))?_SB_/i;

/**
 * Strip a trailing " (N)" copy marker so Windows-style duplicate filenames
 * ("H7617113000SB26 (1).PDF") match the same patterns as their canonical
 * sibling. The preferredFile() dedup further collapses them on the chosen map.
 */
function stripCopyMarker(nameNoExt) {
  return nameNoExt.replace(/\s*\(\d+\)\s*$/, "");
}

/**
 * Return { canonical, segmented, base2, language } for a file, or null.
 *   canonical  — the id we key by in manifest + blob path (prefer 3-seg)
 *   segmented  — true if the filename carried a 3-seg id
 *   base2      — 2-seg form for alias writes (always HXXXX-XXX)
 *   language   — "en" by default; "es" when the filename carries the CMS
 *                SBSP24 Spanish-SOB suffix
 */
function extractPlanId(filename) {
  const nameNoExt = stripCopyMarker(path.basename(filename, path.extname(filename)));

  // Try compact CMS first — it's anchored so false positives are unlikely
  const cm = nameNoExt.match(RE_COMPACT);
  if (cm) {
    const [, letter, contract, plan, segment] = cm;
    const base2 = `${letter.toUpperCase()}${contract}-${plan}`;
    const canonical = `${base2}-${segment}`;
    const language = /SBSP\d{2}$/i.test(nameNoExt) ? "es" : "en";
    return { canonical, segmented: true, base2, language };
  }

  // Aetna/Y-token underscore form
  const um = nameNoExt.match(RE_AETNA_UNDERSCORE);
  if (um) {
    const [, letter, contract, plan, segment] = um;
    const base2 = `${letter.toUpperCase()}${contract}-${plan}`;
    if (segment) {
      return { canonical: `${base2}-${segment}`, segmented: true, base2, language: "en" };
    }
    return { canonical: base2, segmented: false, base2, language: "en" };
  }

  // Dashed CMS id embedded anywhere
  const dm = nameNoExt.match(RE_DASHED);
  if (dm) {
    const [, letter, contract, plan, segment] = dm;
    const base2 = `${letter.toUpperCase()}${contract}-${plan}`;
    if (segment) {
      return { canonical: `${base2}-${segment}`, segmented: true, base2, language: "en" };
    }
    return { canonical: base2, segmented: false, base2, language: "en" };
  }

  return null;
}

function walkPdfs(root) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { continue; }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) stack.push(full);
      else if (ent.isFile() && /\.pdf$/i.test(ent.name)) out.push(full);
    }
  }
  return out;
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

/** Dedup by canonical id: prefer files without " (1)" / " (2)" suffix. */
function preferredFile(a, b) {
  const paren = /\s\(\d+\)\s*$/;
  const aBase = path.basename(a, path.extname(a));
  const bBase = path.basename(b, path.extname(b));
  const aHas = paren.test(aBase);
  const bHas = paren.test(bBase);
  if (aHas && !bHas) return b;
  if (!aHas && bHas) return a;
  // Otherwise prefer shorter basename (likely the cleaner name)
  return aBase.length <= bBase.length ? a : b;
}

async function main() {
  console.log(`Scanning ${SRC_DIR} ...`);
  const files = walkPdfs(SRC_DIR);
  console.log(`Found ${files.length.toLocaleString()} PDF files across all subfolders.`);

  // Group by (canonical, language) so English vs Spanish SBs don't collide.
  // chosen key: `${canonical}::${language}`
  const chosen = new Map();
  const unmatched = [];

  for (const file of files) {
    const id = extractPlanId(path.basename(file));
    if (!id) {
      unmatched.push(file);
      continue;
    }
    const key = `${id.canonical}::${id.language}`;
    const prior = chosen.get(key);
    if (!prior) {
      chosen.set(key, { filePath: file, segmented: id.segmented, base2: id.base2, canonical: id.canonical, language: id.language });
    } else {
      const winner = preferredFile(prior.filePath, file);
      if (winner !== prior.filePath) {
        chosen.set(key, { filePath: file, segmented: id.segmented, base2: id.base2, canonical: id.canonical, language: id.language });
      }
    }
    if (VERBOSE) console.log(`  ${id.canonical}${id.language === "es" ? " [ES]" : ""}  <=  ${path.relative(SRC_DIR, file)}`);
  }

  const uniqueCanonical = new Set([...chosen.values()].map((v) => v.canonical)).size;
  console.log(`Matched: ${chosen.size.toLocaleString()} files -> ${uniqueCanonical.toLocaleString()} unique plan ids.`);
  console.log(`Unmatched (no plan id in name): ${unmatched.length}`);

  const manifest = loadManifest();
  const uploaded = [];
  const skipped = [];
  const failed = [];

  let index = 0;
  for (const [key, info] of chosen) {
    index++;
    const planId = info.canonical;
    const isSpanish = info.language === "es";
    const blobKey = isSpanish ? `medicare-sobs/${planId}-es.pdf` : `medicare-sobs/${planId}.pdf`;
    const mtimeField = isSpanish ? "spanishLocalMtime" : "localMtime";

    const stat = fs.statSync(info.filePath);
    const existing = manifest[planId];
    const localMtime = stat.mtimeMs;
    const priorMtime = existing?.[mtimeField];

    if (!FORCE && existing && priorMtime && priorMtime >= localMtime && !existing.isAlias) {
      skipped.push(key);
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [${index}/${chosen.size}] would upload ${planId}${isSpanish ? " [es]" : ""} (${(stat.size / 1024).toFixed(0)} KB, ${path.relative(SRC_DIR, info.filePath)})`);
      continue;
    }

    try {
      const buffer = fs.readFileSync(info.filePath);
      const blob = await put(blobKey, buffer, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/pdf",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      // Merge English + Spanish variants into one manifest entry per plan id.
      const base = manifest[planId] ?? {};
      const urlField = isSpanish ? "spanishUrl" : "url";
      manifest[planId] = {
        ...base,
        [urlField]: blob.url,
        uploadedAt: new Date().toISOString(),
        sizeKb: Math.round(stat.size / 1024),
        sourceFile: path.relative(SRC_DIR, info.filePath),
        [mtimeField]: localMtime,
      };
      // Clear the alias flag — we now have a real upload at this key
      delete manifest[planId].isAlias;

      // 2-seg alias (only for English; Spanish rides along on the same base):
      // Zoho + the CMS bundle key plans in 2-seg form (HXXXX-XXX). If this is
      // the first 3-seg we see for that base, also write the alias so a lookup
      // by 2-seg resolves without transformation.
      if (!isSpanish && info.segmented && info.base2 !== planId && !manifest[info.base2]) {
        manifest[info.base2] = {
          url: blob.url,
          uploadedAt: new Date().toISOString(),
          sizeKb: Math.round(stat.size / 1024),
          sourceFile: `alias of ${planId}`,
          isAlias: true,
        };
      }

      uploaded.push(key);
      if (uploaded.length % 25 === 0) saveManifest(manifest);
      process.stdout.write(`\r  uploaded ${uploaded.length}/${chosen.size - skipped.length}...`);
    } catch (err) {
      failed.push({ planId, file: info.filePath, error: err.message });
      console.error(`\n  ✗ ${planId}: ${err.message}`);
    }
  }

  saveManifest(manifest);

  console.log(`\n
Summary
  Total PDFs found:       ${files.length.toLocaleString()}
  Unique plan ids matched: ${chosen.size.toLocaleString()}
  Uploaded this run:       ${uploaded.length.toLocaleString()}
  Skipped (already fresh): ${skipped.length.toLocaleString()}
  Unmatched files:         ${unmatched.length} (no H/R/S-####-### in filename)
  Failed uploads:          ${failed.length}
  Manifest entries total:  ${Object.keys(manifest).length.toLocaleString()}
  Manifest path:           ${MANIFEST_PATH}`);

  if (unmatched.length > 0) {
    console.log(`\nFirst 10 unmatched:`);
    unmatched.slice(0, 10).forEach((f) => console.log(`  ${path.relative(SRC_DIR, f)}`));
    if (unmatched.length > 10) console.log(`  ... and ${unmatched.length - 10} more`);
    console.log(`Rename these to include an HXXXX-XXX id or drop them into a sub-folder whose files carry one.`);
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
