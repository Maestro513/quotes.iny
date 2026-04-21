/**
 * SOB (Summary of Benefits) URL lookup.
 *
 * scripts/upload-sobs.js uploads PDFs to Vercel Blob and emits
 * data/sob-manifest.json with the form:
 *   { [planId]: { url, uploadedAt, sizeKb, sourceFile, localMtime } }
 *
 * The manifest is imported at build time (static JSON), so plan detail
 * pages can decide whether to render a SOB link without a runtime
 * network probe.
 *
 * Plan ids come in two shapes in the CMS bundle:
 *   HXXXX-XXX            (contract-plan)
 *   HXXXX-XXX-001        (contract-plan-segment)
 * We try the exact plan id first, then fall back to the un-segmented
 * form so a single SOB can serve all segments of the same plan when
 * only the base version was uploaded.
 */

import rawManifest from "@/data/sob-manifest.json";

interface SobEntry {
  url?: string;
  /** Spanish-language SOB when the carrier ships one (CMS SBSP artifact). */
  spanishUrl?: string;
  uploadedAt?: string;
  sizeKb?: number;
  sourceFile?: string;
  localMtime?: number;
  spanishLocalMtime?: number;
  /** true when this key is a 2-seg alias pointing at a real 3-seg PDF. */
  isAlias?: boolean;
}

const manifest = rawManifest as Record<string, SobEntry>;

function stripSegment(planId: string): string {
  const parts = planId.split("-");
  return parts.length >= 3 ? `${parts[0]}-${parts[1]}` : planId;
}

export function getSobUrl(planId: string | undefined | null): string | null {
  if (!planId) return null;
  const exact = manifest[planId.toUpperCase()];
  if (exact?.url) return exact.url;
  const base = stripSegment(planId.toUpperCase());
  const fallback = manifest[base];
  return fallback?.url ?? null;
}

export function getSpanishSobUrl(planId: string | undefined | null): string | null {
  if (!planId) return null;
  const exact = manifest[planId.toUpperCase()];
  if (exact?.spanishUrl) return exact.spanishUrl;
  const base = stripSegment(planId.toUpperCase());
  const fallback = manifest[base];
  return fallback?.spanishUrl ?? null;
}

export function getSobMeta(planId: string | undefined | null): SobEntry | null {
  if (!planId) return null;
  return (
    manifest[planId.toUpperCase()] ??
    manifest[stripSegment(planId.toUpperCase())] ??
    null
  );
}

export function totalSobsInManifest(): number {
  return Object.keys(manifest).length;
}
