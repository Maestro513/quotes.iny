"use client";

import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import type { Under65Plan } from "@/types/under65";
import { carrierLogo } from "@/lib/medicare/carrier-logos";
import EmptyState from "@/components/empty-state";

const TIER_BADGE: Record<string, string> = {
  Bronze:       "border-amber-400 text-amber-600 bg-amber-50",
  Silver:       "border-slate-400 text-slate-600 bg-slate-50",
  Gold:         "border-yellow-500 text-yellow-700 bg-yellow-50",
  Platinum:     "border-sky-500 text-sky-700 bg-sky-50",
  Catastrophic: "border-red-400 text-red-600 bg-red-50",
};

function Under65DetailContent() {
  const { planId } = useParams<{ planId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [plan, setPlan] = useState<Under65Plan | null>(null);
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
        const res = await fetch("/api/under65/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ zip, dob, gender, income, tobacco, householdSize }),
        });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const plans: Under65Plan[] = await res.json();
        if (cancelled) return;
        const match = plans.find((p) => p.id === planId);
        if (!match) {
          setError("not-found");
        } else {
          setPlan(match);
        }
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
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-10 w-40 bg-white/5 rounded-lg animate-pulse" />
          <div className="h-48 bg-white/[0.03] border border-white/10 rounded-2xl animate-pulse" />
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
              Plan pricing depends on your ZIP, date of birth, and income.
              Head back to search, then pick this plan again to see full details.
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

  const tierBadge = TIER_BADGE[plan.metalTier] ?? "border-gray-300 text-gray-600 bg-gray-50";
  const rating = plan.qualityRating;

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 lg:p-10">
      <div className="max-w-4xl mx-auto">

        {/* Breadcrumb + back */}
        <button
          onClick={backToSearch}
          className="flex items-center gap-2 text-white/60 hover:text-white text-sm mb-6 transition-colors cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to all plans
        </button>

        {/* Hero card */}
        <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-lg">
          <div className="flex items-start gap-4 flex-wrap">
            <img
              src={carrierLogo(plan.carrier)}
              alt={plan.carrier}
              className="h-14 w-14 object-contain rounded-lg bg-white p-1 border border-gray-200 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-gray-500 text-sm font-medium">{plan.carrier}</p>
              <h1 className="text-gray-900 text-2xl font-bold tracking-tight leading-tight mt-0.5">
                {plan.name}
              </h1>
              <div className="flex items-center gap-1.5 flex-wrap mt-3">
                <span className={`text-xs font-bold border px-2.5 py-1 rounded-full uppercase tracking-wide ${tierBadge}`}>
                  {plan.metalTier}
                </span>
                {plan.planType && (
                  <span className="text-xs font-semibold border border-gray-300 text-gray-600 bg-white px-2.5 py-1 rounded-full uppercase tracking-wide">
                    {plan.planType}
                  </span>
                )}
                {plan.hsaEligible && (
                  <span className="text-xs font-semibold border border-gray-300 text-gray-600 bg-white px-2.5 py-1 rounded-full uppercase tracking-wide">
                    HSA Eligible
                  </span>
                )}
                {plan.hasNationalNetwork && (
                  <span className="text-xs font-semibold border border-sky-300 text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full uppercase tracking-wide">
                    National Network
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Big-stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mt-8 pt-6 border-t border-gray-100">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-violet-500">Your Premium</div>
              <div className="text-4xl font-black tabular-nums mt-1" style={{ color: "#22c55e" }}>
                ${plan.netPremium}
              </div>
              <div className="text-gray-400 text-xs mt-1">per month</div>
              {plan.estimatedSubsidy > 0 && (
                <div className="text-[#16a34a] text-xs font-semibold mt-0.5 tabular-nums">
                  −${plan.estimatedSubsidy} subsidy applied
                </div>
              )}
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-violet-500">Full Premium</div>
              <div className="text-3xl font-black text-gray-900 tabular-nums mt-1">${plan.monthlyPremium}</div>
              <div className="text-gray-400 text-xs mt-1">before subsidy</div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-violet-500">Deductible</div>
              <div className="text-3xl font-black text-gray-900 tabular-nums mt-1">${plan.deductible.toLocaleString()}</div>
              <div className="text-gray-400 text-xs mt-1">in-network</div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-violet-500">Out-of-Pocket Max</div>
              <div className="text-3xl font-black text-gray-900 tabular-nums mt-1">${plan.outOfPocketMax.toLocaleString()}</div>
              <div className="text-gray-400 text-xs mt-1">in-network</div>
            </div>
          </div>
        </div>

        {/* Benefits card */}
        <div className="bg-white rounded-2xl p-6 lg:p-8 mt-5 shadow-lg">
          <h2 className="text-gray-900 text-lg font-bold mb-1">What this plan covers</h2>
          <p className="text-gray-500 text-sm mb-5">Your in-network costs for common services.</p>

          <div className="divide-y divide-gray-100">
            <ServiceRow label="Primary care visit" value={plan.benefits.primaryCare} />
            <ServiceRow label="Specialist visit" value={plan.benefits.specialist} />
            <ServiceRow label="Urgent care" value={plan.benefits.urgentCare} />
            <ServiceRow label="Emergency room" value={plan.benefits.emergencyRoom} />
            <ServiceRow label="Mental/behavioral health (outpatient)" value={plan.benefits.mentalHealth} />
            <ServiceRow label="Generic prescription drugs" value={plan.benefits.genericRx} />
          </div>

          {rating !== undefined && (
            <div className="mt-6 pt-5 border-t border-gray-100 flex items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-violet-500">CMS Quality Rating</span>
              <span className="text-2xl font-black text-gray-900">{rating.toFixed(1)}</span>
              <span className="text-yellow-500">★</span>
              <span className="text-gray-400 text-xs">out of 5</span>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="bg-gradient-to-br from-[#22c55e]/15 to-[#22c55e]/5 border border-[#22c55e]/30 rounded-2xl p-6 lg:p-8 mt-5 text-center">
          <h2 className="text-white text-xl font-bold mb-1">Ready to enroll or have questions?</h2>
          <p className="text-white/70 text-sm mb-5">Talk to a licensed Insurance 'n You agent — no cost, no pressure.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a
              href="tel:18444676968"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#22c55e] text-white font-bold text-sm hover:bg-green-400 transition-colors shadow-[0_0_16px_rgba(34,197,94,0.25)]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              Call (844) 467-6968
            </a>
            <button
              onClick={backToSearch}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/5 border border-white/20 text-white font-semibold text-sm hover:bg-white/10 hover:border-white/40 transition-colors"
            >
              Compare other plans
            </button>
          </div>
          <p className="text-white/40 text-[11px] mt-5">
            Mon–Fri 10am–6:30pm ET · TTY 711 · Licensed in all 50 states
          </p>
        </div>

      </div>
    </div>
  );
}

function ServiceRow({ label, value }: { label: string; value: string }) {
  const covered = value && value.toLowerCase() !== "not covered";
  return (
    <div className="flex items-center justify-between py-3 gap-4">
      <span className="text-gray-700 text-sm">{label}</span>
      <span className={`text-sm font-semibold text-right ${covered ? "text-gray-900" : "text-gray-400"}`}>
        {value || "Not specified"}
      </span>
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
