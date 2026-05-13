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
import { useMedicareFilters, type QuickPreset, type SortOption, type Intent } from "@/hooks/use-medicare-filters";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { computeTierBadges } from "@/lib/medicare/tier-badges";

// ───────── constants

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

/**
 * "What matters most" tiles — each maps to a (preset, sort) combo. The H2
 * "ranked by …" copy comes from `h2Suffix`. `countSource` tells the page
 * which presetCounts key to read for the tile's badge ("all" = use total
 * filteredPlans count).
 */
const INTENT_TILES: {
  key: Intent;
  icon: string;
  label: string;
  sub: string;
  countSource: "filtered" | QuickPreset;
  h2Suffix: string;
}[] = [
  { key: "best-match", icon: "🎯", label: "Best match", sub: "Our pick based on your profile and meds.", countSource: "filtered", h2Suffix: "Best Match" },
  { key: "lowest-cost", icon: "💰", label: "Lowest total cost", sub: "Premium + copays + drug costs over the year.", countSource: "filtered", h2Suffix: "Lowest Cost" },
  { key: "highest-rated", icon: "★", label: "Highest rated", sub: "CMS 4.5★ and up — strongest member experience.", countSource: "highly-rated", h2Suffix: "Highest Rated" },
  { key: "most-benefits", icon: "🦷", label: "Most benefits", sub: "Dental, vision, hearing, OTC bundled together.", countSource: "high-otc", h2Suffix: "Most Benefits" },
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
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-[17.5px] whitespace-nowrap cursor-pointer transition-colors ${
          hasSelection
            ? "bg-[#3a1257] text-white border-[#3a1257] hover:bg-[#4a1c6e]"
            : "bg-white text-[#1c1024] border-[#e8e3ec] hover:border-[#9a8fa3]"
        }`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={`uppercase tracking-[0.06em] text-[15px] ${hasSelection ? "text-white/70" : "text-[#6f6478]"}`}>{label}</span>
        <span className={`font-medium ${hasSelection ? "text-white" : "text-[#1c1024]"}`}>{value}</span>
        <span className={`text-[13px] ${hasSelection ? "text-white/70" : "text-[#6f6478]"}`}>▾</span>
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
    <label className="flex items-center gap-2.5 cursor-pointer text-[14.5px] text-[#1c1024] hover:text-[#2a1b35] py-[3px]">
      <span
        className={`w-[17px] h-[17px] rounded grid place-items-center text-[11px] text-white border-[1.5px] shrink-0 ${
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
      {count !== undefined && <span className="text-[13px] text-[#6f6478]">{count}</span>}
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

      {/* Flowy waves overlay — same SVG that lives on the insurancenyou.com
          Webflow pages. The SVG draws dark purple curves on transparent;
          mix-blend-mode: screen flips them to light streaks against our dark
          purple stage. Anchored top-left so the sweep matches the marketing
          site (curves emanate from upper-left and flow right). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0"
        style={{
          height: "min(560px, 60vh)",
          background: "url('/iny-assets/66dec224a2d080a175f71408_wwa-hero-lines.svg') left top / 100% auto no-repeat",
          opacity: 0.55,
          mixBlendMode: "screen",
        }}
      />

      {/* ───── Page header (TOP — eyebrow + H1 + sub-meta + ZIP pill) ───── */}
      <div className="relative z-[1] mx-auto max-w-7xl px-6 pt-9 pb-4">
        <div className="flex items-center justify-between gap-6 mb-2">
          <span className="text-[12px] uppercase tracking-[0.14em] text-white/70 font-semibold">
            2026 Open Enrollment
          </span>
          {search.zip && (
            <span className="inline-flex items-center gap-2 bg-white/12 text-white text-[12px] font-semibold rounded-full px-3 py-1">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              ZIP {search.zip}
            </span>
          )}
        </div>
        <h1
          className="text-white text-[32px] leading-tight tracking-[-0.02em] font-bold m-0"
          style={{ fontFamily: "'Times New Roman', Times, serif", fontWeight: 500 }}
        >
          {search.loading ? (
            "Finding Medicare plans…"
          ) : search.allPlans.length > 0 ? (
            <>
              {totalFiltered} Medicare plan{totalFiltered !== 1 ? "s" : ""} in your area —{" "}
              <em className="not-italic" style={{ color: "#a8e6c0" }}>what matters most?</em>
            </>
          ) : (
            "Enter a ZIP to see plans"
          )}
        </h1>
        <p className="text-white/75 text-[14px] mt-2 m-0">
          Pick a goal to rank plans for it, then refine below.
        </p>
      </div>

      {/* ───── Filter toolbar — centered, semi-transparent, rounded card on purple ───── */}
      <div className="relative z-[1] mx-auto max-w-7xl px-6">
        <div className="bg-white/85 backdrop-blur-md border border-white/40 rounded-2xl shadow-[0_8px_32px_-12px_rgba(15,5,30,0.30)] overflow-visible">
        {/* Single row: ZIP / segmented / dropdowns / +Add meds / search (Sort moved to results header) */}
        <div className="px-5 py-4 flex items-center gap-2.5 flex-wrap">
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
                <h4 className="m-0 mb-2.5 text-[12px] uppercase tracking-[0.12em] text-[#6f6478] font-semibold">Premium</h4>
                <label className="flex items-center gap-2 cursor-pointer text-[14.5px] text-[#1c1024] mb-3">
                  <input
                    type="checkbox"
                    checked={filters.zeroPremiumOnly}
                    onChange={(e) => filters.setZeroPremiumOnly(e.target.checked)}
                    className="w-[15px] h-[15px] accent-[#3a1257]"
                  />
                  $0 Premium only
                </label>
                <div>
                  <label className="text-[12px] uppercase tracking-[0.08em] text-[#6f6478] block mb-1">Max monthly</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6f6478] text-[14px]">$</span>
                    <input
                      type="number"
                      min={0}
                      value={filters.maxPremium ?? ""}
                      onChange={(e) => filters.setMaxPremium(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="No limit"
                      className="w-full border border-[#e8e3ec] rounded-md pl-6 pr-2 py-2 text-[15px] text-[#1c1024] focus:outline-none focus:border-[#9a8fa3]"
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
                <h4 className="m-0 mb-2.5 text-[12px] uppercase tracking-[0.12em] text-[#6f6478] font-semibold">Benefits must include</h4>
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
                  <h4 className="m-0 mb-2.5 text-[12px] uppercase tracking-[0.12em] text-[#6f6478] font-semibold">Carriers</h4>
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
                <h4 className="m-0 mb-1 text-[12px] uppercase tracking-[0.12em] text-[#6f6478] font-semibold">Qualifying status</h4>
                <p className="text-[13px] text-[#6f6478] mb-3 leading-snug">Toggle on if you have either of these — surfaces SNP plans you can enroll in.</p>
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

          {/* Search input — right-aligned on the same row as Sort + Add medications */}
          <div className="inline-flex items-center gap-2 border border-[#e8e3ec] rounded-full px-3.5 py-2 bg-white w-[280px]">
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

      {/* ───── Intent tiles — 4 side-by-side "what matters most" cards ───── */}
      <div className="relative z-[1] mx-auto max-w-7xl px-6 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5" role="tablist" aria-label="Ranking intent">
          {INTENT_TILES.map((tile) => {
            const active = filters.intent === tile.key;
            const count = tile.countSource === "filtered" ? totalFiltered : filters.presetCounts[tile.countSource] ?? 0;
            return (
              <button
                key={tile.key}
                type="button"
                role="tab"
                aria-selected={active}
                aria-current={active}
                onClick={() => filters.setIntentTile(tile.key)}
                className={`text-left flex flex-col gap-1.5 px-5 py-4 rounded-2xl border cursor-pointer transition-all ${
                  active
                    ? "bg-white border-white"
                    : "bg-white/8 border-white/20 hover:bg-white/12"
                }`}
              >
                <span className="text-[22px] leading-none" aria-hidden="true">{tile.icon}</span>
                <span className={`text-[15px] font-bold ${active ? "text-[#1a1424]" : "text-white"}`}>
                  {tile.label}
                </span>
                <span className={`text-[12px] leading-snug ${active ? "text-[#7a6d8e]" : "text-white/75"}`}>
                  {tile.sub}
                </span>
                <span
                  className={`self-start text-[11px] font-semibold rounded-full px-2 py-0.5 mt-0.5 ${
                    active ? "bg-[#f3eef9] text-[#3a1257]" : "bg-white/16 text-white"
                  }`}
                >
                  {count} plan{count !== 1 ? "s" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ───── Applied filters strip — chips for every non-default constraint ───── */}
      {activeFilterChips.length > 0 && (
        <div className="relative z-[1] mx-auto max-w-7xl px-6 pt-3.5 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] uppercase tracking-[0.1em] text-white/70 font-semibold">Applied:</span>
          {activeFilterChips.map((chip) => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1.5 bg-white text-[#3a1257] text-[12px] font-semibold rounded-full pl-3 pr-1.5 py-1.5"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.clear}
                className="w-[18px] h-[18px] rounded-full bg-[#f3eef9] grid place-items-center text-[10px] cursor-pointer hover:bg-[#e0d8eb]"
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
            className="text-[12px] text-white/85 hover:text-white underline ml-auto cursor-pointer"
            style={{ textUnderlineOffset: 3 }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* ───── Results header — H2 ("Top picks ranked by …") + Sort control ───── */}
      <div className="relative z-[1] mx-auto max-w-7xl px-6 pt-6 pb-4 flex items-end justify-between gap-6 flex-wrap">
        <div>
          <h2 className="text-white text-[22px] font-bold tracking-[-0.015em] m-0">
            Top picks ranked by {filters.intent ? INTENT_TILES.find((t) => t.key === filters.intent)?.h2Suffix : sortValue}
          </h2>
          <p className="text-white/70 text-[13px] mt-1 m-0">
            <b className="text-white font-semibold">{totalFiltered} plan{totalFiltered !== 1 ? "s" : ""}</b>{" "}
            {filters.activeFilterCount || searchQuery ? "match your filters" : "in your area"} ·{" "}
            showing {Math.min(filters.visiblePlans.length, totalFiltered)} of {totalFiltered}
          </p>
        </div>
        <Dropdown label="Sort by" value={sortValue} hasSelection={false} panelWidth="min-w-[240px]">
          {(close) => (
            <>
              <h4 className="m-0 mb-2.5 text-[12px] uppercase tracking-[0.12em] text-[#6f6478] font-semibold">Sort by</h4>
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
                      className={`text-left px-2.5 py-2 rounded-md text-[14.5px] transition-colors cursor-pointer ${
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
      </div>

      {/* ───── Results grid (3-up on purple) ───── */}
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
