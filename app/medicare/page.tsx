"use client";

import "./medicare.css"; // keep — MedicarePlanCard still depends on .plan-grid

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import { parseParams } from "@/lib/params";
import type { DrugEstimate, MedicareNetworkType } from "@/types/medicare";
import MedicarePlanCard from "@/components/medicare-plan-card";
import MedicationInput, { type SelectedDrug } from "@/components/medication-input";
import EmptyState from "@/components/empty-state";
import { useMedicareSearch } from "@/hooks/use-medicare-search";
import { useMedicareFilters, type QuickPreset, type SortOption } from "@/hooks/use-medicare-filters";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { computeTierBadges } from "@/lib/medicare/tier-badges";

// ───────── constants

const PRESET_TABS: { key: QuickPreset; label: string }[] = [
  { key: "all", label: "All Plans" },
  { key: "recently-viewed", label: "Recently viewed" },
  { key: "zero-premium", label: "$0 Premium" },
  { key: "highly-rated", label: "Highly Rated" },
  { key: "low-moop", label: "Low MOOP" },
  { key: "with-giveback", label: "With Giveback" },
  { key: "high-otc", label: "High OTC" },
  { key: "ppo", label: "PPO" },
];

const NETWORK_SEGS: { key: MedicareNetworkType | ""; label: string }[] = [
  { key: "", label: "Any" },
  { key: "HMO", label: "HMO" },
  { key: "PPO", label: "PPO" },
  { key: "HMO-POS", label: "HMO-POS" },
  { key: "PFFS", label: "PFFS" },
];

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: "Net Annual Cost", value: "value-asc" },
  { label: "CMS Stars", value: "rating-desc" },
  { label: "Lowest Premium", value: "premium-asc" },
  { label: "Highest Premium", value: "premium-desc" },
  { label: "Lowest MOOP", value: "moop-asc" },
  { label: "Lowest Deductible", value: "deductible-asc" },
  { label: "Highest OTC", value: "otc-desc" },
  { label: "A–Z", value: "alpha" },
];

const BENEFIT_OPTIONS: { key: string; label: string }[] = [
  { key: "giveback", label: "Part B Giveback" },
  { key: "otc", label: "OTC Card" },
  { key: "dental", label: "Dental" },
  { key: "vision", label: "Vision" },
  { key: "hearing", label: "Hearing" },
];

// ───────── shared atoms

/**
 * Dropdown trigger + popover. Click-outside + Escape close. The trigger flips
 * to a filled purple style when `hasSelection` is true (visual signal that
 * a filter is active without forcing the user into the popover to see).
 */
function Dropdown({
  label,
  value,
  hasSelection,
  children,
  panelWidth = "min-w-[240px]",
}: {
  label: string;
  value: string;
  hasSelection?: boolean;
  children: (close: () => void) => React.ReactNode;
  panelWidth?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-[15.5px] whitespace-nowrap cursor-pointer transition-colors ${
          hasSelection
            ? "bg-[#3a1257] text-white border-[#3a1257] hover:bg-[#4a1c6e]"
            : "bg-white text-[#1c1024] border-[#e8e3ec] hover:border-[#9a8fa3]"
        }`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={`uppercase tracking-[0.06em] text-[13px] ${hasSelection ? "text-white/70" : "text-[#6f6478]"}`}>{label}</span>
        <span className={`font-medium ${hasSelection ? "text-white" : "text-[#1c1024]"}`}>{value}</span>
        <span className={`text-[11px] ${hasSelection ? "text-white/70" : "text-[#6f6478]"}`}>▾</span>
      </button>
      {open && (
        <div
          role="dialog"
          className={`absolute top-[calc(100%+6px)] left-0 z-30 bg-white border border-[#e8e3ec] rounded-xl p-4 shadow-[0_24px_48px_-16px_rgba(15,5,30,0.35),0_4px_10px_-4px_rgba(15,5,30,0.15)] ${panelWidth}`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function CheckRow({
  checked,
  onToggle,
  label,
  count,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  count?: number | string;
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer text-[12.5px] text-[#1c1024] hover:text-[#2a1b35] py-[3px]">
      <span
        className={`w-[15px] h-[15px] rounded grid place-items-center text-[9px] text-white border-[1.5px] shrink-0 ${
          checked ? "bg-[#3a1257] border-[#3a1257]" : "bg-white border-[#e8e3ec]"
        }`}
        onClick={(e) => {
          e.preventDefault();
          onToggle();
        }}
      >
        {checked && "✓"}
      </span>
      <input type="checkbox" checked={checked} onChange={onToggle} className="sr-only" />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-[11px] text-[#6f6478]">{count}</span>}
    </label>
  );
}

// ───────── page

function MedicareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const parsed = parseParams(searchParams);

  const [medsOpen, setMedsOpen] = useState(false);
  const [selectedDrugs, setSelectedDrugs] = useState<SelectedDrug[]>([]);
  const [drugEstimates, setDrugEstimates] = useState<Record<string, DrugEstimate>>({});
  const [estimatingDrugs, setEstimatingDrugs] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const initialSnp = {
    medicaid: searchParams.get("medicaid") === "yes",
    chronic: searchParams.get("chronic") === "yes",
  };

  const search = useMedicareSearch(parsed.zip);
  const recentlyViewedIds = useRecentlyViewed();
  const filters = useMedicareFilters(search.allPlans, drugEstimates, initialSnp, recentlyViewedIds);

  // SNP toggle → URL sync (preserve shareability)
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (filters.medicaidEligible) params.set("medicaid", "yes");
    else params.delete("medicaid");
    if (filters.chronicCondition) params.set("chronic", "yes");
    else params.delete("chronic");
    const next = params.toString();
    if (next !== searchParams.toString()) {
      router.replace(`/medicare${next ? "?" + next : ""}`, { scroll: false });
    }
  }, [filters.medicaidEligible, filters.chronicCondition, searchParams, router]);

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

  // Tier badges over the filtered set
  const tierMap = useMemo(() => computeTierBadges(filters.filteredPlans), [filters.filteredPlans]);

  // Free-text search filter over plan name + carrier (applied AFTER hook filters)
  const searchedPlans = useMemo(() => {
    if (!searchQuery.trim()) return filters.visiblePlans;
    const q = searchQuery.toLowerCase();
    return filters.visiblePlans.filter((p) => p.name.toLowerCase().includes(q) || p.carrier.toLowerCase().includes(q));
  }, [filters.visiblePlans, searchQuery]);

  function handleZipSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.replace(`/medicare?${new URLSearchParams({ zip: search.zip }).toString()}`);
    search.loadPlans(search.zip);
  }

  // ───── derived dropdown summary values

  const premiumValue =
    filters.zeroPremiumOnly && filters.maxPremium === null
      ? "$0 only"
      : filters.maxPremium !== null
        ? `≤ $${filters.maxPremium}/mo`
        : "Any";
  const premiumHas = filters.zeroPremiumOnly || filters.maxPremium !== null;

  const benefitsValue = filters.requiredBenefits.size === 0 ? "Any" : `${filters.requiredBenefits.size} selected`;
  const benefitsHas = filters.requiredBenefits.size > 0;

  const carrierValue =
    filters.carrierFilter.length === 0
      ? `All ${filters.carriers.length}`
      : `${filters.carrierFilter.length} selected`;
  const carrierHas = filters.carrierFilter.length > 0;

  const eligibilityValue =
    filters.medicaidEligible && filters.chronicCondition
      ? "Medicaid + Chronic"
      : filters.medicaidEligible
        ? "Medicaid"
        : filters.chronicCondition
          ? "Chronic"
          : "Standard";
  const eligibilityHas = filters.medicaidEligible || filters.chronicCondition;

  const sortValue = SORT_OPTIONS.find((o) => o.value === filters.sortBy)?.label ?? "Sort";

  // ───── derived active-filter chip list

  const activeFilterChips = useMemo(() => {
    const chips: { id: string; label: string; clear: () => void }[] = [];
    if (filters.networkTypeFilter) {
      chips.push({ id: "net", label: filters.networkTypeFilter, clear: () => filters.setNetworkTypeFilter("") });
    }
    if (filters.zeroPremiumOnly) {
      chips.push({ id: "zero", label: "$0 Premium", clear: () => filters.setZeroPremiumOnly(false) });
    }
    if (filters.maxPremium !== null) {
      chips.push({ id: "maxp", label: `≤ $${filters.maxPremium}/mo`, clear: () => filters.setMaxPremium(null) });
    }
    filters.requiredBenefits.forEach((key) => {
      const opt = BENEFIT_OPTIONS.find((b) => b.key === key);
      chips.push({
        id: `b-${key}`,
        label: opt?.label ?? key,
        clear: () => {
          const next = new Set(filters.requiredBenefits);
          next.delete(key);
          filters.setRequiredBenefits(next);
        },
      });
    });
    filters.carrierFilter.forEach((c) => {
      chips.push({
        id: `c-${c}`,
        label: c,
        clear: () => filters.setCarrierFilter(filters.carrierFilter.filter((x) => x !== c)),
      });
    });
    if (filters.medicaidEligible) {
      chips.push({ id: "medicaid", label: "Medicaid", clear: () => filters.setMedicaidEligible(false) });
    }
    if (filters.chronicCondition) {
      chips.push({ id: "chronic", label: "Chronic", clear: () => filters.setChronicCondition(false) });
    }
    return chips;
  }, [filters]);

  const totalInArea = search.allPlans.length;
  const visibleCount = searchedPlans.length;
  const totalFiltered = filters.filteredPlans.length;

  // ───────── render

  return (
    <div style={{ background: "#3a1257" }} className="min-h-[calc(100vh-4rem)] relative">
      {/* Subtle radial light overlay on the purple stage */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(900px 500px at 100% 0%, rgba(255,255,255,0.10), transparent 70%), radial-gradient(700px 400px at 0% 100%, rgba(255,255,255,0.06), transparent 70%)",
        }}
      />

      {/* Flowy-lines SVG overlay (same asset the plan-detail stage uses).
          mix-blend-mode: screen so the lines glow softly against the purple
          without dimming the underlying gradient. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background: "url('/iny-assets/66db14dfa45c2e1549d46634_dark-banner-bg-lines.svg') center top / cover no-repeat",
          opacity: 0.22,
          mixBlendMode: "screen",
        }}
      />

      {/* ───── Filter bar — centered, semi-transparent, rounded card on purple ───── */}
      <div className="relative z-[1] mx-auto max-w-7xl px-6 pt-6">
        <div className="bg-white/85 backdrop-blur-md border border-white/40 rounded-2xl shadow-[0_8px_32px_-12px_rgba(15,5,30,0.30)] overflow-visible">
        {/* Row 1: ZIP / segmented / dropdowns / sort / add meds (filter controls first) */}
        <div className="px-5 py-4 flex items-center gap-2.5 flex-wrap border-b border-[#e8e3ec]/70">
          {/* ZIP */}
          <form onSubmit={handleZipSubmit} className="inline-flex items-center gap-2 border border-[#e8e3ec] rounded-lg px-3.5 py-2 bg-white">
            <span className="uppercase tracking-[0.08em] text-[13px] text-[#6f6478] font-semibold">ZIP</span>
            <input
              type="text"
              value={search.zip}
              onChange={(e) => search.setZip(e.target.value)}
              placeholder="33334"
              maxLength={5}
              inputMode="numeric"
              pattern="[0-9]{5}"
              className="border-0 outline-none bg-transparent text-[16px] text-[#1c1024] w-[68px] font-semibold"
              aria-label="ZIP code"
            />
          </form>

          <div className="w-px h-[26px] bg-[#e8e3ec]" />

          {/* Plan-Type (network) segmented */}
          <div className="inline-flex border border-[#e8e3ec] rounded-lg bg-white p-[3px]">
            {NETWORK_SEGS.map(({ key, label }) => {
              const active = filters.networkTypeFilter === key;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => filters.setNetworkTypeFilter(key)}
                  className={`px-3 py-[7px] rounded-md text-[15px] transition-colors cursor-pointer ${
                    active ? "bg-[#3a1257] text-white" : "text-[#9a8fa3] hover:text-[#1c1024]"
                  }`}
                  aria-pressed={active}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Premium */}
          <Dropdown label="Premium" value={premiumValue} hasSelection={premiumHas} panelWidth="min-w-[260px]">
            {() => (
              <>
                <h4 className="m-0 mb-2.5 text-[10px] uppercase tracking-[0.12em] text-[#6f6478] font-semibold">Premium</h4>
                <label className="flex items-center gap-2 cursor-pointer text-[12.5px] text-[#1c1024] mb-3">
                  <input
                    type="checkbox"
                    checked={filters.zeroPremiumOnly}
                    onChange={(e) => filters.setZeroPremiumOnly(e.target.checked)}
                    className="w-[15px] h-[15px] accent-[#3a1257]"
                  />
                  $0 Premium only
                </label>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.08em] text-[#6f6478] block mb-1">Max monthly</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6f6478] text-[12px]">$</span>
                    <input
                      type="number"
                      min={0}
                      value={filters.maxPremium ?? ""}
                      onChange={(e) => filters.setMaxPremium(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="No limit"
                      className="w-full border border-[#e8e3ec] rounded-md pl-6 pr-2 py-1.5 text-[13px] text-[#1c1024] focus:outline-none focus:border-[#9a8fa3]"
                    />
                  </div>
                </div>
              </>
            )}
          </Dropdown>

          {/* Benefits */}
          <Dropdown label="Benefits" value={benefitsValue} hasSelection={benefitsHas} panelWidth="min-w-[220px]">
            {() => (
              <>
                <h4 className="m-0 mb-2.5 text-[10px] uppercase tracking-[0.12em] text-[#6f6478] font-semibold">Benefits must include</h4>
                <div className="flex flex-col gap-1.5">
                  {BENEFIT_OPTIONS.map(({ key, label }) => (
                    <CheckRow
                      key={key}
                      checked={filters.requiredBenefits.has(key)}
                      onToggle={() => {
                        const next = new Set(filters.requiredBenefits);
                        if (next.has(key)) next.delete(key);
                        else next.add(key);
                        filters.setRequiredBenefits(next);
                      }}
                      label={label}
                    />
                  ))}
                </div>
              </>
            )}
          </Dropdown>

          {/* Carrier */}
          {filters.carriers.length > 0 && (
            <Dropdown label="Carrier" value={carrierValue} hasSelection={carrierHas} panelWidth="min-w-[260px]">
              {() => (
                <>
                  <h4 className="m-0 mb-2.5 text-[10px] uppercase tracking-[0.12em] text-[#6f6478] font-semibold">Carriers</h4>
                  <div className="flex flex-col gap-1 max-h-[280px] overflow-y-auto pr-1">
                    {filters.carriers.map((c) => (
                      <CheckRow
                        key={c}
                        checked={filters.carrierFilter.includes(c)}
                        onToggle={() => {
                          if (filters.carrierFilter.includes(c)) {
                            filters.setCarrierFilter(filters.carrierFilter.filter((x) => x !== c));
                          } else {
                            filters.setCarrierFilter([...filters.carrierFilter, c]);
                          }
                        }}
                        label={c}
                      />
                    ))}
                  </div>
                </>
              )}
            </Dropdown>
          )}

          {/* Eligibility */}
          <Dropdown label="Eligibility" value={eligibilityValue} hasSelection={eligibilityHas} panelWidth="min-w-[280px]">
            {() => (
              <>
                <h4 className="m-0 mb-1 text-[10px] uppercase tracking-[0.12em] text-[#6f6478] font-semibold">Qualifying status</h4>
                <p className="text-[11px] text-[#6f6478] mb-3 leading-snug">Toggle on if you have either of these — surfaces SNP plans you can enroll in.</p>
                <CheckRow
                  checked={filters.medicaidEligible}
                  onToggle={() => filters.setMedicaidEligible(!filters.medicaidEligible)}
                  label="On Medicaid (or Extra Help) → D-SNP"
                />
                <CheckRow
                  checked={filters.chronicCondition}
                  onToggle={() => filters.setChronicCondition(!filters.chronicCondition)}
                  label="Chronic condition → C-SNP"
                />
              </>
            )}
          </Dropdown>

          <div className="flex-1" />

          {/* Sort */}
          <Dropdown label="Sort by" value={sortValue} hasSelection={false} panelWidth="min-w-[220px]">
            {(close) => (
              <>
                <h4 className="m-0 mb-2.5 text-[10px] uppercase tracking-[0.12em] text-[#6f6478] font-semibold">Sort by</h4>
                <div className="flex flex-col gap-0.5">
                  {SORT_OPTIONS.map((opt) => {
                    const active = filters.sortBy === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          filters.setSortBy(opt.value);
                          close();
                        }}
                        className={`text-left px-2 py-1.5 rounded-md text-[12.5px] transition-colors cursor-pointer ${
                          active ? "bg-[#f4f0f7] text-[#3a1257] font-semibold" : "text-[#1c1024] hover:bg-[#f4f0f7]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </Dropdown>

          {/* Add medications (green) */}
          <button
            type="button"
            onClick={() => setMedsOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#34a853] hover:bg-[#2c9446] text-white text-[15.5px] font-medium cursor-pointer transition-colors whitespace-nowrap"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {selectedDrugs.length > 0 ? `${selectedDrugs.length} med${selectedDrugs.length !== 1 ? "s" : ""}` : "Add medications"}
          </button>
        </div>

        {/* Row 2: pill quick-presets + search (now BELOW the filter controls) */}
        <div className="px-5 py-3.5 flex items-center gap-2.5 flex-wrap">
          <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Quick filters">
            {PRESET_TABS.map(({ key, label }) => {
              // Hide "Recently viewed" pill until the user has viewed at least
              // one plan — first-time visitors don't see an empty "(0)" pill.
              if (key === "recently-viewed" && filters.presetCounts["recently-viewed"] === 0) return null;
              const active = filters.quickPreset === key;
              const count = filters.presetCounts[key];
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => filters.setQuickPreset(key)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[15px] border whitespace-nowrap cursor-pointer transition-colors ${
                    active
                      ? "bg-[#34a853] text-white border-[#34a853]"
                      : "bg-white text-[#2a1b35] border-[#e8e3ec] hover:border-[#9a8fa3]"
                  }`}
                >
                  {label}
                  <span className={`text-[13px] ${active ? "text-white/80" : "text-[#6f6478]"}`}>{count}</span>
                </button>
              );
            })}
          </div>
          <div className="flex-1" />
          <div className="inline-flex items-center gap-2 border border-[#e8e3ec] rounded-full px-3.5 py-2 bg-white w-[300px]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6f6478" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plans, carriers…"
              className="flex-1 border-0 outline-none bg-transparent text-[15.5px] text-[#1c1024] placeholder:text-[#9a8fa3] min-w-0"
              aria-label="Search plans"
            />
            <kbd className="text-[12px] text-[#6f6478] border border-[#e8e3ec] rounded px-1.5 py-0.5">⌘K</kbd>
          </div>
        </div>
        </div>
      </div>

      {/* ───── Page header on purple ───── */}
      <div className="relative z-[1] mx-auto max-w-7xl px-6 pt-[22px] pb-4 flex items-end justify-between gap-6">
        <div>
          <h1
            className="text-white text-[24px] tracking-[-0.02em] m-0"
            style={{ fontFamily: "'Times New Roman', Times, serif", fontWeight: 500 }}
          >
            Find Your Best Medicare Plan
          </h1>
          <div className="text-white/75 text-[12px] mt-1 flex items-center gap-2.5 flex-wrap">
            {search.loading ? (
              <span>Loading plans…</span>
            ) : search.allPlans.length > 0 ? (
              <>
                <span>
                  <b className="text-white font-semibold">
                    {totalFiltered} plan{totalFiltered !== 1 ? "s" : ""}
                  </b>{" "}
                  {filters.activeFilterCount || filters.quickPreset !== "all" || searchQuery
                    ? `filtered from ${totalInArea}`
                    : "available in your area"}
                </span>
                <span className="text-white/40">·</span>
                <span>2026 plan year</span>
                {searchQuery && (
                  <>
                    <span className="text-white/40">·</span>
                    <span>search: &ldquo;{searchQuery}&rdquo;</span>
                  </>
                )}
              </>
            ) : (
              <span>Enter a ZIP to see plans</span>
            )}
          </div>
        </div>
        {search.zip && (
          <div className="inline-flex items-center gap-2 border border-white/25 bg-white/10 text-white text-[12px] rounded-full px-3.5 py-1.5 whitespace-nowrap">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            ZIP <b className="font-semibold">{search.zip}</b>
          </div>
        )}
      </div>

      {/* ───── Active filter chip row ───── */}
      {(activeFilterChips.length > 0 || filters.quickPreset !== "all") && (
        <div className="relative z-[1] mx-auto max-w-7xl px-6 pb-3.5 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase tracking-[0.14em] text-white/60 font-semibold">
            {activeFilterChips.length || (filters.quickPreset !== "all" ? 1 : 0)} active
          </span>
          {filters.quickPreset !== "all" && (
            <span className="inline-flex items-center gap-1.5 bg-white/[0.10] border border-white/[0.22] text-white text-[12px] rounded-full px-3 py-1">
              {PRESET_TABS.find((t) => t.key === filters.quickPreset)?.label ?? filters.quickPreset}
              <button
                type="button"
                onClick={() => filters.setQuickPreset("all")}
                className="text-white/70 hover:text-white text-[11px] cursor-pointer"
                aria-label="Remove filter"
              >
                ✕
              </button>
            </span>
          )}
          {activeFilterChips.map((chip) => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1.5 bg-white/[0.10] border border-white/[0.22] text-white text-[12px] rounded-full px-3 py-1"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.clear}
                className="text-white/70 hover:text-white text-[11px] cursor-pointer"
                aria-label={`Remove ${chip.label}`}
              >
                ✕
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => {
              filters.clearAll();
              setSearchQuery("");
            }}
            className="text-[11.5px] text-white/70 hover:text-white underline ml-1 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ───── Results grid (4-up on purple) ───── */}
      <div className="relative z-[1] mx-auto max-w-7xl px-6 pb-[26px]">
        {search.loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[460px] bg-white/[0.06] border border-white/[0.10] rounded-2xl animate-pulse" />
            ))}
          </div>
        )}
        {search.error && <EmptyState type="error" onRetry={() => search.loadPlans()} />}
        {!search.loading && !search.error && filters.filteredPlans.length === 0 && search.zip && <EmptyState type="no-results" />}

        {!search.loading && !search.error && filters.filteredPlans.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {searchedPlans.map((plan) => (
                <MedicarePlanCard
                  key={plan.id}
                  plan={plan}
                  drugEstimate={drugEstimates[plan.id]}
                  tierBadges={tierMap.get(plan.id)}
                />
              ))}
            </div>
            {searchQuery && visibleCount === 0 && (
              <div className="text-center text-white/70 mt-6 text-sm">No plans match &ldquo;{searchQuery}&rdquo;.</div>
            )}
            {!searchQuery && filters.visibleCount < filters.filteredPlans.length && (
              <div className="flex justify-center mt-6">
                <button
                  type="button"
                  onClick={filters.loadMore}
                  className="px-5 py-2.5 rounded-lg text-[13px] font-semibold border border-white/25 text-white/85 hover:border-white/45 hover:text-white transition-colors cursor-pointer"
                >
                  Load more ({filters.visiblePlans.length} of {filters.filteredPlans.length})
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ───── Medications modal ───── */}
      {medsOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
          onClick={() => setMedsOpen(false)}
        >
          <div
            className="bg-white w-full sm:w-[480px] sm:max-w-[92vw] max-h-[80vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[16px] font-semibold text-[#1c1024] m-0">Your medications</h3>
              <button
                type="button"
                onClick={() => setMedsOpen(false)}
                className="text-[#6f6478] hover:text-[#1c1024] text-[18px] leading-none cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className="text-[12px] text-[#6f6478] mb-3">Add the drugs you take and we&rsquo;ll estimate annual cost per plan.</p>
            <MedicationInput
              selectedDrugs={selectedDrugs}
              onAdd={(d) => setSelectedDrugs((p) => [...p, d])}
              onRemove={(rxcui) => setSelectedDrugs((p) => p.filter((x) => x.rxcui !== rxcui))}
              loading={estimatingDrugs}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function MedicarePage() {
  return (
    <Suspense
      fallback={
        <div style={{ background: "#3a1257" }} className="min-h-[calc(100vh-4rem)] grid place-items-center">
          <div className="text-white/70">Loading…</div>
        </div>
      }
    >
      <MedicareContent />
    </Suspense>
  );
}
