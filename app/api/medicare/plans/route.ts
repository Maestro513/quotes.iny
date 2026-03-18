import { NextRequest, NextResponse } from "next/server";
import type { MedicarePlan, MedicarePlanType } from "@/types/medicare";
import { getPlansForZip, normalizePlanNumber } from "@/lib/medicare/zip-lookup";
import backendPlanNumbers from "@/data/backend_plans.json";

const CONCIERGE = "https://concierge.insurancenyou.com";
const PAGE_SIZE = 20;

/* ── Concierge auth (JWT cached in-memory) ── */
let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getConciergeToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch(`${CONCIERGE}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.CONCIERGE_EMAIL,
      password: process.env.CONCIERGE_PASSWORD,
    }),
  });

  if (!res.ok) throw new Error(`Concierge login failed: ${res.status}`);

  const cookie = res.headers.get("set-cookie") ?? "";
  const match = cookie.match(/admin_token=([^;]+)/);
  if (!match) throw new Error("No admin_token in login response");

  cachedToken = match[1];
  // Refresh 5 minutes before the 8-hour expiry
  tokenExpiry = Date.now() + 7.9 * 60 * 60 * 1000;
  return cachedToken;
}

function parseMoney(s: string | undefined): number {
  if (!s) return 0;
  const n = s.replace(/[^0-9.]/g, "");
  return n ? parseFloat(n) : 0;
}

function findMedical(
  medical: { label: string; in_network: string }[],
  label: string
): string {
  return medical?.find((m) => m.label === label)?.in_network ?? "—";
}

function mapPlanType(planType: string, planNumber: string): MedicarePlanType {
  const pt = planType?.toLowerCase() ?? "";
  if (pt.includes("supplement") || pt.includes("medigap")) return "Supplement";
  if (pt.includes("pdp") || pt.includes("part d")) return "PartD";
  if (planNumber.charAt(0).toUpperCase() === "S") return "PartD";
  return "MA";
}

async function fetchPlanDetail(planNumber: string) {
  const token = await getConciergeToken();
  const res = await fetch(`${CONCIERGE}/api/admin/plans/${planNumber}`, {
    headers: { Cookie: `admin_token=${token}` },
    next: { revalidate: 300 },
  });
  if (!res.ok) return null;
  return res.json();
}

function mapToPlan(detail: Record<string, unknown>, planNumber: string): MedicarePlan | null {
  const b = detail.benefits as Record<string, unknown> | undefined;
  if (!b) return null;

  const medical = (b.medical ?? []) as { label: string; in_network: string }[];
  const drugs = (b.drugs ?? []) as { label: string; value: string }[];
  const supplemental = (b.supplemental ?? []) as { label: string; value: string }[];

  const type = mapPlanType((b.plan_type as string) ?? "", planNumber);
  const drugTier1 = drugs.find((d) => d.label.toLowerCase().includes("tier 1"))?.value ?? "—";
  const dentalVal = findMedical(medical, "Dental preventive");
  const visionVal = findMedical(medical, "Vision routine exam");
  const hearingVal = supplemental.find((s) => s.label.toLowerCase().includes("hearing"))?.value;
  const highlights = supplemental.slice(0, 3).map((s) => s.value);

  // Extract carrier from plan name (first word) or use plan_number prefix
  const planName = (b.plan_name as string) ?? planNumber;
  const carrier = planName.split(" ")[0] ?? "";

  return {
    id: planNumber,
    name: planName,
    type,
    carrier,
    premium_monthly: parseMoney(b.monthly_premium as string),
    deductible: parseMoney(b.annual_deductible_in as string),
    outOfPocketMax: parseMoney(b.moop_in as string),
    benefits: {
      primaryCare: findMedical(medical, "PCP visit"),
      specialist: findMedical(medical, "Specialist visit"),
      emergencyRoom: findMedical(medical, "Emergency room"),
      urgentCare: findMedical(medical, "Urgent care center"),
      rxCoverage: drugTier1,
      dental: dentalVal !== "—" ? dentalVal : undefined,
      vision: visionVal !== "—" ? visionVal : undefined,
      hearing: hearingVal,
    },
    highlights,
    county: "",
    zip_codes: [],
  };
}

export async function GET(req: NextRequest) {
  const zip = req.nextUrl.searchParams.get("zip") ?? "";
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1"));
  const planTypeFilter = req.nextUrl.searchParams.get("planType") ?? "";

  try {
    // Get valid plan numbers for this ZIP
    const zipPlans = await getPlansForZip(zip);

    let planNumbers: string[];

    // Build normalized set from static backend plan list
    const backendSet = new Set<string>(
      (backendPlanNumbers as string[]).map(normalizePlanNumber)
    );

    if (zipPlans) {
      // Intersect: plans in this ZIP that also exist in backend with benefits
      planNumbers = [...zipPlans].filter((pn) => backendSet.has(normalizePlanNumber(pn)));
    } else {
      // No ZIP — use all backend plans (excluding MongoDB ObjectIDs)
      planNumbers = (backendPlanNumbers as string[]).filter((pn) => pn.startsWith("H") || pn.startsWith("S"));
    }

    const total = planNumbers.length;

    // Paginate the plan number list
    const start = (page - 1) * PAGE_SIZE;
    const pageNumbers = planNumbers.slice(start, start + PAGE_SIZE);

    // Fetch details for this page in parallel
    const details = await Promise.all(pageNumbers.map(fetchPlanDetail));

    const plans: MedicarePlan[] = details
      .flatMap((detail, i) => {
        if (!detail) return [];
        const plan = mapToPlan(detail, pageNumbers[i]);
        return plan ? [plan] : [];
      })
      .sort((a, b) => a.premium_monthly - b.premium_monthly);

    const filtered = planTypeFilter
      ? plans.filter((p) => p.type === planTypeFilter)
      : plans;

    return NextResponse.json({ plans: filtered, total, page });
  } catch (err) {
    console.error("Medicare API error:", err);
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}
