"use client";

import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import type { CmsPlanDetail, Under65DetailContext, Under65DetailResponse, CmsBenefit } from "@/types/under65-detail";
import { carrierLogo } from "@/lib/medicare/carrier-logos";
import EmptyState from "@/components/empty-state";

const TIER_BADGE: Record<string, string> = {
  Bronze:       "border-amber-400 text-amber-600 bg-amber-50",
  Silver:       "border-slate-400 text-slate-600 bg-slate-50",
  Gold:         "border-yellow-500 text-yellow-700 bg-yellow-50",
  Platinum:     "border-sky-500 text-sky-700 bg-sky-50",
  Catastrophic: "border-red-400 text-red-600 bg-red-50",
  Expanded_Bronze: "border-amber-400 text-amber-600 bg-amber-50",
};

// Logical grouping of CMS benefit types → sensible section labels for the UI
const BENEFIT_GROUPS: { title: string; types: string[] }[] = [
  {
    title: "Doctor & urgent visits",
    types: [
      "PRIMARY_CARE_VISIT_TO_TREAT_AN_INJURY_OR_ILLNESS",
      "SPECIALIST_VISIT",
      "URGENT_CARE_CENTERS_OR_FACILITIES",
      "PREVENTIVE_CARE_SCREENING_IMMUNIZATION",
      "ROUTINE_EYE_EXAM_FOR_CHILDREN",
      "ROUTINE_DENTAL_SERVICES_ADULT",
    ],
  },
  {
    title: "Emergency & hospital",
    types: [
      "EMERGENCY_ROOM_SERVICES",
      "EMERGENCY_TRANSPORTATION_AMBULANCE",
      "INPATIENT_HOSPITAL_SERVICES_E_G_HOSPITAL_STAY",
      "INPATIENT_PHYSICIAN_AND_SURGICAL_SERVICES",
      "OUTPATIENT_SURGERY_PHYSICIAN_SURGICAL_SERVICES",
      "OUTPATIENT_FACILITY_FEE_E_G_AMBULATORY_SURGERY_CENTER",
    ],
  },
  {
    title: "Mental health & substance abuse",
    types: [
      "MENTAL_BEHAVIORAL_HEALTH_OUTPATIENT_SERVICES",
      "MENTAL_BEHAVIORAL_HEALTH_INPATIENT_SERVICES",
      "SUBSTANCE_ABUSE_DISORDER_OUTPATIENT_SERVICES",
      "SUBSTANCE_ABUSE_DISORDER_INPATIENT_SERVICES",
    ],
  },
  {
    title: "Prescription drugs",
    types: [
      "GENERIC_DRUGS",
      "PREFERRED_BRAND_DRUGS",
      "NON_PREFERRED_BRAND_DRUGS",
      "SPECIALTY_DRUGS",
    ],
  },
  {
    title: "Tests & imaging",
    types: [
      "LABORATORY_OUTPATIENT_AND_PROFESSIONAL_SERVICES",
      "X_RAYS_AND_DIAGNOSTIC_IMAGING",
      "IMAGING_CT_PET_SCANS_MRIS",
      "IMAGING_PHYSICIAN_PROFESSIONAL_SERVICES",
      "BASIC_DENTAL_CARE_CHILD",
      "MAJOR_DENTAL_CARE_CHILD",
      "ORTHODONTIA_CHILD",
    ],
  },
  {
    title: "Maternity & pediatric",
    types: [
      "PRENATAL_AND_POSTNATAL_CARE",
      "DELIVERY_AND_ALL_INPATIENT_SERVICES_FOR_MATERNITY_CARE",
      "WELL_BABY_VISITS_AND_CARE",
      "PEDIATRIC_PRIMARY_CARE_OFFICE_VISIT",
      "PEDIATRIC_SPECIALIST_OFFICE_VISIT",
    ],
  },
  {
    title: "Therapies & rehabilitation",
    types: [
      "OUTPATIENT_REHABILITATION_SERVICES",
      "HABILITATION_SERVICES",
      "CHIROPRACTIC_CARE",
      "ACUPUNCTURE",
      "HOME_HEALTH_CARE_SERVICES",
      "SKILLED_NURSING_FACILITY",
      "HOSPICE_SERVICES",
      "PRIVATE_DUTY_NURSING",
      "DURABLE_MEDICAL_EQUIPMENT",
      "INFERTILITY_TREATMENT",
      "TRANSPLANT",
      "BARIATRIC_SURGERY",
      "WEIGHT_LOSS_PROGRAMS",
      "NUTRITIONAL_COUNSELING",
    ],
  },
];

function humanizeType(type: string): string {
  return type
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bOr\b/g, "or")
    .replace(/\bAnd\b/g, "and")
    .replace(/\bE G\b/g, "e.g.")
    .replace(/\bCt\b/g, "CT")
    .replace(/\bPet\b/g, "PET")
    .replace(/\bMris\b/g, "MRIs");
}

function costFor(b: CmsBenefit, tier: string): string {
  const cs = b.cost_sharings?.find((c) => c.network_tier === tier);
  if (!cs) return "—";
  return cs.display_string || "—";
}

function Under65DetailContent() {
  const { planId } = useParams<{ planId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [plan, setPlan] = useState<CmsPlanDetail | null>(null);
  const [context, setContext] = useState<Under65DetailContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const zip = searchParams.get("zip") ?? "";
  const dob = searchParams.get("dob") ?? "";
  const gender = searchParams.get("gender") ?? "";
  const income = searchParams.get("income") ?? "";
  const tobacco = searchParams.get("tobacco") === "true";
  const householdSize = parseInt(searchParams.get("hs") ?? "1") || 1;

  useEffect(() => {
    if (!zip || !dob) {
      setError("missing-context");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/under65/plans/${encodeURIComponent(planId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ zip, dob, gender, income, tobacco, householdSize }),
        });
        if (!res.ok) {
          if (res.status === 404) setError("not-found");
          else setError(`api-${res.status}`);
          return;
        }
        const data: Under65DetailResponse = await res.json();
        if (cancelled) return;
        setPlan(data.plan);
        setContext(data.context);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "load-failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [planId, zip, dob, gender, income, tobacco, householdSize]);

  function backToSearch() {
    const qs = new URLSearchParams({ zip, dob, gender, income }).toString();
    router.push(`/under-65?${qs}`);
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] p-6 lg:p-10">
        <div className="max-w-5xl mx-auto space-y-5">
          <div className="h-10 w-40 bg-white/5 rounded-lg animate-pulse" />
          <div className="h-48 bg-white/[0.03] border border-white/10 rounded-2xl animate-pulse" />
          <div className="h-80 bg-white/[0.03] border border-white/10 rounded-2xl animate-pulse" />
          <div className="h-96 bg-white/[0.03] border border-white/10 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error === "missing-context") {
    return (
      <div className="min-h-[calc(100vh-4rem)] p-6 lg:p-10">
        <div className="max-w-2xl mx-auto mt-16">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <h2 className="text-white text-xl font-semibold mb-2">Need a bit more info</h2>
            <p className="text-white/60 text-sm mb-6">
              Plan pricing depends on your ZIP, date of birth, and income. Head back to search, then pick this plan again to see full details.
            </p>
            <Link href="/under-65" className="inline-block px-5 py-2.5 rounded-lg bg-[#22c55e] text-white font-semibold text-sm hover:bg-green-400 transition-colors">
              Start a search
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-[calc(100vh-4rem)] p-6 lg:p-10">
        <div className="max-w-2xl mx-auto mt-16">
          <EmptyState type="no-results" />
          <div className="mt-6 text-center">
            <button onClick={backToSearch} className="text-white/70 hover:text-white text-sm underline">
              ← Back to all plans
            </button>
          </div>
        </div>
      </div>
    );
  }

  const carrier = plan.issuer?.name ?? "Carrier";
  const tierBadge = TIER_BADGE[plan.metal_level ?? ""] ?? "border-gray-300 text-gray-600 bg-gray-50";
  const rating = plan.quality_rating?.global_rating;

  const premium = plan.premium ?? 0;
  const netPremium = plan.premium_w_credit ?? premium;
  const subsidy = Math.max(0, Math.round(premium - netPremium));

  const inNetworkDeductible =
    plan.deductibles?.find((d) => d.network_tier === "In-Network" && /Combined|Medical/i.test(d.type ?? "")) ??
    plan.deductibles?.find((d) => d.network_tier === "In-Network") ??
    plan.deductibles?.[0];
  const outNetworkDeductible = plan.deductibles?.find((d) => d.network_tier === "Out-of-Network");
  const inNetworkMoop =
    plan.moops?.find((m) => m.network_tier === "In-Network" && /Total|Combined/i.test(m.type ?? "")) ??
    plan.moops?.find((m) => m.network_tier === "In-Network") ??
    plan.moops?.[0];
  const outNetworkMoop = plan.moops?.find((m) => m.network_tier === "Out-of-Network");

  // Group benefits and filter out empty groups
  const benefits = plan.benefits ?? [];
  const renderedGroups = BENEFIT_GROUPS.map((group) => {
    const rows = group.types
      .map((t) => benefits.find((b) => b.type === t))
      .filter((b): b is CmsBenefit => Boolean(b));
    return { ...group, rows };
  }).filter((g) => g.rows.length > 0);

  // Any benefit not covered by the grouping — show at the bottom as "Other benefits"
  const grouped = new Set(BENEFIT_GROUPS.flatMap((g) => g.types));
  const otherBenefits = benefits.filter((b) => b.type && !grouped.has(b.type));

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 lg:p-10">
      <div className="max-w-5xl mx-auto">

        <button
          onClick={backToSearch}
          className="flex items-center gap-2 text-white/60 hover:text-white text-sm mb-6 transition-colors cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to all plans
        </button>

        {/* HERO */}
        <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-lg">
          <div className="flex items-start gap-4 flex-wrap">
            <img
              src={carrierLogo(carrier)}
              alt={carrier}
              className="h-14 w-14 object-contain rounded-lg bg-white p-1 border border-gray-200 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-gray-500 text-sm font-medium">{carrier}</p>
              <h1 className="text-gray-900 text-2xl font-bold tracking-tight leading-tight mt-0.5">
                {plan.name}
              </h1>
              <div className="flex items-center gap-1.5 flex-wrap mt-3">
                {plan.metal_level && (
                  <span className={`text-xs font-bold border px-2.5 py-1 rounded-full uppercase tracking-wide ${tierBadge}`}>
                    {plan.metal_level}
                  </span>
                )}
                {plan.type && (
                  <span className="text-xs font-semibold border border-gray-300 text-gray-600 bg-white px-2.5 py-1 rounded-full uppercase tracking-wide">
                    {plan.type}
                  </span>
                )}
                {plan.hsa_eligible && (
                  <span className="text-xs font-semibold border border-gray-300 text-gray-600 bg-white px-2.5 py-1 rounded-full uppercase tracking-wide">
                    HSA Eligible
                  </span>
                )}
                {plan.has_national_network && (
                  <span className="text-xs font-semibold border border-sky-300 text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full uppercase tracking-wide">
                    National Network
                  </span>
                )}
                {plan.specialist_referral_required === false && (
                  <span className="text-xs font-semibold border border-emerald-300 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wide">
                    No referral needed
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Premium + costs grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mt-8 pt-6 border-t border-gray-100">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-violet-500">Your Premium</div>
              <div className="text-4xl font-black tabular-nums mt-1" style={{ color: "#22c55e" }}>
                ${Math.round(netPremium)}
              </div>
              <div className="text-gray-400 text-xs mt-1">per month</div>
              {subsidy > 0 && (
                <div className="text-[#16a34a] text-xs font-semibold mt-0.5 tabular-nums">
                  −${subsidy} subsidy applied
                </div>
              )}
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-violet-500">Full Premium</div>
              <div className="text-3xl font-black text-gray-900 tabular-nums mt-1">${Math.round(premium)}</div>
              <div className="text-gray-400 text-xs mt-1">before subsidy</div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-violet-500">Deductible (in-net)</div>
              <div className="text-3xl font-black text-gray-900 tabular-nums mt-1">
                ${(inNetworkDeductible?.amount ?? 0).toLocaleString()}
              </div>
              {outNetworkDeductible?.amount !== undefined && (
                <div className="text-gray-400 text-xs mt-1 tabular-nums">
                  ${outNetworkDeductible.amount.toLocaleString()} out-of-network
                </div>
              )}
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-violet-500">Out-of-Pocket Max</div>
              <div className="text-3xl font-black text-gray-900 tabular-nums mt-1">
                ${(inNetworkMoop?.amount ?? 0).toLocaleString()}
              </div>
              {outNetworkMoop?.amount !== undefined && (
                <div className="text-gray-400 text-xs mt-1 tabular-nums">
                  ${outNetworkMoop.amount.toLocaleString()} out-of-network
                </div>
              )}
            </div>
          </div>
        </div>

        {/* DEDUCTIBLES DETAIL */}
        {plan.deductibles && plan.deductibles.length > 0 && (
          <div className="bg-white rounded-2xl p-6 lg:p-8 mt-5 shadow-lg">
            <h2 className="text-gray-900 text-lg font-bold mb-1">Deductibles &amp; out-of-pocket caps</h2>
            <p className="text-gray-500 text-sm mb-4">
              What you pay before cost-sharing kicks in, and the annual ceiling on your share.
            </p>
            <div className="divide-y divide-gray-100 -mx-2">
              {plan.deductibles.map((d, idx) => (
                <div key={idx} className="flex items-center justify-between py-2.5 px-2 gap-4">
                  <div className="min-w-0">
                    <div className="text-gray-800 text-sm font-medium">{d.type ?? "Deductible"}</div>
                    <div className="text-gray-400 text-xs">
                      {d.network_tier ?? "—"}{d.family_cost ? ` · ${d.family_cost}` : ""}{d.csr ? ` · ${d.csr}` : ""}
                    </div>
                  </div>
                  <div className="text-gray-900 font-bold tabular-nums whitespace-nowrap">
                    ${(d.amount ?? 0).toLocaleString()}
                  </div>
                </div>
              ))}
              {plan.moops?.map((m, idx) => (
                <div key={`moop-${idx}`} className="flex items-center justify-between py-2.5 px-2 gap-4">
                  <div className="min-w-0">
                    <div className="text-gray-800 text-sm font-medium">Max out-of-pocket · {m.type ?? ""}</div>
                    <div className="text-gray-400 text-xs">
                      {m.network_tier ?? "—"}{m.family_cost ? ` · ${m.family_cost}` : ""}
                    </div>
                  </div>
                  <div className="text-gray-900 font-bold tabular-nums whitespace-nowrap">
                    ${(m.amount ?? 0).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ANNUAL COST SNAPSHOT — helps shoppers compare yearly out-of-pocket, not just monthly premium */}
        <div className="bg-white rounded-2xl p-6 lg:p-8 mt-5 shadow-lg">
          <h2 className="text-gray-900 text-lg font-bold mb-1">Annual cost snapshot</h2>
          <p className="text-gray-500 text-sm mb-5">
            Rough yearly numbers so you can compare plans beyond the monthly premium.
            Actual costs depend on what care you use.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-violet-50/60 border border-violet-100 p-4">
              <div className="text-[10.5px] font-bold uppercase tracking-widest text-violet-500">Your premium · 12 mo</div>
              <div className="text-2xl font-black text-gray-900 tabular-nums mt-1">${(Math.round(netPremium) * 12).toLocaleString()}</div>
              <div className="text-gray-500 text-xs mt-1">After subsidy · paid monthly</div>
            </div>
            <div className="rounded-xl bg-violet-50/60 border border-violet-100 p-4">
              <div className="text-[10.5px] font-bold uppercase tracking-widest text-violet-500">Deductible first</div>
              <div className="text-2xl font-black text-gray-900 tabular-nums mt-1">${(inNetworkDeductible?.amount ?? 0).toLocaleString()}</div>
              <div className="text-gray-500 text-xs mt-1">What you pay before cost-sharing</div>
            </div>
            <div className="rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/30 p-4">
              <div className="text-[10.5px] font-bold uppercase tracking-widest text-[#15803d]">Worst-case year</div>
              <div className="text-2xl font-black text-gray-900 tabular-nums mt-1">${(Math.round(netPremium) * 12 + (inNetworkMoop?.amount ?? 0)).toLocaleString()}</div>
              <div className="text-gray-500 text-xs mt-1">Premium + in-network OOP max</div>
            </div>
          </div>
        </div>

        {/* BENEFITS — grouped */}
        {renderedGroups.length > 0 && (
          <div className="bg-white rounded-2xl p-6 lg:p-8 mt-5 shadow-lg">
            <h2 className="text-gray-900 text-lg font-bold mb-1">What this plan covers</h2>
            <p className="text-gray-500 text-sm mb-5">
              Your in-network and out-of-network cost-sharing for covered services.
              Any limits or exclusions appear below the line.
            </p>

            {renderedGroups.map((group) => (
              <div key={group.title} className="mb-8 last:mb-0">
                <h3 className="text-violet-700 text-[11px] font-bold uppercase tracking-widest mb-3">{group.title}</h3>
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  <div className="grid grid-cols-[1fr_auto_auto] bg-gray-50 px-4 py-2 text-[10.5px] font-bold text-gray-500 uppercase tracking-wider">
                    <span>Service</span>
                    <span className="px-4">In-Network</span>
                    <span>Out-of-Network</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {group.rows.map((b) => {
                      const label = b.name || humanizeType(b.type ?? "");
                      const inn = costFor(b, "In-Network");
                      const out = costFor(b, "Out-of-Network");
                      const notCovered = !b.covered;
                      return (
                        <div key={b.type} className="grid grid-cols-[1fr_auto_auto] items-start px-4 py-3 gap-4">
                          <div className="min-w-0">
                            <div className={`text-sm font-medium ${notCovered ? "text-gray-400" : "text-gray-800"}`}>
                              {label}
                            </div>
                            {(b.limit || b.exclusions) && (
                              <div className="text-[11px] text-gray-500 mt-1 space-y-0.5">
                                {b.limit && <div><strong className="text-gray-600">Limit:</strong> {b.limit}</div>}
                                {b.exclusions && <div><strong className="text-gray-600">Excludes:</strong> {b.exclusions}</div>}
                              </div>
                            )}
                          </div>
                          <div className={`text-right text-sm font-semibold tabular-nums whitespace-nowrap px-4 ${notCovered ? "text-gray-400" : "text-gray-900"}`}>
                            {inn}
                          </div>
                          <div className={`text-right text-sm font-medium tabular-nums whitespace-nowrap ${notCovered ? "text-gray-400" : "text-gray-700"}`}>
                            {out}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}

            {otherBenefits.length > 0 && (
              <div className="mb-0">
                <h3 className="text-violet-700 text-[11px] font-bold uppercase tracking-widest mb-3">Other covered services</h3>
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  <div className="divide-y divide-gray-100">
                    {otherBenefits.map((b, idx) => (
                      <div key={b.type ?? idx} className="flex items-start justify-between px-4 py-3 gap-4">
                        <div className="min-w-0">
                          <div className={`text-sm font-medium ${!b.covered ? "text-gray-400" : "text-gray-800"}`}>
                            {b.name || humanizeType(b.type ?? "Unknown")}
                          </div>
                          {(b.limit || b.exclusions) && (
                            <div className="text-[11px] text-gray-500 mt-1 space-y-0.5">
                              {b.limit && <div><strong className="text-gray-600">Limit:</strong> {b.limit}</div>}
                              {b.exclusions && <div><strong className="text-gray-600">Excludes:</strong> {b.exclusions}</div>}
                            </div>
                          )}
                        </div>
                        <div className={`text-right text-sm font-semibold tabular-nums whitespace-nowrap ${!b.covered ? "text-gray-400" : "text-gray-900"}`}>
                          {costFor(b, "In-Network")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DOCUMENTS + QUALITY + CONTACT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
          {/* Plan documents */}
          {(plan.plan_url || plan.brochure_url || plan.formulary_url || plan.network_url) && (
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="text-gray-900 font-bold text-base mb-1">Plan documents</h3>
              <p className="text-gray-500 text-xs mb-4">Open directly from the carrier.</p>
              <div className="space-y-2">
                {plan.brochure_url && (
                  <a href={plan.brochure_url} target="_blank" rel="noopener" className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-200 hover:border-violet-400 hover:bg-violet-50 transition-colors group">
                    <span className="text-sm font-medium text-gray-800 group-hover:text-violet-700">Summary of Benefits</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-violet-600"><path d="M7 7h10v10M7 17 17 7" /></svg>
                  </a>
                )}
                {plan.formulary_url && (
                  <a href={plan.formulary_url} target="_blank" rel="noopener" className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-200 hover:border-violet-400 hover:bg-violet-50 transition-colors group">
                    <span className="text-sm font-medium text-gray-800 group-hover:text-violet-700">Drug formulary</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-violet-600"><path d="M7 7h10v10M7 17 17 7" /></svg>
                  </a>
                )}
                {plan.network_url && (
                  <a href={plan.network_url} target="_blank" rel="noopener" className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-200 hover:border-violet-400 hover:bg-violet-50 transition-colors group">
                    <span className="text-sm font-medium text-gray-800 group-hover:text-violet-700">Provider directory</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-violet-600"><path d="M7 7h10v10M7 17 17 7" /></svg>
                  </a>
                )}
                {plan.plan_url && (
                  <a href={plan.plan_url} target="_blank" rel="noopener" className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-200 hover:border-violet-400 hover:bg-violet-50 transition-colors group">
                    <span className="text-sm font-medium text-gray-800 group-hover:text-violet-700">Carrier plan page</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-violet-600"><path d="M7 7h10v10M7 17 17 7" /></svg>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Quality rating */}
          {plan.quality_rating && (
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="text-gray-900 font-bold text-base mb-1">CMS quality rating</h3>
              <p className="text-gray-500 text-xs mb-4">Federal stars based on 2026 plan year.</p>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-black text-gray-900 tabular-nums">
                  {(rating ?? 0).toFixed(1)}
                </span>
                <span className="text-yellow-500 text-xl">★</span>
                <span className="text-gray-400 text-xs">out of 5</span>
              </div>
              <div className="space-y-2 text-sm">
                {plan.quality_rating.enrollee_experience_rating !== undefined && (
                  <RatingBar label="Member experience" value={plan.quality_rating.enrollee_experience_rating} />
                )}
                {plan.quality_rating.clinical_quality_management_rating !== undefined && (
                  <RatingBar label="Clinical quality" value={plan.quality_rating.clinical_quality_management_rating} />
                )}
                {plan.quality_rating.plan_efficiency_rating !== undefined && (
                  <RatingBar label="Plan efficiency" value={plan.quality_rating.plan_efficiency_rating} />
                )}
              </div>
            </div>
          )}

          {/* Carrier contact */}
          {plan.issuer && (
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="text-gray-900 font-bold text-base mb-1">Carrier contact</h3>
              <p className="text-gray-500 text-xs mb-4">Reach {carrier} directly.</p>
              <div className="space-y-2 text-sm">
                {plan.issuer.toll_free && (
                  <a href={`tel:${plan.issuer.toll_free.replace(/[^0-9]/g, "")}`} className="flex items-center gap-2 text-gray-800 hover:text-violet-700 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                    <span className="font-semibold tabular-nums">{plan.issuer.toll_free}</span>
                  </a>
                )}
                {plan.issuer.individual_consumer_email_address && (
                  <a href={`mailto:${plan.issuer.individual_consumer_email_address}`} className="flex items-center gap-2 text-gray-800 hover:text-violet-700 transition-colors truncate">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><path d="m22 6-10 7L2 6" /></svg>
                    <span className="truncate">{plan.issuer.individual_consumer_email_address}</span>
                  </a>
                )}
                {plan.issuer.marketing_url && (
                  <a href={plan.issuer.marketing_url} target="_blank" rel="noopener" className="flex items-center gap-2 text-gray-800 hover:text-violet-700 transition-colors truncate">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                    <span className="truncate">Carrier website</span>
                  </a>
                )}
                {(plan.languages && plan.languages.length > 0) || plan.issuer.hios_id || plan.issuer.state ? (
                  <div className="text-gray-500 text-xs pt-3 border-t border-gray-100 space-y-1">
                    {plan.languages && plan.languages.length > 0 && (
                      <div><strong className="text-gray-600">Languages:</strong> {plan.languages.join(", ")}</div>
                    )}
                    {plan.issuer.state && (
                      <div><strong className="text-gray-600">Licensed state:</strong> {plan.issuer.state}</div>
                    )}
                    {plan.issuer.hios_id && (
                      <div><strong className="text-gray-600">HIOS ID:</strong> <span className="font-mono">{plan.issuer.hios_id}</span></div>
                    )}
                    {plan.id && (
                      <div><strong className="text-gray-600">Plan ID:</strong> <span className="font-mono">{plan.id}</span></div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        {plan.disclaimer && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-5 text-white/60 text-xs leading-relaxed">
            {plan.disclaimer}
          </div>
        )}

        {/* CTA */}
        <div className="bg-gradient-to-br from-[#22c55e]/15 to-[#22c55e]/5 border border-[#22c55e]/30 rounded-2xl p-6 lg:p-8 mt-5 text-center">
          <h2 className="text-white text-xl font-bold mb-1">Ready to enroll or have questions?</h2>
          <p className="text-white/70 text-sm mb-5">
            Talk to a licensed Insurance 'n You agent — no cost, no pressure.
            {context && ` Quoted for ZIP ${context.zip}, age ${context.age}, ${context.householdSize === 1 ? "1 person" : `${context.householdSize} people`}.`}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href={`/under-65/${encodeURIComponent(planId)}/enroll?${searchParams.toString()}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#22c55e] text-white font-bold text-sm hover:bg-green-500 transition-colors shadow-[0_0_16px_rgba(34,197,94,0.25)]"
            >
              Start application
            </Link>
            <a href="tel:18444676968" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/5 border border-white/20 text-white font-semibold text-sm hover:bg-white/10 hover:border-white/40 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              Call (844) 467-6968
            </a>
            <button onClick={backToSearch} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/5 border border-white/20 text-white font-semibold text-sm hover:bg-white/10 hover:border-white/40 transition-colors">
              Compare other plans
            </button>
          </div>
          <p className="text-white/40 text-[11px] mt-5">Mon–Fri 10am–6:30pm ET · TTY 711 · Licensed in all 50 states</p>
        </div>

      </div>
    </div>
  );
}

function RatingBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(1, value / 5)) * 100;
  return (
    <div>
      <div className="flex justify-between text-gray-600 mb-1">
        <span>{label}</span>
        <span className="font-semibold text-gray-800 tabular-nums">{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Under65DetailPage() {
  return (
    <Suspense>
      <Under65DetailContent />
    </Suspense>
  );
}
