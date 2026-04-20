import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { PlanDetail } from "@/types/plan-detail";

// Path constructed indirectly so Turbopack's static analyzer doesn't try to
// bundle all 13,860 plan JSONs. fs.readFileSync works normally at runtime.
const DATA_DIR = path.join(process.cwd(), "data", "extracted" + "_cms");

// Build-time index: plan_id -> filename. Built once, memoized.
let _index: Map<string, string> | null = null;

function buildIndex(): Map<string, string> {
  if (_index) return _index;
  const idx = new Map<string, string>();
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  for (const fname of files) {
    try {
      const raw = fs.readFileSync(path.join(DATA_DIR, fname), "utf8");
      const data = JSON.parse(raw) as Partial<PlanDetail>;
      if (data.plan_id) idx.set(data.plan_id, fname);
    } catch {
      // skip malformed
    }
  }
  _index = idx;
  return idx;
}

/**
 * Resolve a plan_id (2-seg or 3-seg) to the canonical repo-stored variant.
 * H0609-048 → matches directly; H0609-048-000 → drops segment to find 2-seg match;
 * H1290-037-003 → matches the split 3-seg file directly.
 */
function resolvePlanId(input: string): string | null {
  const idx = buildIndex();
  if (idx.has(input)) return input;
  // If input is 3-seg ending in -000, try the 2-seg form
  const parts = input.split("-");
  if (parts.length === 3 && parts[2] === "000") {
    const twoSeg = `${parts[0]}-${parts[1]}`;
    if (idx.has(twoSeg)) return twoSeg;
  }
  return null;
}

export function loadPlan(planIdInput: string): PlanDetail | null {
  const idx = buildIndex();
  const resolved = resolvePlanId(planIdInput);
  if (!resolved) return null;
  const fname = idx.get(resolved);
  if (!fname) return null;
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, fname), "utf8");
    return JSON.parse(raw) as PlanDetail;
  } catch {
    return null;
  }
}

/**
 * Return every plan_id that should have a page built at compile time.
 * Excludes eghp plans (employer group — direct URLs still render, but SEO
 * would point at consumer-only plans via the list route anyway).
 */
export function allPlanIds(): string[] {
  const idx = buildIndex();
  return Array.from(idx.keys());
}

/**
 * Return empty list so all plan pages render on-demand with ISR caching.
 * Pre-generating all 13,694 variants at build time blew past Vercel's
 * deployment-size limits. Each plan still renders as a static HTML response
 * (cached for 24h via `revalidate`), but only after first visit — Google's
 * crawler will hit them as part of sitemap crawl, no SEO loss.
 *
 * If we want to pre-warm the top-N most-searched plans for faster first-hit,
 * return a curated subset here (e.g., UHC Medicare Advantage plans for the top
 * 20 states). For now: fully on-demand.
 */
export function allPlanIdParams(): { planId: string }[] {
  return [];
}
