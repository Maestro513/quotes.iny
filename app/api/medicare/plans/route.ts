import { NextRequest, NextResponse } from "next/server";
import type { MedicarePlan, MedicarePlanType } from "@/types/medicare";
import { getPlansForZip, normalizePlanNumber } from "@/lib/medicare/zip-lookup";
import fs from "fs";
import path from "path";

const CONCIERGE = "https://iny-concierge.onrender.com";
const PAGE_SIZE = 20;

/* ── Local CMS JSON fallback ── */
const CMS_DIR = path.join(process.cwd(), "data", "extracted_cms");

// Build a plan_id → filename index once (lazy)
let cmsIndex: Map<string, string> | null = null;

function getCmsIndex(): Map<string, string> {
  if (cmsIndex) return cmsIndex;
  cmsIndex = new Map();
  try {
    const files = fs.readdirSync(CMS_DIR);
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      // Filename: "{Plan Name} {HXXXX-XXX}.json"
      const match = f.match(/([HR]\d{4}-\d{3})\.json$/);
      if (match) {
        cmsIndex.set(match[1], f);
      }
    }
  } catch {
    // CMS dir may not exist in some environments
  }
  return cmsIndex;
}

function loadCmsPlan(planNumber: string): Record<string, unknown> | null {
  const index = getCmsIndex();
  const filename = index.get(planNumber);
  if (!filename) return null;
  try {
    const raw = fs.readFileSync(path.join(CMS_DIR, filename), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

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
  const raw = medical?.find((m) => m.label === label)?.in_network ?? "—";
  // Strip CMS boilerplate like "(see EOC for cost)"
  return raw.replace(/\s*\(see EOC[^)]*\)/i, "").trim() || raw;
}

function mapPlanType(planType: string, planNumber: string): MedicarePlanType {
  const pt = planType?.toLowerCase() ?? "";
  if (pt.includes("supplement") || pt.includes("medigap")) return "Supplement";
  if (pt.includes("pdp") || pt.includes("part d")) return "PartD";
  if (planNumber.charAt(0).toUpperCase() === "S") return "PartD";
  return "MA";
}

async function fetchPlanDetail(planNumber: string) {
  // Use local CMS structured JSON (enriched with actual copay amounts)
  const cms = loadCmsPlan(planNumber);
  if (cms) {
    return { benefits: cmsToBenefits(cms), _source: "cms" };
  }

  // Fallback: Concierge API
  try {
    const token = await getConciergeToken();
    const res = await fetch(`${CONCIERGE}/api/admin/plans/${planNumber}`, {
      headers: { Cookie: `admin_token=${token}` },
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.benefits) return data;
    }
  } catch {
    // Concierge unavailable
  }

  console.warn(`Plan ${planNumber}: not found in CMS or Concierge`);
  return null;
}

/** Map CMS structured JSON sections → the flat benefits shape the route expects */
function cmsToBenefits(cms: Record<string, unknown>) {
  const sections = (cms.sections ?? []) as { title: string; rows: { label: string; value: string }[] }[];

  function findRow(sectionTitle: string, label: string): string {
    const section = sections.find((s) => s.title === sectionTitle);
    return section?.rows?.find((r) => r.label.toLowerCase().includes(label.toLowerCase()))?.value ?? "";
  }

  function getSection(title: string): { label: string; value: string }[] {
    return sections.find((s) => s.title === title)?.rows ?? [];
  }

  // Build medical array from Key Benefits + Medical Services
  const medical: { label: string; in_network: string }[] = [];
  for (const s of sections) {
    if (s.title === "Key Benefits" || s.title === "Medical Services" || s.title === "Dental" || s.title === "Vision" || s.title === "Hearing") {
      for (const r of s.rows) {
        medical.push({ label: mapCmsLabel(r.label), in_network: r.value });
      }
    }
  }

  // Build drugs array
  const drugs: { label: string; value: string }[] = getSection("Prescription Drugs");

  // Build supplemental array — include OTC, Part B giveback, hearing from Key Benefits
  const supplemental: { label: string; value: string }[] = [
    ...getSection("Supplemental Benefits"),
  ];
  // Pull OTC and Part B giveback from Key Benefits into supplemental
  const keyRows = getSection("Key Benefits");
  for (const r of keyRows) {
    if (r.label.toLowerCase().includes("otc") || r.label.toLowerCase().includes("part b") || r.label.toLowerCase().includes("giveback")) {
      supplemental.push(r);
    }
  }
  // Pull hearing from Hearing section
  for (const r of getSection("Hearing")) {
    supplemental.push({ label: `Hearing - ${r.label}`, value: r.value });
  }

  return {
    plan_name: cms.plan_name ?? "",
    plan_type: cms.plan_type ?? "",
    monthly_premium: cms.monthly_premium ?? "$0",
    annual_deductible_in: cms.annual_deductible_in ?? "$0",
    annual_deductible_out: null,
    moop_in: cms.moop_in ?? "",
    moop_out: cms.moop_out ?? null,
    medical,
    drugs,
    supplemental,
  };
}

/** Map CMS benefit labels to the labels mapToPlan expects */
function mapCmsLabel(label: string): string {
  const map: Record<string, string> = {
    "PCP Visit": "PCP visit",
    "Specialist Visit": "Specialist visit",
    "Emergency Room": "Emergency room",
    "Urgent Care": "Urgent care center",
    "Preventive Dental": "Dental preventive",
    "Comprehensive Dental": "Dental comprehensive",
    "Eye Exam": "Vision routine exam",
    "Eyewear": "Vision eyewear",
    "Hearing Exam": "Hearing exam",
    "Hearing Aids": "Hearing aids",
  };
  return map[label] ?? label;
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
  const otcVal = supplemental.find((s) => s.label.toLowerCase().includes("otc") || s.label.toLowerCase().includes("over-the-counter"))?.value;
  const partBVal = supplemental.find((s) => s.label.toLowerCase().includes("part b") || s.label.toLowerCase().includes("giveback"))?.value;
  const highlights = supplemental
    .filter((s) => !s.label.toLowerCase().includes("hearing") && !s.label.toLowerCase().includes("otc") && !s.label.toLowerCase().includes("over-the-counter") && !s.label.toLowerCase().includes("part b") && !s.label.toLowerCase().includes("giveback"))
    .slice(0, 4)
    .map((s) => s.value);

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
      otcAllowance: otcVal,
      partBGiveback: partBVal,
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
    // Get plan numbers for this ZIP (already filtered to extracted/CMS-verified plans)
    const zipPlans = await getPlansForZip(zip);
    const planNumbers: string[] = zipPlans ? [...zipPlans] : [];

    // Fetch ALL plan details in parallel for global sorting
    // (zip_backend_plans.json.gz gives ~47 plans per county — manageable)
    const details = await Promise.all(planNumbers.map(fetchPlanDetail));

    const allPlans: MedicarePlan[] = details
      .flatMap((detail, i) => {
        if (!detail) return [];
        const plan = mapToPlan(detail, planNumbers[i]);
        return plan ? [plan] : [];
      })
      .sort((a, b) => a.premium_monthly - b.premium_monthly);

    console.log(`Medicare ZIP ${zip}: ${allPlans.length} resolved out of ${planNumbers.length} plan numbers`);

    // Filter by plan type BEFORE pagination
    const filtered = planTypeFilter
      ? allPlans.filter((p) => p.type === planTypeFilter)
      : allPlans;

    const total = filtered.length;
    const start = (page - 1) * PAGE_SIZE;
    const plans = filtered.slice(start, start + PAGE_SIZE);

    return NextResponse.json({ plans, total, page });
  } catch (err) {
    console.error("Medicare API error:", err);
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}
