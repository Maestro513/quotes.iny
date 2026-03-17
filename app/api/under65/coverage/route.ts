import { NextRequest, NextResponse } from "next/server";

const BASE = "https://marketplace.api.healthcare.gov/api/v1";
const COVERED = new Set(["Covered", "GenericCovered", "CoveredBrand"]);

export async function POST(req: NextRequest) {
  const apiKey = process.env.MARKETPLACE_API_KEY;
  if (!apiKey) return NextResponse.json({ coveredIds: [] });

  const { type, id, planIds, year } = await req.json();
  if (!id || !planIds?.length) return NextResponse.json({ coveredIds: [] });

  const planIdsParam = (planIds as string[]).join(",");
  const queryYear = year ?? new Date().getFullYear();

  let url: string;
  let coverageKey: string;
  if (type === "provider") {
    url = `${BASE}/providers/covered?providerids=${encodeURIComponent(id)}&planids=${encodeURIComponent(planIdsParam)}&year=${queryYear}&apikey=${apiKey}`;
    coverageKey = "plan_id";
  } else {
    url = `${BASE}/drugs/covered?drugs=${encodeURIComponent(id)}&planids=${encodeURIComponent(planIdsParam)}&year=${queryYear}&apikey=${apiKey}`;
    coverageKey = "plan_id";
  }

  const res = await fetch(url);
  if (!res.ok) return NextResponse.json({ coveredIds: [] });
  const data = await res.json();

  interface CoverageEntry {
    coverage: string;
    plan_id: string;
    addresses?: { street?: string; city?: string; state?: string; zip?: string }[];
  }

  const entries: CoverageEntry[] = data.coverage ?? [];

  const coveredIds = entries
    .filter((c) => COVERED.has(c.coverage))
    .map((c) => c.plan_id);

  // Grab first address from any entry that has one
  let address: string | null = null;
  if (type === "provider") {
    for (const entry of entries) {
      const addr = entry.addresses?.[0];
      if (addr?.street) {
        address = [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(", ");
        break;
      }
    }
  }

  return NextResponse.json({ coveredIds, address });
}
