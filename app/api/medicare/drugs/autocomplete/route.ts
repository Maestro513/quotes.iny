import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/medicare/drugs/autocomplete
 * Proxies RxNorm /drugs.json for drug name autocomplete.
 * Returns: [{ name: string, rxcui: string }]
 */
export async function POST(req: NextRequest) {
  const { query } = await req.json();
  if (!query || typeof query !== "string" || query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const res = await fetch(
      `https://rxnav.nlm.nih.gov/REST/drugs.json?name=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    const data = await res.json();

    const results: { name: string; rxcui: string }[] = [];
    const seen = new Set<string>();

    for (const group of data?.drugGroup?.conceptGroup ?? []) {
      for (const prop of group?.conceptProperties ?? []) {
        if (prop.name && prop.rxcui && !seen.has(prop.name)) {
          seen.add(prop.name);
          results.push({ name: prop.name, rxcui: prop.rxcui });
        }
      }
    }

    // Limit to 15 results for the dropdown
    return NextResponse.json(results.slice(0, 15));
  } catch {
    return NextResponse.json([], { status: 502 });
  }
}
