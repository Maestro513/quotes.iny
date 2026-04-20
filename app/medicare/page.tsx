"use client";

import "./medicare.css";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { parseParams } from "@/lib/params";
import type { DrugEstimate, MedicareNetworkType } from "@/types/medicare";
import MedicarePlanCard from "@/components/medicare-plan-card";
import MedicationInput, { type SelectedDrug } from "@/components/medication-input";
import EmptyState from "@/components/empty-state";
import { useMedicareSearch } from "@/hooks/use-medicare-search";
import { useMedicareFilters, type QuickPreset } from "@/hooks/use-medicare-filters";

const NETWORK_OPTIONS: { label: string; value: MedicareNetworkType | "" }[] = [
  { label: "Any type", value: "" },
  { label: "HMO only", value: "HMO" },
  { label: "PPO only", value: "PPO" },
  { label: "HMO-POS", value: "HMO-POS" },
];

const MOOP_BUCKETS = [
  { label: "Any MOOP", value: null },
  { label: "Under $3,000", value: 3000 },
  { label: "Under $5,000", value: 5000 },
  { label: "Under $7,000", value: 7000 },
] as const;

const BENEFIT_OPTIONS: { key: string; label: string }[] = [
  { key: "giveback", label: "Part B giveback" },
  { key: "otc", label: "OTC allowance" },
  { key: "dental", label: "Dental" },
  { key: "vision", label: "Vision" },
  { key: "hearing", label: "Hearing" },
];

const PRESET_TABS: { key: QuickPreset; label: string }[] = [
  { key: "all", label: "All Plans" },
  { key: "zero-premium", label: "$0 Premium" },
  { key: "highly-rated", label: "Highly Rated (4.5+★)" },
  { key: "low-moop", label: "Low MOOP <$5k" },
  { key: "with-giveback", label: "With Giveback" },
  { key: "high-otc", label: "High OTC" },
  { key: "ppo", label: "PPO" },
];

type PopoverKey = "plan-type" | "premium" | "moop" | "benefits" | "carrier" | null;

function MedicareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const parsed = parseParams(searchParams);

  const [medsOpen, setMedsOpen] = useState(false);
  const [openPop, setOpenPop] = useState<PopoverKey>(null);
  const chipsRef = useRef<HTMLDivElement>(null);

  const [selectedDrugs, setSelectedDrugs] = useState<SelectedDrug[]>([]);
  const [drugEstimates, setDrugEstimates] = useState<Record<string, DrugEstimate>>({});
  const [estimatingDrugs, setEstimatingDrugs] = useState(false);

  const search = useMedicareSearch(parsed.zip);
  const filters = useMedicareFilters(search.allPlans, drugEstimates);

  // Drug cost estimates (unchanged from prior impl)
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

  // Close popovers on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (chipsRef.current && !chipsRef.current.contains(e.target as Node)) setOpenPop(null);
    }
    if (openPop) document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [openPop]);

  function togglePop(key: PopoverKey) {
    setOpenPop((cur) => (cur === key ? null : key));
  }

  const activeNetworkBadge = filters.networkTypeFilter || null;
  const totalInArea = search.allPlans.length;

  return (
    <div className="med-page">
      {/* ═══ SEARCH HERO ═══ */}
      <section className="search-hero">
        <div className="search-hero-inner">
          <h1>Find Your Best Medicare Plan</h1>
          <p>Compare Medicare Advantage, Supplement, and Part D plans for your ZIP.</p>
          <form className="search-row" onSubmit={handleSearch}>
            <div className="field">
              <label htmlFor="zip-input">ZIP Code</label>
              <input
                id="zip-input"
                type="text"
                value={search.zip}
                onChange={(e) => search.setZip(e.target.value)}
                placeholder="33334"
                maxLength={5}
                inputMode="numeric"
                pattern="[0-9]{5}"
                required
              />
            </div>
            <button type="submit" className="search-btn">Search Plans</button>
            <button type="button" className="meds-toggle" onClick={() => setMedsOpen((o) => !o)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              {medsOpen ? "Hide medications" : "Add medications"} <strong>(optional)</strong>
            </button>
          </form>

          {medsOpen && (
            <div className="meds-panel">
              <div className="meds-panel-label">My Medications · see personalized drug costs</div>
              <MedicationInput
                selectedDrugs={selectedDrugs}
                onAdd={(d) => setSelectedDrugs((p) => [...p, d])}
                onRemove={(rxcui) => setSelectedDrugs((p) => p.filter((x) => x.rxcui !== rxcui))}
                loading={estimatingDrugs}
              />
            </div>
          )}
        </div>
      </section>

      {/* ═══ STAGE ═══ */}
      <div className="stage">
        <div className="stage-side-lines stage-side-lines-left" />
        <div className="stage-side-lines stage-side-lines-right" />

        <div className="stage-container">
          <div className="panel">
            <div className="panel-inner">

              {/* Header */}
              <div className="results-header">
                <div className="results-title">
                  <h2>Medicare Advantage Plans</h2>
                  <div className="results-title-sub">
                    {search.loading
                      ? "Loading plans…"
                      : `${filters.filteredPlans.length} plan${filters.filteredPlans.length !== 1 ? "s" : ""} ${filters.activeFilterCount || filters.quickPreset !== "all" ? `(filtered from ${totalInArea})` : "available in your area"}`}
                  </div>
                </div>
                {search.zip && (
                  <div className="results-meta">
                    <span className="results-meta-item"><strong>{search.zip}</strong></span>
                  </div>
                )}
              </div>

              {/* Filter chips with popovers */}
              <div className="filter-chips" ref={chipsRef}>
                <div className="fchip-wrap">
                  <button
                    type="button"
                    className={`fchip${openPop === "plan-type" ? " open" : ""}`}
                    onClick={() => togglePop("plan-type")}
                  >
                    Plan Type ▾
                    {activeNetworkBadge && <span className="fchip-badge">{activeNetworkBadge}</span>}
                  </button>
                  {openPop === "plan-type" && (
                    <div className="fpop">
                      <div className="fpop-title">Network Type</div>
                      <div className="fpop-opts">
                        {NETWORK_OPTIONS.map((opt) => (
                          <label key={opt.value} className="fpop-opt">
                            <input
                              type="radio"
                              name="network"
                              checked={filters.networkTypeFilter === opt.value}
                              onChange={() => filters.setNetworkTypeFilter(opt.value as MedicareNetworkType | "")}
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="fchip-wrap">
                  <button
                    type="button"
                    className={`fchip${openPop === "premium" ? " open" : ""}`}
                    onClick={() => togglePop("premium")}
                  >
                    Monthly Premium ▾
                    {filters.maxPremium !== null && <span className="fchip-badge">≤${filters.maxPremium}</span>}
                  </button>
                  {openPop === "premium" && (
                    <div className="fpop">
                      <div className="fpop-title">Max Monthly Premium</div>
                      <div className="fpop-slider">
                        <input
                          type="range"
                          min={0}
                          max={300}
                          step={5}
                          value={filters.maxPremium ?? 300}
                          onChange={(e) => filters.setMaxPremium(parseInt(e.target.value) === 300 ? null : parseInt(e.target.value))}
                        />
                        <div className="fpop-slider-label">
                          <span>$0</span>
                          <strong>{filters.maxPremium !== null ? `$${filters.maxPremium}/mo` : "Any"}</strong>
                          <span>$300+</span>
                        </div>
                      </div>
                      <div className="fpop-opts">
                        <label className="fpop-opt">
                          <input
                            type="checkbox"
                            checked={filters.zeroPremiumOnly}
                            onChange={(e) => filters.setZeroPremiumOnly(e.target.checked)}
                          />
                          $0 Premium only
                        </label>
                      </div>
                      <div className="fpop-actions">
                        <button type="button" className="fpop-clear" onClick={() => { filters.setMaxPremium(null); filters.setZeroPremiumOnly(false); }}>Clear</button>
                        <button type="button" className="fpop-apply" onClick={() => setOpenPop(null)}>Done</button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="fchip-wrap">
                  <button
                    type="button"
                    className={`fchip${openPop === "moop" ? " open" : ""}`}
                    onClick={() => togglePop("moop")}
                  >
                    Low MOOP ▾
                    {filters.maxMoop !== null && <span className="fchip-badge">≤${(filters.maxMoop / 1000).toFixed(0)}k</span>}
                  </button>
                  {openPop === "moop" && (
                    <div className="fpop">
                      <div className="fpop-title">Max Out-of-Pocket (In-Network)</div>
                      <div className="fpop-opts">
                        {MOOP_BUCKETS.map((b) => (
                          <label key={String(b.value)} className="fpop-opt">
                            <input
                              type="radio"
                              name="moop"
                              checked={filters.maxMoop === b.value}
                              onChange={() => filters.setMaxMoop(b.value)}
                            />
                            {b.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="fchip-wrap">
                  <button
                    type="button"
                    className={`fchip${openPop === "benefits" ? " open" : ""}`}
                    onClick={() => togglePop("benefits")}
                  >
                    Benefits ▾
                    {filters.requiredBenefits.size > 0 && <span className="fchip-badge">{filters.requiredBenefits.size}</span>}
                  </button>
                  {openPop === "benefits" && (
                    <div className="fpop" style={{ minWidth: 280 }}>
                      <div className="fpop-title">Must include</div>
                      <div className="fpop-opts">
                        {BENEFIT_OPTIONS.map((opt) => (
                          <label key={opt.key} className="fpop-opt">
                            <input
                              type="checkbox"
                              checked={filters.requiredBenefits.has(opt.key)}
                              onChange={(e) => {
                                const next = new Set(filters.requiredBenefits);
                                if (e.target.checked) next.add(opt.key);
                                else next.delete(opt.key);
                                filters.setRequiredBenefits(next);
                              }}
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                      <div className="fpop-actions">
                        <button type="button" className="fpop-clear" onClick={() => filters.setRequiredBenefits(new Set())}>Clear</button>
                        <button type="button" className="fpop-apply" onClick={() => setOpenPop(null)}>Done</button>
                      </div>
                    </div>
                  )}
                </div>

                {filters.carriers.length > 0 && (
                  <div className="fchip-wrap">
                    <button
                      type="button"
                      className={`fchip${openPop === "carrier" ? " open" : ""}`}
                      onClick={() => togglePop("carrier")}
                    >
                      Carrier ▾
                      {filters.carrierFilter.length > 0 && <span className="fchip-badge">{filters.carrierFilter.length}</span>}
                    </button>
                    {openPop === "carrier" && (
                      <div className="fpop">
                        <div className="fpop-title">Insurance Company</div>
                        <div className="fpop-opts">
                          {filters.carriers.map((c) => (
                            <label key={c} className="fpop-opt">
                              <input
                                type="checkbox"
                                checked={filters.carrierFilter.includes(c)}
                                onChange={(e) => {
                                  if (e.target.checked) filters.setCarrierFilter([...filters.carrierFilter, c]);
                                  else filters.setCarrierFilter(filters.carrierFilter.filter((x) => x !== c));
                                }}
                              />
                              {c}
                            </label>
                          ))}
                        </div>
                        <div className="fpop-actions">
                          <button type="button" className="fpop-clear" onClick={() => filters.setCarrierFilter([])}>Clear</button>
                          <button type="button" className="fpop-apply" onClick={() => setOpenPop(null)}>Done</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {filters.activeFilterCount > 0 && (
                  <button type="button" className="fchip" style={{ borderColor: "var(--pink)", color: "var(--pink)" }} onClick={filters.clearAll}>
                    Clear all ({filters.activeFilterCount})
                  </button>
                )}
              </div>

              {/* Quick-preset tabs */}
              <div className="tab-strip" role="tablist">
                {PRESET_TABS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={filters.quickPreset === key}
                    className={`tab${filters.quickPreset === key ? " active" : ""}`}
                    onClick={() => filters.setQuickPreset(key)}
                  >
                    {label} <span className="tab-count">({filters.presetCounts[key]})</span>
                  </button>
                ))}
              </div>

              {/* Results */}
              {search.loading && (
                <div className="plan-grid">
                  {[1, 2, 3].map((i) => <div key={i} className="load-skeleton" />)}
                </div>
              )}
              {search.error && <EmptyState type="error" onRetry={() => search.loadPlans()} />}
              {!search.loading && !search.error && filters.filteredPlans.length === 0 && <EmptyState type="no-results" />}

              {!search.loading && !search.error && filters.filteredPlans.length > 0 && (
                <>
                  <div className="plan-grid">
                    {filters.visiblePlans.map((plan) => (
                      <MedicarePlanCard key={plan.id} plan={plan} drugEstimate={drugEstimates[plan.id]} />
                    ))}
                  </div>
                  {filters.visibleCount < filters.filteredPlans.length && (
                    <div className="load-more-wrap">
                      <button type="button" className="load-more" onClick={filters.loadMore}>
                        Load more ({filters.visiblePlans.length} of {filters.filteredPlans.length})
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
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
