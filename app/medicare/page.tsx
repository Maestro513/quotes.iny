"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo, Suspense } from "react";
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

type SortOption = "premium-asc" | "premium-desc" | "alpha" | "moop-asc" | "moop-desc";

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: "Premium: Low → High", value: "premium-asc" },
  { label: "Premium: High → Low", value: "premium-desc" },
  { label: "Alphabetical (A-Z)", value: "alpha" },
  { label: "Max OOP: Low → High", value: "moop-asc" },
  { label: "Max OOP: High → Low", value: "moop-desc" },
];

const PAGE_SIZE = 20;

const sidebarInput =
  "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/60 focus:bg-white/10 transition-colors";

const sidebarLabel = "text-white/50 text-[11px] uppercase tracking-wider block mb-1.5 font-medium";

const sidebarSelect =
  "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#22c55e]/60 focus:bg-white/10 transition-colors appearance-none cursor-pointer";

function MedicareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const parsed = parseParams(searchParams);

  const [zip, setZip] = useState(parsed.zip);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // All plans from API (unfiltered)
  const [allPlans, setAllPlans] = useState<MedicarePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filters
  const [planTypeFilter, setPlanTypeFilter] = useState<MedicarePlanType | "">("");
  const [carrierFilter, setCarrierFilter] = useState("");
  const [zeroPremiumOnly, setZeroPremiumOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("premium-asc");

  // Pagination
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Unique carriers from loaded plans
  const carriers = useMemo(() => {
    const set = new Set(allPlans.map((p) => p.carrier));
    return [...set].sort();
  }, [allPlans]);

  // Filtered + sorted plans
  const filteredPlans = useMemo(() => {
    let result = allPlans;

    if (planTypeFilter) result = result.filter((p) => p.type === planTypeFilter);
    if (carrierFilter) result = result.filter((p) => p.carrier === carrierFilter);
    if (zeroPremiumOnly) result = result.filter((p) => p.premium_monthly === 0);

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "premium-asc": return a.premium_monthly - b.premium_monthly;
        case "premium-desc": return b.premium_monthly - a.premium_monthly;
        case "alpha": return a.name.localeCompare(b.name);
        case "moop-asc": return a.outOfPocketMax - b.outOfPocketMax;
        case "moop-desc": return b.outOfPocketMax - a.outOfPocketMax;
        default: return 0;
      }
    });

    return result;
  }, [allPlans, planTypeFilter, carrierFilter, zeroPremiumOnly, sortBy]);

  const visiblePlans = filteredPlans.slice(0, visibleCount);

  // Count active filters
  const activeFilterCount = [planTypeFilter, carrierFilter, zeroPremiumOnly].filter(Boolean).length;

  async function loadPlans(currentZip = zip) {
    setLoading(true);
    setError(false);
    setVisibleCount(PAGE_SIZE);
    try {
      // Fetch all pages
      const first = await fetchMedicarePlans({ zip: currentZip, page: 1 });
      let plans = first.plans;
      const totalPlans = first.total;

      // If there are more pages, fetch them
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

  function clearFilters() {
    setPlanTypeFilter("");
    setCarrierFilter("");
    setZeroPremiumOnly(false);
    setSortBy("premium-asc");
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside
        className={`w-full lg:w-72 shrink-0 bg-[#1e0f36]/80 backdrop-blur-md border-r border-white/[0.07] p-5 ${
          sidebarOpen ? "block" : "hidden"
        } lg:block`}
      >
        <form onSubmit={handleSearch} className="space-y-5">
          {/* ZIP */}
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

          {/* Filters section */}
          {allPlans.length > 0 && (
            <div className="pt-3 border-t border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-white/70 font-semibold text-xs uppercase tracking-widest">Filters</p>
                {activeFilterCount > 0 && (
                  <button type="button" onClick={clearFilters} className="text-[#22c55e] text-[11px] font-medium hover:text-green-300 cursor-pointer">
                    Clear all ({activeFilterCount})
                  </button>
                )}
              </div>

              {/* Carrier */}
              <div>
                <label className={sidebarLabel}>Carrier</label>
                <select value={carrierFilter} onChange={(e) => setCarrierFilter(e.target.value)} className={sidebarSelect}>
                  <option value="" className="bg-[#1e0f36] text-white">All Carriers</option>
                  {carriers.map((c) => (
                    <option key={c} value={c} className="bg-[#1e0f36] text-white">{c}</option>
                  ))}
                </select>
              </div>

              {/* $0 Premium Toggle */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={zeroPremiumOnly}
                      onChange={(e) => setZeroPremiumOnly(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/10 rounded-full peer-checked:bg-[#22c55e] transition-colors" />
                    <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-sm" />
                  </div>
                  <span className="text-white/60 text-sm font-medium group-hover:text-white/80 transition-colors">$0 Premium Only</span>
                </label>
              </div>

              {/* Sort */}
              <div>
                <label className={sidebarLabel}>Sort By</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className={sidebarSelect}>
                  {SORT_OPTIONS.map(({ label, value }) => (
                    <option key={value} value={value} className="bg-[#1e0f36] text-white">{label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
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
            <p className="text-white/40 text-sm mt-1">
              {filteredPlans.length} plan{filteredPlans.length !== 1 ? "s" : ""}
              {activeFilterCount > 0 ? ` (filtered from ${allPlans.length})` : " available"}
            </p>
          )}
        </div>

        {/* Plan type pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {PLAN_TYPES.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setPlanTypeFilter(value)}
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
        {!loading && !error && filteredPlans.length === 0 && <EmptyState type="no-results" />}

        {!loading && !error && filteredPlans.length > 0 && (
          <div className="space-y-4">
            {visiblePlans.map((plan, i) => (
              <MedicarePlanCard
                key={plan.id}
                plan={plan}
                isFeatured={i === 0 && sortBy === "premium-asc"}
              />
            ))}
            {visibleCount < filteredPlans.length && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="px-8 py-2.5 rounded-lg border border-white/20 text-white/70 text-sm font-medium hover:border-white/40 hover:text-white transition-colors cursor-pointer"
                >
                  Load More ({visiblePlans.length} of {filteredPlans.length})
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
