#!/usr/bin/env node
/**
 * Re-extract Dental / Vision / Hearing / OTC / Part-B-Giveback rows from the
 * raw SOB chunk files at `~/Desktop/INY_concierge/backend/extracted/{plan_id}.json`
 * and merge them into the structured plan JSONs at `data/extracted_cms/*.json`.
 *
 * Background: the original chunks→sections converter dropped or mangled
 * dental/vision/hearing data when those topics were embedded inside other
 * section chunks (e.g. PDF layout puts "Dental Allowance" prose inside the
 * "Hearing Services" chunk). This pass goes back to the raw chunks, runs
 * targeted regex extractors against the concatenated prose, and overlays
 * the recovered values onto the structured sections — preserving
 * everything else (PCP copays, drug tiers, plan meta, etc.).
 *
 * Usage:
 *   node scripts/reextract-dvh-from-chunks.mjs [--dry-run] [--limit N]
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const STRUCTURED_DIR = "data/extracted_cms";
const RAW_DIR = path.join(os.homedir(), "Desktop", "INY_concierge", "backend", "extracted");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : Infinity;

// ───────── extractors

/**
 * Extract dental allowance amount from prose. Supported patterns:
 *   "$1,500 yearly allowance toward Preventive Dental"
 *   "$500 annual dental allowance"
 *   "Dental Allowance ... $X"
 *   "Preventive Dental: $X"
 *   "Comprehensive Dental: $X"
 * Returns the highest dollar amount mentioned in a dental context (favors
 * the comprehensive allowance over a smaller preventive-only sub-amount).
 */
function extractDental(text) {
  if (!text) return null;
  const patterns = [
    /\$(\d[\d,]*)\s*yearly\s+allowance\s+toward\s+(?:Preventive|Comprehensive)?\s*Dental/i,
    /\$(\d[\d,]*)\s*(?:annual|yearly|per[\s-]year)\s+(?:dental|preventive\s+dental|comprehensive\s+dental)\s+allowance/i,
    /Dental\s+Allowance[^\$]{0,200}\$(\d[\d,]*)/i,
    /(?:Preventive|Comprehensive)\s+Dental[^\$]{0,80}\$(\d[\d,]*)/i,
    /\$(\d[\d,]*)\s*(?:per\s+year|annually|each\s+year)?\s*(?:dental)?\s*allowance.{0,40}dental/i,
  ];
  let best = 0;
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const n = parseInt(m[1].replace(/,/g, ""));
      if (n > best) best = n;
    }
  }
  return best > 0 ? `$${best.toLocaleString()}` : null;
}

/**
 * Extract vision allowance / eyewear amount. Patterns:
 *   "Up to $350 each year for eyeglasses and/or contacts"
 *   "$350 annually for eyewear"
 *   "$X eyewear allowance"
 *   "Eyewear ... $X"
 */
function extractVision(text) {
  if (!text) return null;
  const patterns = [
    /Up\s+to\s+\$(\d[\d,]*)\s*(?:each|per)\s+year\s+for\s+(?:eyeglasses|eyewear|frames|contacts|glasses)/i,
    /\$(\d[\d,]*)\s*(?:each|per)\s+year\s+for\s+(?:eyeglasses|eyewear|frames|contacts|glasses)/i,
    /\$(\d[\d,]*)\s*(?:per\s+year|annually|yearly|annual)\s+(?:eyewear|vision)\s+allowance/i,
    /(?:Eyewear|Vision\s+Allowance)[^\$]{0,150}\$(\d[\d,]*)/i,
    /\$(\d[\d,]*)\s*allowance.{0,60}(?:eyewear|vision|eyeglasses|frames)/i,
  ];
  let best = 0;
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const n = parseInt(m[1].replace(/,/g, ""));
      if (n > best) best = n;
    }
  }
  return best > 0 ? `$${best.toLocaleString()}` : null;
}

/**
 * Extract hearing aid copay or allowance. Patterns:
 *   "$199 copay or $499 copay per aid"
 *   "$X per hearing aid"
 *   "$X allowance ... hearing aid"
 *   "Hearing Aids ... $X"
 */
function extractHearing(text) {
  if (!text) return null;
  // "$199 copay or $499 copay per aid" — Devoted pattern, two tiers
  const twoTier = text.match(/\$(\d[\d,]*)\s*copay\s+or\s+\$(\d[\d,]*)\s*copay\s+per\s+aid/i);
  if (twoTier) {
    return `$${twoTier[1]}-$${twoTier[2]} per aid`;
  }
  const patterns = [
    /\$(\d[\d,]*)\s*(?:copay\s+)?per\s+(?:hearing\s+)?aid/i,
    /Hearing\s+Aid[s]?[^\$]{0,200}\$(\d[\d,]*)/i,
    /\$(\d[\d,]*)\s*(?:allowance|maximum)\s*(?:per\s+ear)?\s*(?:every\s+\d+\s+years?)?[^.]{0,40}hearing\s+aid/i,
  ];
  let best = 0;
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const n = parseInt(m[1].replace(/,/g, ""));
      if (n > best) best = n;
    }
  }
  return best > 0 ? `$${best.toLocaleString()} per aid` : null;
}

/**
 * Extract OTC allowance amount + period (monthly / quarterly).
 * Patterns:
 *   "$50 every quarter OTC allowance"
 *   "$X per month for OTC"
 *   "OTC ... $X per quarter"
 */
function extractOtc(text) {
  if (!text) return null;
  const patterns = [
    /\$(\d[\d,]*)\s*(?:every|per)\s+(month|quarter|year|qtr)[^.]{0,80}(?:OTC|over[\s-]the[\s-]counter)/i,
    /(?:OTC|over[\s-]the[\s-]counter)[^\$]{0,120}\$(\d[\d,]*)\s*(?:every|per)\s+(month|quarter|year|qtr)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const amount = parseInt(m[1].replace(/,/g, ""));
      const period = m[2].toLowerCase();
      const suffix = period === "month" ? "/mo" : period === "year" ? "/yr" : "/qtr";
      return `$${amount}${suffix}`;
    }
  }
  return null;
}

/**
 * Extract Part B premium giveback / buydown amount.
 * Patterns:
 *   "Your Part B premium is reduced by $9.10 per month"
 *   "Part B Buydown $X.XX"
 *   "Part B Giveback: $X"
 */
function extractGiveback(text) {
  if (!text) return null;
  const patterns = [
    /Part\s+B\s+premium\s+is\s+reduced\s+by\s+\$(\d+\.?\d*)\s*per\s+month/i,
    /Part\s+B\s+(?:premium\s+)?(?:buydown|giveback|reduction)[^\$]{0,80}\$(\d+\.?\d*)/i,
    /\$(\d+\.?\d*)\s*(?:per\s+month\s+)?Part\s+B\s+(?:premium\s+)?reduction/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const amount = parseFloat(m[1]);
      if (amount > 0 && amount < 200) return `$${amount.toFixed(2)}`;
    }
  }
  return null;
}

// ───────── helpers

function getOrCreateSection(plan, title, icon) {
  if (!Array.isArray(plan.sections)) plan.sections = [];
  let s = plan.sections.find((x) => x?.title === title);
  if (!s) {
    s = { title, icon, rows: [] };
    // Insert in a sensible order — before Plan Resources, after Supplemental
    const resourcesIdx = plan.sections.findIndex((x) => x?.title === "Plan Resources");
    if (resourcesIdx >= 0) plan.sections.splice(resourcesIdx, 0, s);
    else plan.sections.push(s);
  }
  return s;
}

/**
 * Add a row to a section, replacing any existing row with the same label.
 * If the existing value already has a parseable $ amount and the new one
 * doesn't, keep the existing — don't regress good data.
 */
function upsertRow(section, label, value) {
  if (!value) return;
  const idx = section.rows.findIndex((r) => r.label === label);
  if (idx >= 0) {
    const oldHasDollar = /\$\s*\d/.test(section.rows[idx].value ?? "");
    const newHasDollar = /\$\s*\d/.test(value);
    if (oldHasDollar && !newHasDollar) return; // keep the better existing value
    section.rows[idx] = { label, value };
  } else {
    section.rows.push({ label, value });
  }
}

// ───────── main

const structuredFiles = fs.readdirSync(STRUCTURED_DIR).filter((f) => f.endsWith(".json"));
let processed = 0;
let hadRawFile = 0;
let updatedDental = 0;
let updatedVision = 0;
let updatedHearing = 0;
let updatedOtc = 0;
let updatedGiveback = 0;
let written = 0;

for (const f of structuredFiles) {
  if (processed >= limit) break;
  processed++;

  const structuredPath = path.join(STRUCTURED_DIR, f);
  let plan;
  try {
    plan = JSON.parse(fs.readFileSync(structuredPath, "utf8"));
  } catch {
    continue;
  }
  const planId = plan.plan_id;
  if (!planId) continue;

  const rawPath = path.join(RAW_DIR, `${planId}.json`);
  if (!fs.existsSync(rawPath)) continue;
  hadRawFile++;

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));
  } catch {
    continue;
  }

  const text = (raw.chunks ?? []).map((c) => c.text ?? "").join("\n\n");
  if (!text) continue;

  const dental = extractDental(text);
  const vision = extractVision(text);
  const hearing = extractHearing(text);
  const otc = extractOtc(text);
  const giveback = extractGiveback(text);

  let changed = false;

  if (dental) {
    const sec = getOrCreateSection(plan, "Dental", "tooth");
    const before = JSON.stringify(sec.rows);
    upsertRow(sec, "Dental allowance", dental);
    if (JSON.stringify(sec.rows) !== before) {
      updatedDental++;
      changed = true;
    }
  }
  if (vision) {
    const sec = getOrCreateSection(plan, "Vision", "eye");
    const before = JSON.stringify(sec.rows);
    upsertRow(sec, "Eyewear allowance", vision);
    if (JSON.stringify(sec.rows) !== before) {
      updatedVision++;
      changed = true;
    }
  }
  if (hearing) {
    const sec = getOrCreateSection(plan, "Hearing", "ear");
    const before = JSON.stringify(sec.rows);
    upsertRow(sec, "Hearing aids", hearing);
    if (JSON.stringify(sec.rows) !== before) {
      updatedHearing++;
      changed = true;
    }
  }
  if (otc) {
    const sec = getOrCreateSection(plan, "Supplemental Benefits", "shield-check");
    const before = JSON.stringify(sec.rows);
    upsertRow(sec, "OTC Allowance", otc);
    if (JSON.stringify(sec.rows) !== before) {
      updatedOtc++;
      changed = true;
    }
  }
  if (giveback) {
    const before = plan.part_b_premium_reduction;
    if (!before || !/\$\s*\d/.test(before)) {
      plan.part_b_premium_reduction = giveback;
      updatedGiveback++;
      changed = true;
    }
  }

  if (changed && !dryRun) {
    fs.writeFileSync(structuredPath, JSON.stringify(plan, null, 2) + "\n");
    written++;
  }
}

console.log("=== Re-extraction summary ===");
console.log("Plans processed:", processed);
console.log("Plans with matching raw chunk file:", hadRawFile);
console.log("Dental rows added/updated:", updatedDental);
console.log("Vision rows added/updated:", updatedVision);
console.log("Hearing rows added/updated:", updatedHearing);
console.log("OTC rows added/updated:", updatedOtc);
console.log("Part B Giveback updated:", updatedGiveback);
console.log("Files written:", written, dryRun ? "(dry-run, none actually written)" : "");
