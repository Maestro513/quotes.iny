"use client";

import "./medicare.css"; // keep — MedicarePlanCard depends on .plan-card / .card-top classes

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, Suspense } from "react";
import { parseParams } from "@/lib/params";
import type { DrugEstimate, MedicareNetworkType } from "@/types/medicare";
import MedicarePlanCard from "@/components/medicare-plan-card";
import MedicationInput, { type SelectedDrug } from "@/components/medication-input";
import EmptyState from "@/components/empty-state";
import { useMedicareSearch } from "@/hooks/use-medicare-search";
import { useMedicareFilters, type QuickPreset } from "@/hooks/use-medicare-filters";

const NETWORK_PILLS: MedicareNetworkType[] = ["HMO", "PPO", "HMO-POS", "PFFS"];
const BENEFIT_OPTIONS: { key: string; label: string }[] = [
  { key: "giveback", label: "Giveback" },
  { key: "otc", label: "OTC" },
  { key: "dental", label: "Dental" },
  { key: "vision", label: "Vision" },
  { key: "hearing", label: "Hearing" },
];
const PRESET_TABS: { key: QuickPreset; label: string }[] = [
  { key: "all", label: "All Plans" },
  { key: "zero-premium", label: "$0 Premium" },
  { key: "highly-rated", label: "Highly Rated" },
  { key: "low-moop", label: "Low MOOP" },
  { key: "with-giveback", label: "With Giveback" },
  { key: "high-otc", label: "High OTC" },
  { key: "ppo", label: "PPO" },
];
const SORT_OPTIONS = [
  { label: "Lowest Premium", value: "premium-asc" },
  { label: "Highest Premium", value: "premium-desc" },
  { label: "Lowest MOOP", value: "moop-asc" },
  { label: "CMS Stars", value: "rating-desc" },
  { label: "A–Z", value: "alpha" },
];

const sidebarInput =
  "w-full bg-white/10 border border-white/15 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-[#22c55e]/60 focus:bg-white/15 transition-colors";
const sidebarLabel = "text-white/60 text-[11px] uppercase tracking-wider block mb-1.5 font-medium";
const sectionTitle = "text-white/80 font-semibold text-xs uppercase tracking-widest mb-3";
const divider = "border-t border-white/[0.10] pt-4";

function Pill({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 cursor-pointer ${
        checked
          ? "bg-[#22c55e]/20 border-[#22c55e]/60 text-[#22c55e]"
          : "border-white/20 text-white/60 hover:border-white/40 hover:text-white/90"
      }`}
    >
      {label}
    </button>
  );
}

function MedicareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const parsed = parseParams(searchParams);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [medsOpen, setMedsOpen] = useState(false);
  const [selectedDrugs, setSelectedDrugs] = useState<SelectedDrug[]>([]);
  const [drugEstimates, setDrugEstimates] = useState<Record<string, DrugEstimate>>({});
  const [estimatingDrugs, setEstimatingDrugs] = useState(false);

  const search = useMedicareSearch(parsed.zip);
  const filters = useMedicareFilters(search.allPlans, drugEstimates);

  const fetchDrugEstimates = useCallback(async (planIds: string[], drugs: SelectedDrug[]) => {
    if (drugs.length === 0) { setDrugEstimates({}); return; }
    setEstimatingDrugs(true);
    try {
      const res = await fetch("/api/medicare/drugs/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planIds, drugs: drugs.map((d) => ({ name: d.name, rxcui: d.rxcui })) }),
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

  const totalInArea = search.allPlans.length;

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar — search + individual filters */}
      <aside
        className={`w-full lg:w-80 shrink-0 bg-[#1e0f36]/80 backdrop-blur-md border-r border-white/[0.10] p-5 overflow-y-auto ${
          sidebarOpen ? "block" : "hidden"
        } lg:block`}
      >
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <p className={sectionTitle}>Your Search</p>
            <div className="space-y-3">
              <div>
                <label htmlFor="zip-input" className={sidebarLabel}>ZIP Code</label>
                <input
                  id="zip-input"
                  type="text"
                  value={search.zip}
                  onChange={(e) => search.setZip(e.target.value)}
                  className={sidebarInput}
                  placeholder="33334"
                  maxLength={5}
                  inputMode="numeric"
                  pattern="[0-9]{5}"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#22c55e] text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-green-400 transition-colors shadow-[0_0_16px_rgba(34,197,94,0.25)] cursor-pointer"
          >
            Search Plans
          </button>

          <button
            type="button"
            onClick={() => setMedsOpen((o) => !o)}
            className="w-full text-white/70 text-sm border border-white/20 hover:border-white/40 hover:text-white/90 rounded-lg py-2 transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            {medsOpen ? "Hide medications" : "Add medications"}
          </button>

          {medsOpen && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <div className="text-white/60 text-[11px] uppercase tracking-wider mb-2">Medications</div>
              <MedicationInput
                selectedDrugs={selectedDrugs}
                onAdd={(d) => setSelectedDrugs((p) => [...p, d])}
                onRemove={(rxcui) => setSelectedDrugs((p) => p.filter((x) => x.rxcui !== rxcui))}
                loading={estimatingDrugs}
              />
            </div>
          )}
        </form>

        {/* Individual filters — carrier / premium / plan type / benefits */}
        <div className="mt-5 space-y-4">
          <div className={divider}>
            <p className={sectionTitle}>Plan Type</p>
            <div className="flex flex-wrap gap-1.5">
              <Pill label="Any" checked={filters.networkTypeFilter === ""} onClick={() => filters.setNetworkTypeFilter("")} />
              {NETWORK_PILLS.map((n) => (
                <Pill
                  key={n}
                  label={n}
                  checked={filters.networkTypeFilter === n}
                  onClick={() => filters.setNetworkTypeFilter(filters.networkTypeFilter === n ? "" : n)}
                />
              ))}
            </div>
          </div>

          <div className={divider}>
            <label className={sidebarLabel}>Max Monthly Premium</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">$</span>
              <input
                type="number"
                min={0}
                value={filters.maxPremium ?? ""}
                onChange={(e) => filters.setMaxPremium(e.target.value ? parseInt(e.target.value) : null)}
                className={sidebarInput + " pl-7"}
                placeholder="No limit"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer group mt-2.5">
              <input
                type="checkbox"
                checked={filters.zeroPremiumOnly}
                onChange={(e) => filters.setZeroPremiumOnly(e.target.checked)}
                className="w-4 h-4 accent-[#22c55e]"
              />
              <span className="text-white/70 text-sm group-hover:text-white transition-colors">$0 Premium only</span>
            </label>
          </div>

          <div className={divider}>
            <p className={sectionTitle}>Benefits Must Include</p>
            <div className="flex flex-wrap gap-1.5">
              {BENEFIT_OPTIONS.map((b) => (
                <Pill
                  key={b.key}
                  label={b.label}
                  checked={filters.requiredBenefits.has(b.key)}
                  onClick={() => {
                    const next = new Set(filters.requiredBenefits);
                    if (next.has(b.key)) next.delete(b.key);
                    else next.add(b.key);
                    filters.setRequiredBenefits(next);
                  }}
                />
              ))}
            </div>
          </div>

          {filters.carriers.length > 0 && (
            <div className={divider}>
              <p className={sectionTitle}>Carrier</p>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {filters.carriers.map((c) => (
                  <label key={c} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={filters.carrierFilter.includes(c)}
                      onChange={(e) => {
                        if (e.target.checked) filters.setCarrierFilter([...filters.carrierFilter, c]);
                        else filters.setCarrierFilter(filters.carrierFilter.filter((x) => x !== c));
                      }}
                      className="w-4 h-4 accent-[#22c55e] shrink-0"
                    />
                    <span className="text-white/75 text-sm group-hover:text-white transition-colors truncate">{c}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {filters.activeFilterCount > 0 && (
            <button
              type="button"
              onClick={filters.clearAll}
              className="w-full text-xs text-white/60 hover:text-white border border-white/15 hover:border-white/30 rounded-lg py-2 transition-colors cursor-pointer"
            >
              Clear all filters ({filters.activeFilterCount})
            </button>
          )}
        </div>
      </aside>

      {/* Results */}
      <main className="flex-1 p-6">
        <button
          className="lg:hidden mb-5 flex items-center gap-2 text-white/70 text-sm border border-white/20 rounded-lg px-3 py-2 hover:border-white/40 hover:text-white/90 transition-colors cursor-pointer"
          onClick={() => setSidebarOpen((o) => !o)}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" />
          </svg>
          {sidebarOpen ? "Hide Search" : `Edit Search${filters.activeFilterCount ? ` (${filters.activeFilterCount})` : ""}`}
        </button>

        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-white text-[26px] font-semibold tracking-tight leading-tight">Find Your Best Medicare Plan</h1>
            <p className="text-white/55 text-sm mt-1.5 flex items-center gap-2 flex-wrap">
              {search.loading ? (
                "Loading plans…"
              ) : search.allPlans.length > 0 ? (
                <>
                  <span className="font-semibold text-white">
                    {filters.filteredPlans.length} plan{filters.filteredPlans.length !== 1 ? "s" : ""}
                  </span>
                  <span className="w-[3px] h-[3px] rounded-full bg-current opacity-40" />
                  <span>
                    {filters.activeFilterCount || filters.quickPreset !== "all"
                      ? `filtered from ${totalInArea}`
                      : "available in your area"}
                  </span>
                  <span className="w-[3px] h-[3px] rounded-full bg-current opacity-40" />
                  <span>2026 plan year</span>
                </>
              ) : (
                "Enter a ZIP to see plans"
              )}
            </p>
          </div>
          {search.zip && (
            <div className="text-white/75 text-sm bg-white/5 border border-white/10 rounded-lg px-3.5 py-2 whitespace-nowrap flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              ZIP <strong className="text-white">{search.zip}</strong>
            </div>
          )}
        </div>

        {/* Top bar — off-white surface with quick-preset tabs + sort */}
        <div className="mb-6 bg-[#f5f1ec] border border-black/5 rounded-xl p-4 space-y-3 shadow-sm">
          <div className="flex flex-wrap gap-1.5" role="tablist">
            {PRESET_TABS.map(({ key, label }) => {
              const count = filters.presetCounts[key];
              const active = filters.quickPreset === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => filters.setQuickPreset(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 cursor-pointer ${
                    active
                      ? "bg-[#22c55e] border-[#22c55e] text-white shadow-[0_2px_8px_rgba(34,197,94,0.25)]"
                      : "bg-white border-gray-300 text-gray-700 hover:border-gray-500 hover:text-gray-900 hover:-translate-y-0.5"
                  }`}
                >
                  {label} <span className="opacity-70 font-normal">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-black/[0.08]">
            <label className="text-gray-500 text-[11px] uppercase tracking-wider font-medium">Sort by</label>
            <select
              value={filters.sortBy}
              onChange={(e) => filters.setSortBy(e.target.value as typeof filters.sortBy)}
              className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-gray-800 text-sm focus:outline-none focus:border-[#22c55e]/60"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-white text-gray-800">{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {search.loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-white/[0.03] border border-white/10 rounded-xl animate-pulse" />
            ))}
          </div>
        )}
        {search.error && <EmptyState type="error" onRetry={() => search.loadPlans()} />}
        {!search.loading && !search.error && filters.filteredPlans.length === 0 && search.zip && (
          <EmptyState type="no-results" />
        )}

        {!search.loading && !search.error && filters.filteredPlans.length > 0 && (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filters.visiblePlans.map((plan) => (
                <MedicarePlanCard key={plan.id} plan={plan} drugEstimate={drugEstimates[plan.id]} />
              ))}
            </div>
            {filters.visibleCount < filters.filteredPlans.length && (
              <div className="flex justify-center mt-6">
                <button
                  type="button"
                  onClick={filters.loadMore}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-white/20 text-white/80 hover:border-white/40 hover:text-white transition-colors cursor-pointer"
                >
                  Load more ({filters.visiblePlans.length} of {filters.filteredPlans.length})
                </button>
              </div>
            )}
          </>
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
