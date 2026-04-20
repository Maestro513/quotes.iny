"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { parseParams } from "@/lib/params";
import type { MetalTier, PlanType } from "@/types/under65";
import PlanCard from "@/components/plan-card";
import SkeletonCard from "@/components/skeleton-card";
import EmptyState from "@/components/empty-state";
import Pagination from "@/components/pagination";
import CoverageSearch from "@/components/coverage-search";
import { usePlanSearch } from "@/hooks/use-plan-search";
import { usePlanFilters } from "@/hooks/use-plan-filters";
import { useCoverageCheck } from "@/hooks/use-coverage-check";

const METAL_TIERS: MetalTier[] = ["Bronze", "Silver", "Gold", "Platinum", "Catastrophic"];
const PLAN_TYPES: PlanType[] = ["HMO", "PPO", "EPO", "POS"];
const SORT_OPTIONS = [
  { label: "Lowest Premium", value: "premium-asc" },
  { label: "Highest Premium", value: "premium-desc" },
  { label: "Lowest Deductible", value: "deductible-asc" },
  { label: "Lowest OOP Max", value: "oop-asc" },
];

const sidebarInput =
  "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/60 focus:bg-white/10 transition-colors";
const sidebarLabel = "text-white/50 text-[11px] uppercase tracking-wider block mb-1.5 font-medium";
const sectionTitle = "text-white/70 font-semibold text-xs uppercase tracking-widest mb-3";
const divider = "border-t border-white/[0.07] pt-4";

// Filter-bar specific (compact horizontal layout above results) — off-white surface
const filterBarInput =
  "bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#22c55e]/60 transition-colors";
const filterBarLabel = "text-gray-500 text-[10px] uppercase tracking-wider block mb-1 font-medium";

function CheckPill({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 cursor-pointer ${
        checked
          ? "bg-[#22c55e]/15 border-[#22c55e] text-[#15803d]"
          : "bg-white border-gray-300 text-gray-700 hover:border-gray-500 hover:text-gray-900"
      }`}
    >
      {label}
    </button>
  );
}

function Under65Content() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const parsed = parseParams(searchParams);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const search = usePlanSearch({
    zip: parsed.zip, dob: parsed.dob, gender: parsed.gender, income: parsed.income,
    tobacco: false, householdSize: 1, coverageStart: "",
  });

  const filters = usePlanFilters(search.allPlans);

  const coverage = useCoverageCheck(search.allPlans.map((p) => p.id));

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const { zip, dob, gender, income } = search.params;
    router.replace(`/under-65?${new URLSearchParams({ zip, dob, gender, income }).toString()}`);
    search.loadPlans();
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar — search form only */}
      <aside
        className={`w-full lg:w-72 shrink-0 bg-[#1e0f36]/80 backdrop-blur-md border-r border-white/[0.07] p-5 overflow-y-auto ${
          sidebarOpen ? "block" : "hidden"
        } lg:block`}
      >
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <p className={sectionTitle}>Your Info</p>
            <div className="space-y-3">
              <div>
                <label className={sidebarLabel}>ZIP Code</label>
                <input value={search.params.zip} onChange={(e) => search.setParams((p) => ({ ...p, zip: e.target.value }))} className={sidebarInput} placeholder="33334" />
              </div>
              <div>
                <label className={sidebarLabel}>Date of Birth</label>
                <input type="date" value={search.params.dob} onChange={(e) => search.setParams((p) => ({ ...p, dob: e.target.value }))} className={sidebarInput} />
              </div>
              <div>
                <label className={sidebarLabel}>Gender</label>
                <select value={search.params.gender} onChange={(e) => search.setParams((p) => ({ ...p, gender: e.target.value }))} className={sidebarInput}>
                  <option value="" className="bg-[#1e0f36] text-white">Select</option>
                  <option value="male" className="bg-[#1e0f36] text-white">Male</option>
                  <option value="female" className="bg-[#1e0f36] text-white">Female</option>
                  <option value="other" className="bg-[#1e0f36] text-white">Other</option>
                </select>
              </div>
              <div>
                <label className={sidebarLabel}>Household Income</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                  <input
                    type="number"
                    min={0}
                    value={search.params.income}
                    onChange={(e) => search.setParams((p) => ({ ...p, income: e.target.value }))}
                    className={sidebarInput + " pl-7"}
                    placeholder="e.g. 45000"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={divider}>
            <p className={sectionTitle}>Plan Details</p>
            <div className="space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input type="checkbox" checked={search.params.tobacco} onChange={(e) => search.setParams((p) => ({ ...p, tobacco: e.target.checked }))} className="w-4 h-4 accent-[#22c55e]" />
                <span className="text-white/60 text-sm group-hover:text-white/80 transition-colors">Tobacco use</span>
              </label>
              <div>
                <label className={sidebarLabel}>Household Size</label>
                <input type="number" min={1} max={20} value={search.params.householdSize} onChange={(e) => search.setParams((p) => ({ ...p, householdSize: Number(e.target.value) }))} className={sidebarInput} />
              </div>
              <div>
                <label className={sidebarLabel}>Coverage Start Date</label>
                <input type="date" value={search.params.coverageStart} onChange={(e) => search.setParams((p) => ({ ...p, coverageStart: e.target.value }))} className={sidebarInput} />
              </div>
            </div>
          </div>

          <button type="submit" className="w-full bg-[#22c55e] text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-green-400 transition-colors shadow-[0_0_16px_rgba(34,197,94,0.2)] cursor-pointer">
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
          {sidebarOpen ? "Hide Search" : "Edit Search"}
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-[26px] font-semibold tracking-tight leading-tight">Find Your Best Health Plan</h1>
            {!search.loading && !search.error && search.allPlans.length > 0 && (
              <p className="text-white/55 text-sm mt-1.5 flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-white">
                  {filters.filteredPlans.length} of {search.allPlans.length} plan{search.allPlans.length !== 1 ? "s" : ""}
                </span>
                {filters.activeFilterCount > 0 && (
                  <>
                    <span className="w-[3px] h-[3px] rounded-full bg-current opacity-40" />
                    <span>match your filters</span>
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Top filter bar — sort + filters (moved from sidebar) */}
        <div className="mb-6 bg-[#f5f1ec] border border-black/5 rounded-xl p-4 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[170px]">
              <label className={filterBarLabel}>Sort By</label>
              <select value={filters.sortBy} onChange={(e) => filters.setSortBy(e.target.value)} className={filterBarInput + " w-full"}>
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value} className="bg-[#1e0f36] text-white">{o.label}</option>)}
              </select>
            </div>

            <div>
              <label className={filterBarLabel}>Metal Tier</label>
              <div className="flex flex-wrap gap-1.5">
                {METAL_TIERS.map((tier) => (
                  <CheckPill key={tier} label={tier} checked={filters.metalFilter.includes(tier)} onChange={() => filters.toggleMetal(tier)} />
                ))}
              </div>
            </div>

            <div>
              <label className={filterBarLabel}>Plan Type</label>
              <div className="flex flex-wrap gap-1.5">
                {PLAN_TYPES.map((type) => (
                  <CheckPill key={type} label={type} checked={filters.typeFilter.includes(type)} onChange={() => filters.toggleType(type)} />
                ))}
              </div>
            </div>

            <div className="w-[160px]">
              <label className={filterBarLabel}>Max Monthly Premium</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                <input
                  type="number" min={0} value={filters.maxPremium}
                  onChange={(e) => filters.setMaxPremium(e.target.value)}
                  className={filterBarInput + " pl-7 w-full"}
                  placeholder="No limit"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer group self-center mt-3">
              <input type="checkbox" checked={filters.hsaOnly} onChange={(e) => filters.setHsaOnly(e.target.checked)} className="w-4 h-4 accent-[#22c55e]" />
              <span className="text-gray-700 text-sm group-hover:text-gray-900 transition-colors">HSA eligible</span>
            </label>

            {filters.activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  filters.clearAll();
                  coverage.clearDoctor(() => {});
                  coverage.clearDrug(() => {});
                }}
                className="ml-auto text-xs text-gray-600 hover:text-gray-900 bg-white border border-gray-300 hover:border-gray-500 rounded-lg px-3 py-2 transition-colors cursor-pointer self-center mt-3"
              >
                Clear all ({filters.activeFilterCount})
              </button>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4 pt-3 border-t border-black/[0.08]">
            <div>
              <label className={filterBarLabel}>Find My Doctor</label>
              <CoverageSearch
                type="provider"
                zip={search.params.zip}
                selectedId={coverage.doctorNpi}
                selectedLabel={coverage.doctorLabel}
                selectedAddress={coverage.doctorAddress}
                loading={coverage.doctorLoading}
                onSelect={(npi, label) => coverage.handleDoctorSelect(npi, label, filters.setDoctorCoveredIds)}
                onClear={() => coverage.clearDoctor(() => filters.setDoctorCoveredIds(null))}
              />
            </div>
            <div>
              <label className={filterBarLabel}>Find My Medication</label>
              <CoverageSearch
                type="drug"
                zip={search.params.zip}
                selectedId={coverage.drugRxcui}
                selectedLabel={coverage.drugLabel}
                loading={coverage.drugLoading}
                onSelect={(rxcui, label) => coverage.handleDrugSelect(rxcui, label, filters.setDrugCoveredIds)}
                onClear={() => coverage.clearDrug(() => filters.setDrugCoveredIds(null))}
              />
            </div>
          </div>
        </div>

        {search.loading && [1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        {search.error && <EmptyState type="error" onRetry={() => search.loadPlans()} />}
        {!search.loading && !search.error && filters.filteredPlans.length === 0 && (
          <EmptyState type="no-results" />
        )}

        {!search.loading && !search.error && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filters.pagePlans.map((plan, i) => (
              <PlanCard
                key={plan.id}
                isFeatured={filters.page === 1 && i === 0}
                planName={plan.name}
                carrier={plan.carrier}
                metalTier={plan.metalTier}
                planType={plan.planType}
                hsaEligible={plan.hsaEligible}
                monthlyPremium={plan.netPremium}
                estimatedSubsidy={plan.estimatedSubsidy}
                deductible={plan.deductible}
                outOfPocketMax={plan.outOfPocketMax}
                benefits={plan.benefits}
              />
            ))}
          </div>
        )}

        {!search.loading && !search.error && (
          <Pagination
            page={filters.page}
            totalPages={filters.totalPages}
            total={filters.filteredPlans.length}
            pageSize={filters.PAGE_SIZE}
            onChange={(p) => { filters.setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          />
        )}
      </main>
    </div>
  );
}

export default function Under65Page() {
  return (
    <Suspense>
      <Under65Content />
    </Suspense>
  );
}
