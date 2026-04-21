import { NextRequest, NextResponse } from "next/server";
import { incomeToMidpoint } from "@/lib/params";
import type { IncomeRange } from "@/lib/params";

/**
 * Single-plan detail endpoint for /under-65/[planId].
 *
 * CMS Marketplace API does not expose a GET-by-id for context-priced plans, so
 * we re-run /plans/search with the caller's household + place context and
 * filter down to the requested id. The full raw CMS plan object is returned
 * (not the stripped-down Under65Plan the list endpoint emits) so the detail
 * page can render benefits, limits, exclusions, documents, issuer contact,
 * network info, quality ratings, etc.
 */

const BASE = "https://marketplace.api.healthcare.gov/api/v1";

function ageFromDob(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return Math.max(0, age);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const apiKey = process.env.MARKETPLACE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

  const { planId } = await params;
  const { zip, dob, gender, income, tobacco, householdSize } = await req.json();

  if (!zip || !dob) {
    return NextResponse.json({ error: "missing-context" }, { status: 400 });
  }

  const countyRes = await fetch(`${BASE}/counties/by/zip/${zip}?apikey=${apiKey}`);
  if (!countyRes.ok) return NextResponse.json({ error: "county-lookup-failed" }, { status: 400 });
  const countiesData = await countyRes.json();
  const countyList = countiesData.counties ?? countiesData;
  const county = Array.isArray(countyList) ? countyList[0] : null;
  if (!county) return NextResponse.json({ error: "no-county" }, { status: 400 });

  const primaryAge = ageFromDob(dob);
  const people: object[] = [{ age: primaryAge, uses_tobacco: tobacco ?? false, aptc_eligible: true }];
  for (let i = 1; i < (householdSize || 1); i++) {
    people.push({ age: 30, uses_tobacco: false, aptc_eligible: true });
  }

  const numericIncome = Number(income);
  const annualIncome = numericIncome > 0 ? numericIncome : incomeToMidpoint((income as IncomeRange) || "25-50k");

  const baseBody = {
    household: { income: annualIncome, people },
    market: "Individual",
    place: { countyfips: county.fips, state: county.state, zipcode: zip },
    year: new Date().getFullYear(),
  };

  async function fetchPage(offset: number) {
    const res = await fetch(`${BASE}/plans/search?apikey=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...baseBody, offset }),
    });
    if (!res.ok) throw new Error(`CMS API error ${res.status}`);
    return res.json();
  }

  // CMS pages 10 at a time. Walk until we find the id or exhaust results.
  // Typical household has 50-150 plans total so at worst 15 pages in parallel.
  const first = await fetchPage(0);
  const total: number = first.total ?? 0;
  const offsets = Array.from({ length: Math.ceil((total - 10) / 10) }, (_, i) => (i + 1) * 10).filter((o) => o < total);
  const rest = await Promise.all(offsets.map(fetchPage));
  const allPlans = [...(first.plans ?? []), ...rest.flatMap((p) => p.plans ?? [])];

  const match = allPlans.find((p: { id?: string }) => p.id === planId);
  if (!match) return NextResponse.json({ error: "not-found" }, { status: 404 });

  // Surface context fields alongside raw plan so detail page can show "+$subsidy applied"
  return NextResponse.json({
    plan: match,
    context: {
      zip,
      countyfips: county.fips,
      state: county.state,
      annualIncome,
      age: primaryAge,
      householdSize: householdSize || 1,
    },
  });
}
