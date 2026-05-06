"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo, Suspense } from "react";
import { parseParams } from "@/lib/params";
import { fetchMedicarePlans } from "@/lib/medicare/adapter";
import type { MedicarePlan } from "@/types/medicare";
import MedicarePlanCard from "@/components/medicare-plan-card";
import SkeletonCard from "@/components/skeleton-card";
import EmptyState from "@/components/empty-state";
import { computeTierBadges } from "@/lib/medicare/tier-badges";

type SortOption = "premium-asc" | "rating-desc" | "moop-asc";

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: "Lowest Premium", value: "premium-asc" },
  { label: "Highest Rating", value: "rating-desc" },
  { label: "Lowest MOOP", value: "moop-asc" },
];

const PAGE_SIZE = 18;
const COMPARE_LIMIT = 3;

// Carrier toggle order from handoff
const CARRIER_TOGGLES = ["UnitedHealthcare", "Humana", "Devoted Health", "Aetna", "Cigna", "Blue Cross Blue Shield"];

function HeroWaves() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1440 200"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <g fill="none" stroke="rgba(120, 60, 180, 0.35)" strokeWidth="1">
        <path d="M-20,30 C200,90 380,10 600,60 S1000,140 1200,60 1500,90 1500,90" />
        <path d="M-20,55 C220,120 400,30 620,80 S1020,160 1220,80 1500,110 1500,110" />
        <path d="M-20,80 C240,150 420,55 640,105 S1040,180 1240,105 1500,135 1500,135" />
        <path d="M-20,110 C260,180 440,80 660,135 S1060,200 1260,135 1500,160 1500,160" />
        <path d="M-20,140 C280,210 460,110 680,160 S1080,220 1280,160 1500,180 1500,180" />
        <path d="M-20,170 C300,235 480,140 700,190 S1100,245 1300,190 1500,205 1500,205" />
      </g>
    </svg>
  );
}

function PlansSectionWaves() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none opacity-55"
      viewBox="0 0 1440 540"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <g fill="none" stroke="rgba(180, 130, 220, 0.18)" strokeWidth="1">
        <path d="M-20,40 C200,180 400,-20 720,80 S1100,260 1500,100" />
        <path d="M-20,90 C200,230 400,30 720,130 S1100,310 1500,150" />
        <path d="M-20,140 C200,280 400,80 720,180 S1100,360 1500,200" />
        <path d="M-20,200 C200,350 400,150 720,250 S1100,420 1500,260" />
        <path d="M-20,280 C200,420 400,220 720,330 S1100,500 1500,340" />
        <path d="M-20,360 C200,500 400,300 720,410 S1100,580 1500,420" />
        <path d="M-20,440 C200,580 400,380 720,490 S1100,650 1500,500" />
      </g>
    </svg>
  );
}

function CarrierToggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <label
      className="inline-flex items-center gap-2 cursor-pointer select-none text-[#1f1330] text-sm"
      onClick={onClick}
    >
      <span
        className={`relative w-8 h-[18px] rounded-full transition-colors duration-[120ms] flex-shrink-0 ${
          on ? "bg-[#6a2fa0]" : "bg-[#d4cfdc]"
        }`}
      >
        <span
          className="absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.12)] transition-transform duration-[140ms]"
          style={{ transform: on ? "translateX(14px)" : "translateX(0)" }}
        />
      </span>
      {label}
    </label>
  );
}

function MedicareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const parsed = parseParams(searchParams);

  const [zip, setZip] = useState(parsed.zip);

  const [allPlans, setAllPlans] = useState<MedicarePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [activeCarriers, setActiveCarriers] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>("premium-asc");

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [comparing, setComparing] = useState<MedicarePlan[]>([]);
  const [popKey, setPopKey] = useState(0);

  const filteredPlans = useMemo(() => {
    let result = allPlans;
    if (activeCarriers.size > 0) {
      result = result.filter((p) => activeCarriers.has(p.carrier));
    }
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "premium-asc": return a.premium_monthly - b.premium_monthly;
        case "rating-desc": return (b.starRating ?? 0) - (a.starRating ?? 0);
        case "moop-asc": return a.outOfPocketMax - b.outOfPocketMax;
        default: return 0;
      }
    });
  }, [allPlans, activeCarriers, sortBy]);

  const visiblePlans = filteredPlans.slice(0, visibleCount);
  const tierBadgesByPlan = useMemo(() => computeTierBadges(filteredPlans), [filteredPlans]);

  async function loadPlans(currentZip = zip) {
    setLoading(true);
    setError(false);
    setVisibleCount(PAGE_SIZE);
    try {
      const first = await fetchMedicarePlans({ zip: currentZip, page: 1 });
      let plans = first.plans;
      const totalPlans = first.total;
      if (plans.length < totalPlans) {
        const pages = Math.ceil(totalPlans / PAGE_SIZE);
        const rest = await Promise.all(
          Array.from({ length: pages - 1 }, (_, i) =>
            fetchMedicarePlans({ zip: currentZip, page: i + 2 })
          )
        );
        for (const r of rest) plans = [...plans, ...r.plans];
      }
      setAllPlans(plans);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlans();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ zip });
    router.replace(`/medicare?${params.toString()}`);
    loadPlans(zip);
  }

  function toggleCarrier(carrier: string) {
    setActiveCarriers((curr) => {
      const next = new Set(curr);
      if (next.has(carrier)) next.delete(carrier);
      else next.add(carrier);
      return next;
    });
  }

  function toggleCompare(plan: MedicarePlan) {
    setComparing((curr) => {
      const exists = curr.find((p) => p.id === plan.id);
      let next: MedicarePlan[];
      if (exists) next = curr.filter((p) => p.id !== plan.id);
      else if (curr.length >= COMPARE_LIMIT) return curr;
      else next = [...curr, plan];
      return next;
    });
    setPopKey((k) => k + 1);
  }

  const currentSortLabel = SORT_OPTIONS.find((s) => s.value === sortBy)?.label ?? "Lowest Premium";

  return (
    <div className="min-h-screen bg-white text-[#1f1330] text-sm">
      {/* HERO */}
      <section className="relative bg-gradient-to-b from-[#f2f7f7] to-[#e8f1f4] pt-[34px] pb-[30px] border-b border-[#e1e9ec] overflow-hidden">
        <HeroWaves />
        <div className="relative z-[1] text-center px-6">
          <h1 className="text-[38px] leading-tight font-semibold tracking-[-0.01em] text-[#1f1330]">
            {!loading && !error
              ? `${filteredPlans.length} plan${filteredPlans.length !== 1 ? "s" : ""} available in ${parsed.zip || "your area"}`
              : "Find your Medicare plan"}
          </h1>
          <p className="mt-2 text-sm text-[#4a4458]">
            For <b className="text-[#5a2a82] font-semibold">2026 enrollment</b> · Last updated today
          </p>
        </div>
      </section>

      {/* FILTERS */}
      <div className="bg-[#f3f2f5] border-b border-[#e6e3ec] px-8 py-3.5 flex flex-wrap items-center gap-7 text-sm">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <span className="text-[#5a5468]">ZIP</span>
          <input
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            placeholder="33065"
            inputMode="numeric"
            maxLength={5}
            className="bg-white border border-[#d4cfdc] rounded-md px-3 py-1.5 text-[#1f1330] font-medium tabular-nums w-24 focus:outline-none focus:border-[#6a2fa0]"
          />
        </form>

        <span className="w-px h-[22px] bg-[#d4cfdc]" />

        <div className="flex items-center gap-3">
          <span className="text-[#5a5468]">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="appearance-none bg-white border border-[#d4cfdc] rounded-md py-[7px] pl-3 pr-7 text-[#1f1330] font-medium cursor-pointer focus:outline-none focus:border-[#6a2fa0]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' stroke='%23333' stroke-width='1.5' fill='none' stroke-linecap='round'/></svg>\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px center",
            }}
          >
            {SORT_OPTIONS.map(({ label, value }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <span className="w-px h-[22px] bg-[#d4cfdc]" />

        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[#5a5468]">Carrier</span>
          {CARRIER_TOGGLES.map((c) => (
            <CarrierToggle key={c} label={c} on={activeCarriers.has(c)} onClick={() => toggleCarrier(c)} />
          ))}
        </div>
      </div>

      {/* PLANS — dark purple */}
      <section className="relative bg-[#2a0d4a] px-8 pt-8 pb-10 overflow-hidden">
        {/* radial glow overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 800px 200px at 20% 0%, rgba(120, 60, 180, 0.35), transparent 70%), radial-gradient(ellipse 600px 180px at 80% 100%, rgba(80, 30, 130, 0.4), transparent 70%)",
          }}
          aria-hidden="true"
        />
        <PlansSectionWaves />

        {/* Section meta strip */}
        {!loading && !error && filteredPlans.length > 0 && (
          <div className="relative max-w-[1180px] mx-auto mb-[18px] flex items-center justify-between text-[#d8cfe8] text-[13px] flex-wrap gap-3">
            <div className="flex items-center gap-[18px] flex-wrap">
              <span className="inline-flex items-center gap-1.5 bg-white/[0.08] border border-white/[0.12] text-[#f3edfa] px-[11px] py-[5px] rounded-full text-[12px] font-medium">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[#4ade80]"
                  style={{ boxShadow: "0 0 0 3px rgba(74, 222, 128, 0.18)" }}
                />
                Showing top {Math.min(visiblePlans.length, filteredPlans.length)} of {filteredPlans.length}
              </span>
              <span className="bg-white/[0.08] border border-white/[0.12] text-[#f3edfa] px-[11px] py-[5px] rounded-full text-[12px] font-medium">
                Ranked by {currentSortLabel}
              </span>
            </div>
            {visibleCount < filteredPlans.length && (
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="text-[#ffd5ec] text-[13px] font-medium hover:underline"
              >
                Browse all {filteredPlans.length} plans →
              </button>
            )}
          </div>
        )}

        {/* Plan grid */}
        <div className="relative max-w-[1180px] mx-auto">
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[22px] items-stretch">
              {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {error && (
            <div className="bg-white rounded-2xl">
              <EmptyState type="error" onRetry={() => loadPlans()} />
            </div>
          )}

          {!loading && !error && filteredPlans.length === 0 && (
            <div className="bg-white rounded-2xl">
              <EmptyState type="no-results" />
            </div>
          )}

          {!loading && !error && filteredPlans.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[22px] items-stretch">
              {visiblePlans.map((plan, i) => (
                <MedicarePlanCard
                  key={plan.id}
                  plan={plan}
                  tierBadges={tierBadgesByPlan.get(plan.id)}
                  isComparing={!!comparing.find((p) => p.id === plan.id)}
                  onToggleCompare={toggleCompare}
                  compareDisabled={comparing.length >= COMPARE_LIMIT && !comparing.find((p) => p.id === plan.id)}
                  showRatingDivider={i < 3}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* STICKY COMPARE TRAY */}
      <div className="sticky bottom-0 z-40 bg-[#f3f2f5] border-t border-[#e0dce6] px-8 py-3.5 flex items-center justify-between text-[13px] font-semibold tracking-[0.06em] text-[#2c2640]">
        <div className="flex items-center gap-3">
          <span>STICKY COMPARE TRAY</span>
          <span
            key={popKey}
            className="bg-[#6a2fa0] text-white rounded-full min-w-[22px] h-[22px] px-[7px] inline-flex items-center justify-center text-[12px] font-bold tracking-normal animate-[pop_200ms_ease]"
          >
            {comparing.length}
          </span>
          <span className="font-medium tracking-[0.02em] text-[#6a6378] normal-case text-[12px]">
            plans selected (max {COMPARE_LIMIT})
          </span>
        </div>
        <div className="flex items-center gap-[18px]">
          <button
            type="button"
            disabled={comparing.length < 2}
            className="bg-[#6a2fa0] text-white border-0 px-4 py-2 rounded-lg text-[12px] font-bold tracking-[0.05em] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-opacity duration-[140ms]"
          >
            COMPARE PLANS →
          </button>
          <span className="text-[#6a6378]">
            <svg width="14" height="8" viewBox="0 0 14 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M1 7l6-6 6 6" />
            </svg>
          </span>
        </div>
      </div>

      <style jsx>{`
        @keyframes pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

export default function MedicarePage() {
  return (
    <Suspense>
      <MedicareContent />
    </Suspense>
  );
}
