"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { parseParams } from "@/lib/params";
import { fetchMedicarePlans } from "@/lib/medicare/adapter";
import type { MedicarePlan, MedicarePlanType } from "@/types/medicare";
import MedicarePlanCard from "@/components/medicare-plan-card";
import SkeletonCard from "@/components/skeleton-card";
import EmptyState from "@/components/empty-state";

const PLAN_TYPES: { label: string; value: MedicarePlanType | "" }[] = [
  { label: "All Plans", value: "" },
  { label: "Medicare Advantage", value: "MA" },
  { label: "Supplement", value: "Supplement" },
  { label: "Part D", value: "PartD" },
];

const sidebarInput =
  "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/60 focus:bg-white/10 transition-colors";

const sidebarLabel = "text-white/50 text-[11px] uppercase tracking-wider block mb-1.5 font-medium";

function MedicareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const parsed = parseParams(searchParams);

  const [zip, setZip] = useState(parsed.zip);
  const [planTypeFilter, setPlanTypeFilter] = useState<MedicarePlanType | "">("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [plans, setPlans] = useState<MedicarePlan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function loadPlans(currentZip = zip, currentType = planTypeFilter) {
    setLoading(true);
    setError(false);
    setPage(1);
    try {
      const result = await fetchMedicarePlans({ zip: currentZip, planType: currentType || undefined, page: 1 });
      setPlans(result.plans);
      setTotal(result.total);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const result = await fetchMedicarePlans({ zip, planType: planTypeFilter || undefined, page: nextPage });
      setPlans((prev) => [...prev, ...result.plans]);
      setPage(nextPage);
      setTotal(result.total);
    } catch {
      // silently fail
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    loadPlans();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ zip });
    router.replace(`/medicare?${params.toString()}`);
    loadPlans(zip, planTypeFilter);
  }

  function handleTypeFilter(type: MedicarePlanType | "") {
    setPlanTypeFilter(type);
    loadPlans(zip, type);
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside
        className={`w-full lg:w-72 shrink-0 bg-[#1e0f36]/80 backdrop-blur-md border-r border-white/[0.07] p-5 ${
          sidebarOpen ? "block" : "hidden"
        } lg:block`}
      >
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <p className="text-white/70 font-semibold text-xs uppercase tracking-widest mb-4">Your Info</p>
            <div>
              <label className={sidebarLabel}>ZIP Code</label>
              <input value={zip} onChange={(e) => setZip(e.target.value)} className={sidebarInput} placeholder="33334" />
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-[#22c55e] text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-green-400 transition-colors shadow-[0_0_16px_rgba(34,197,94,0.2)] cursor-pointer"
          >
            Search Plans
          </button>
        </form>
      </aside>

      {/* Results */}
      <main className="flex-1 p-6">
        <button
          className="lg:hidden mb-5 flex items-center gap-2 text-white/60 text-sm border border-white/15 rounded-lg px-3 py-2 hover:border-white/30 hover:text-white/80 transition-colors cursor-pointer"
          onClick={() => setSidebarOpen((o) => !o)}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" />
          </svg>
          {sidebarOpen ? "Hide Filters" : "Show Filters"}
        </button>

        <div className="mb-5">
          <h1 className="text-white text-2xl font-bold tracking-tight">Find Your Best Medicare Plan</h1>
          {!loading && !error && (
            <p className="text-white/40 text-sm mt-1">{total} plan{total !== 1 ? "s" : ""} available</p>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {PLAN_TYPES.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => handleTypeFilter(value)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-150 cursor-pointer ${
                planTypeFilter === value
                  ? "bg-[#22c55e] text-white shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                  : "border border-white/20 text-white/60 hover:border-white/40 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && [1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        {error && <EmptyState type="error" onRetry={() => loadPlans()} />}
        {!loading && !error && plans.length === 0 && <EmptyState type="no-results" />}

        {!loading && !error && (
          <div className="space-y-4">
            {plans.map((plan, i) => (
              <MedicarePlanCard
                key={plan.id}
                isFeatured={i === 0}
                planNumber={plan.id}
                planName={plan.name}
                carrier={plan.carrier}
                planType={plan.type}
                monthlyPremium={plan.premium_monthly}
                highlights={plan.highlights}
              />
            ))}
            {plans.length < total && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-8 py-2.5 rounded-lg border border-white/20 text-white/70 text-sm font-medium hover:border-white/40 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loadingMore ? "Loading..." : `Load More (${plans.length} of ${total})`}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
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
