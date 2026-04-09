"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, Suspense } from "react";
import { parseParams } from "@/lib/params";
import type { MedicarePlanType, DrugEstimate } from "@/types/medicare";
import MedicarePlanCard from "@/components/medicare-plan-card";
import MedicationInput, { type SelectedDrug } from "@/components/medication-input";
import SkeletonCard from "@/components/skeleton-card";
import EmptyState from "@/components/empty-state";
import { useMedicareSearch } from "@/hooks/use-medicare-search";
import { useMedicareFilters, type SortOption } from "@/hooks/use-medicare-filters";

const PLAN_TYPES: { label: string; value: MedicarePlanType | "" }[] = [
  { label: "All Plans", value: "" },
  { label: "Medicare Advantage", value: "MA" },
  { label: "Supplement", value: "Supplement" },
  { label: "Part D", value: "PartD" },
];

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: "Premium: Low → High", value: "premium-asc" },
  { label: "Premium: High → Low", value: "premium-desc" },
  { label: "Star Rating: High → Low", value: "rating-desc" },
  { label: "Lowest Drug Cost", value: "drugcost-asc" },
  { label: "Alphabetical (A-Z)", value: "alpha" },
  { label: "Max OOP: Low → High", value: "moop-asc" },
  { label: "Max OOP: High → Low", value: "moop-desc" },
];

const sidebarInput =
  "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/60 focus:bg-white/10 transition-colors";
const sidebarLabel = "text-white/50 text-[11px] uppercase tracking-wider block mb-1.5 font-medium";
const sidebarSelect =
  "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#22c55e]/60 focus:bg-white/10 transition-colors appearance-none cursor-pointer";

function MedicareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const parsed = parseParams(searchParams);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Medications / drug cost estimates
  const [selectedDrugs, setSelectedDrugs] = useState<SelectedDrug[]>([]);
  const [drugEstimates, setDrugEstimates] = useState<Record<string, DrugEstimate>>({});
  const [estimatingDrugs, setEstimatingDrugs] = useState(false);

  const search = useMedicareSearch(parsed.zip);
  const filters = useMedicareFilters(search.allPlans, drugEstimates);

  const fetchDrugEstimates = useCallback(async (planIds: string[], drugs: SelectedDrug[]) => {
    if (drugs.length === 0) {
      setDrugEstimates({});
      return;
    }
    setEstimatingDrugs(true);
    try {
      const res = await fetch("/api/medicare/drugs/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planIds,
          drugs: drugs.map((d) => ({ name: d.name, rxcui: d.rxcui })),
        }),
      });
      const data = await res.json();
      setDrugEstimates(data.estimates ?? {});
    } catch {
      setDrugEstimates({});
    } finally {
      setEstimatingDrugs(false);
    }
  }, []);

  useEffect(() => {
    if (search.allPlans.length > 0 && selectedDrugs.length > 0) {
      fetchDrugEstimates(search.allPlans.map((p) => p.id), selectedDrugs);
    } else {
      setDrugEstimates({});
    }
  }, [search.allPlans, selectedDrugs, fetchDrugEstimates]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.replace(`/medicare?${new URLSearchParams({ zip: search.zip }).toString()}`);
    search.loadPlans(search.zip);
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
          <div>
            <p className="text-white/70 font-semibold text-xs uppercase tracking-widest mb-4">Your Info</p>
            <div>
              <label className={sidebarLabel}>ZIP Code</label>
              <input value={search.zip} onChange={(e) => search.setZip(e.target.value)} className={sidebarInput} placeholder="33334" />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#22c55e] text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-green-400 transition-colors shadow-[0_0_16px_rgba(34,197,94,0.2)] cursor-pointer"
          >
            Search Plans
          </button>

          {/* My Medications */}
          {search.allPlans.length > 0 && (
            <div className="pt-3 border-t border-white/10 space-y-2">
              <p className="text-white/70 font-semibold text-xs uppercase tracking-widest">My Medications</p>
              <MedicationInput
                selectedDrugs={selectedDrugs}
                onAdd={(drug) => setSelectedDrugs((prev) => [...prev, drug])}
                onRemove={(rxcui) => setSelectedDrugs((prev) => prev.filter((d) => d.rxcui !== rxcui))}
                loading={estimatingDrugs}
              />
            </div>
          )}

          {/* Filters section */}
          {search.allPlans.length > 0 && (
            <div className="pt-3 border-t border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-white/70 font-semibold text-xs uppercase tracking-widest">Filters</p>
                {filters.activeFilterCount > 0 && (
                  <button type="button" onClick={filters.clearAll} className="text-[#22c55e] text-[11px] font-medium hover:text-green-300 cursor-pointer">
                    Clear all ({filters.activeFilterCount})
                  </button>
                )}
              </div>

              <div>
                <label className={sidebarLabel}>Carrier</label>
                <select value={filters.carrierFilter} onChange={(e) => filters.setCarrierFilter(e.target.value)} className={sidebarSelect}>
                  <option value="" className="bg-[#1e0f36] text-white">All Carriers</option>
                  {filters.carriers.map((c) => (
                    <option key={c} value={c} className="bg-[#1e0f36] text-white">{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={filters.zeroPremiumOnly}
                      onChange={(e) => filters.setZeroPremiumOnly(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/10 rounded-full peer-checked:bg-[#22c55e] transition-colors" />
                    <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-sm" />
                  </div>
                  <span className="text-white/60 text-sm font-medium group-hover:text-white/80 transition-colors">$0 Premium Only</span>
                </label>
              </div>

              <div>
                <label className={sidebarLabel}>Sort By</label>
                <select value={filters.sortBy} onChange={(e) => filters.setSortBy(e.target.value as SortOption)} className={sidebarSelect}>
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
          {!search.loading && !search.error && (
            <p className="text-white/40 text-sm mt-1">
              {filters.filteredPlans.length} plan{filters.filteredPlans.length !== 1 ? "s" : ""}
              {filters.activeFilterCount > 0 ? ` (filtered from ${search.allPlans.length})` : " available"}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {PLAN_TYPES.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => filters.setPlanTypeFilter(value)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-150 cursor-pointer ${
                filters.planTypeFilter === value
                  ? "bg-[#22c55e] text-white shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                  : "border border-white/20 text-white/60 hover:border-white/40 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {search.loading && [1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        {search.error && <EmptyState type="error" onRetry={() => search.loadPlans()} />}
        {!search.loading && !search.error && filters.filteredPlans.length === 0 && <EmptyState type="no-results" />}

        {!search.loading && !search.error && filters.filteredPlans.length > 0 && (
          <div className="space-y-4">
            {filters.visiblePlans.map((plan, i) => (
              <MedicarePlanCard
                key={plan.id}
                plan={plan}
                isFeatured={i === 0 && filters.sortBy === "premium-asc"}
                drugEstimate={drugEstimates[plan.id]}
              />
            ))}
            {filters.visibleCount < filters.filteredPlans.length && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={filters.loadMore}
                  className="px-8 py-2.5 rounded-lg border border-white/20 text-white/70 text-sm font-medium hover:border-white/40 hover:text-white transition-colors cursor-pointer"
                >
                  Load More ({filters.visiblePlans.length} of {filters.filteredPlans.length})
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
