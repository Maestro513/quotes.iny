import { NextRequest, NextResponse } from "next/server";
import { incomeToMidpoint } from "@/lib/params";
import type { IncomeRange } from "@/lib/params";
import type { Under65Plan } from "@/types/under65";

const BASE = "https://marketplace.api.healthcare.gov/api/v1";

function ageFromDob(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return Math.max(0, age);
}

interface CmsPlan {
  id: string;
  name: string;
  issuer?: { name: string };
  metal_level?: string;
  type?: string;
  hsa_eligible?: boolean;
  premium?: number;
  premium_w_credit?: number;
  deductibles?: { amount?: number }[];
  moops?: { amount?: number }[];
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.MARKETPLACE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

  const { zip, dob, gender, income, tobacco, householdSize } = await req.json();

  // 1. Look up county FIPS from ZIP
  const countyRes = await fetch(`${BASE}/counties/by/zip/${zip}?apikey=${apiKey}`);
  if (!countyRes.ok) {
    const txt = await countyRes.text();
    return NextResponse.json({ error: "County lookup failed", status: countyRes.status, detail: txt }, { status: 400 });
  }
  const countiesData = await countyRes.json();
  const countyList = countiesData.counties ?? countiesData;
  const county = Array.isArray(countyList) ? countyList[0] : null;
  if (!county) return NextResponse.json({ error: "No county found for ZIP" }, { status: 400 });

  // 2. Build household people array (use age not dob — CMS API returns 0 results with dob)
  const primaryAge = dob ? ageFromDob(dob) : 35;
  const people: object[] = [
    {
      age: primaryAge,
      uses_tobacco: tobacco ?? false,
      aptc_eligible: true,
    },
  ];
  for (let i = 1; i < (householdSize || 1); i++) {
    people.push({ age: 30, uses_tobacco: false, aptc_eligible: true });
  }

  // 3. Call plans/search — CMS hard-limits to 10/page, fetch all pages in parallel
  const annualIncome = incomeToMidpoint((income as IncomeRange) || "25-50k");
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

  // First page to get total count
  const firstPage = await fetchPage(0);
  if (!firstPage?.plans) {
    return NextResponse.json({ error: "CMS API error" }, { status: 502 });
  }

  const total: number = firstPage.total ?? 0;
  const PAGE = 10;
  const remainingOffsets = Array.from(
    { length: Math.ceil((total - PAGE) / PAGE) },
    (_, i) => (i + 1) * PAGE
  ).filter((o) => o < total);

  const remainingPages = await Promise.all(remainingOffsets.map(fetchPage));
  const allCmsPlans: CmsPlan[] = [
    ...firstPage.plans,
    ...remainingPages.flatMap((p) => p.plans ?? []),
  ];

  // 4. Map CMS plan shape → Under65Plan
  const plans: Under65Plan[] = allCmsPlans.map((p: CmsPlan) => {
    const premium = p.premium ?? 0;
    const netPremium = p.premium_w_credit ?? premium;
    return {
      id: p.id,
      name: p.name,
      carrier: p.issuer?.name ?? "Unknown Carrier",
      metalTier: (p.metal_level ?? "Bronze") as Under65Plan["metalTier"],
      planType: p.type ?? "",
      hsaEligible: p.hsa_eligible ?? false,
      monthlyPremium: Math.round(premium),
      deductible: Math.round(p.deductibles?.[0]?.amount ?? 0),
      outOfPocketMax: Math.round(p.moops?.[0]?.amount ?? 0),
      estimatedSubsidy: Math.round(premium - netPremium),
      netPremium: Math.round(netPremium),
    };
  });

  return NextResponse.json(plans);
}
