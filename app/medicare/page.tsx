"use client";

import "./medicare.css"; // keep — MedicarePlanCard still depends on .plan-grid

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useMemo, useRef, Suspense, type SVGProps, type ComponentType } from "react";
import { parseParams } from "@/lib/params";
import type { DrugEstimate, MedicareNetworkType } from "@/types/medicare";
import MedicarePlanCard from "@/components/medicare-plan-card";
import MedicationInput, { type SelectedDrug } from "@/components/medication-input";
import EmptyState from "@/components/empty-state";
import { useMedicareSearch } from "@/hooks/use-medicare-search";
import { useMedicareFilters, type QuickPreset, type SortOption, type Intent } from "@/hooks/use-medicare-filters";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { computeTierBadges } from "@/lib/medicare/tier-badges";

// ───────── inline SVG icons (goal cards + chrome)
// Sized via `width`/`height` so they ignore the surrounding font-size; stroke
// stays crisp at small sizes by using 1.8 weight per the Split Hero handoff.

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const Target = ({ size = 16, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </svg>
);
const Coin = ({ size = 16, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v10M9 9.5h4a2 2 0 0 1 0 4h-2a2 2 0 0 0 0 4h4" />
  </svg>
);
const StarOutline = ({ size = 16, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
    <polygon points="12 2 15 9 22 9.3 16.5 14 18 21 12 17.5 6 21 7.5 14 2 9.3 9 9 12 2" />
  </svg>
);
const Tooth = ({ size = 16, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
    <path d="M8 3c-2.5 0-4 1.5-4 4 0 2.5 1 5 1 8s.5 6 2.5 6 2-3 2.5-5 1-3 2-3 1.5 1 2 3 .5 5 2.5 5 2.5-5 2.5-8 1-5.5 1-8c0-2.5-1.5-4-4-4-1.5 0-2.5.5-4 1.5C10.5 3.5 9.5 3 8 3z" />
  </svg>
);
const Pin = ({ size = 12, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const Plus = ({ size = 14, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden {...props}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const SearchGlyph = ({ size = 13, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

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
 * filteredPlans count). `sub` is intentionally short — it sits inline under
 * the title in the goal card, not in a sidebar.
 */
const INTENT_TILES: {
  key: Intent;
  Icon: ComponentType<IconProps>;
  label: string;
  sub: string;
  countSource: "filtered" | QuickPreset;
  h2Suffix: string;
}[] = [
  { key: "best-match",    Icon: Target,      label: "Best match",        sub: "Profile + meds",   countSource: "filtered",      h2Suffix: "Best Match" },
  { key: "lowest-cost",   Icon: Coin,        label: "Lowest total cost", sub: "Premium + drugs",  countSource: "filtered",      h2Suffix: "Lowest Cost" },
  { key: "highest-rated", Icon: StarOutline, label: "Highest rated",     sub: "CMS 4.5★+",        countSource: "highly-rated",  h2Suffix: "Highest Rated" },
  { key: "most-benefits", Icon: Tooth,       label: "Most benefits",     sub: "Dental + vision",  countSource: "high-otc",      h2Suffix: "Most Benefits" },
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
        className={`inline-flex items-center gap-2 px-3.5 py-[9px] rounded-lg border text-[13px] whitespace-nowrap cursor-pointer transition-colors ${
          hasSelection
            ? "bg-[#2a0f5c] text-white border-[#2a0f5c] hover:bg-[#3a1670]"
            : "bg-white text-[#1a1a1a] border-[#e5e7eb] hover:border-[#9a8fa3]"
        }`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={`uppercase tracking-[0.08em] text-[10px] font-semibold ${hasSelection ? "text-white/70" : "text-[#9ca3af]"}`}>{label}</span>
        <span className={`font-semibold ${hasSelection ? "text-white" : "text-[#1a1a1a]"}`}>{value}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={hasSelection ? "text-white/70" : "text-[#9ca3af]"} aria-hidden>
          <polyline points="6 9 12 15 18 9" />
        </svg>
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

      {/* ───── Hero band — split grid (headline left, 2×2 goal cards right) ───── */}
      <section className="relative z-[1] mx-auto max-w-7xl px-6 pt-9 pb-6">
        {/* Meta row: eyebrow + ZIP pill */}
        <div className="flex items-center justify-between gap-6 mb-5">
          <span className="text-[11px] uppercase tracking-[0.14em] text-white/65 font-semibold">
            2026 Open Enrollment
          </span>
          {search.zip && (
            <span className="inline-flex items-center gap-1.5 text-white text-[12px] font-medium rounded-full px-3 py-1.5 border border-white/20">
              <Pin size={12} />
              ZIP {search.zip}
            </span>
          )}
        </div>

        {/* Split: headline (0.85fr) + goal cards 2×2 (1.15fr). Stacks on small screens. */}
        <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-8 items-center">
          {/* LEFT — headline + italic accent + body copy */}
          <div>
            <h1 className="text-white text-[40px] font-semibold leading-[1.08] tracking-[-0.025em] m-0">
              {search.loading ? (
                "Finding Medicare plans…"
              ) : search.allPlans.length > 0 ? (
                <>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{totalFiltered}</span>{" "}
                  Medicare plan{totalFiltered !== 1 ? "s" : ""} in your area
                </>
              ) : (
                "Enter a ZIP to see plans"
              )}
            </h1>
            <p className="text-[15px] italic text-[#a7f3d0] mt-3.5 m-0 font-normal leading-none">
              What matters most?
            </p>
            <p className="text-[13px] text-white/60 mt-4 max-w-[380px] leading-[1.5] m-0">
              Pick a goal — we&rsquo;ll rank your plans for it. Refine the rest below.
            </p>
          </div>

          {/* RIGHT — 2×2 goal cards (single column on small/medium) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="tablist" aria-label="Ranking intent">
            {INTENT_TILES.map((tile) => {
              const active = filters.intent === tile.key;
              const count = tile.countSource === "filtered" ? totalFiltered : filters.presetCounts[tile.countSource] ?? 0;
              return (
                <button
                  key={tile.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-pressed={active}
                  onClick={() => filters.setIntentTile(tile.key)}
                  className={`text-left flex items-center gap-3 px-4 py-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                    active
                      ? "bg-white border-transparent shadow-[0_6px_22px_-8px_rgba(0,0,0,0.35)]"
                      : "bg-white/[0.07] border-white/[0.13] hover:bg-white/[0.10] hover:border-white/20"
                  }`}
                >
                  {/* Icon tile */}
                  <span
                    className={`w-9 h-9 rounded-[10px] inline-flex items-center justify-center shrink-0 ${
                      active ? "bg-[#f3eeff] text-[#5b21b6]" : "bg-white/10 text-white"
                    }`}
                  >
                    <tile.Icon size={16} />
                  </span>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={`text-[14px] font-semibold tracking-[-0.005em] ${active ? "text-[#1a1033]" : "text-white"}`}>
                        {tile.label}
                      </span>
                      <span className={`text-[12px] font-semibold tabular-nums ${active ? "text-[#5b21b6]" : "text-white/70"}`}>
                        {count} <span className="font-medium opacity-70">plan{count !== 1 ? "s" : ""}</span>
                      </span>
                    </div>
                    <div className={`text-[11.5px] mt-0.5 leading-snug ${active ? "text-[#6b7280]" : "text-white/55"}`}>
                      {tile.sub}
                    </div>
                  </div>

                  {/* Active green dot with glow ring */}
                  {active && (
                    <span
                      aria-hidden
                      className="w-[7px] h-[7px] rounded-full bg-[#15803d] shrink-0"
                      style={{ boxShadow: "0 0 0 3px rgba(21,128,61,0.2)" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ───── Toolbar — full-width white floating card below the split ───── */}
        <div className="mt-[22px] bg-white rounded-[14px] p-3.5 flex flex-wrap items-center gap-2.5 shadow-[0_1px_0_rgba(0,0,0,0.04),0_6px_20px_-8px_rgba(0,0,0,0.18)]">
          {/* ZIP — form input that submits to refetch plans */}
          <form
            onSubmit={handleZipSubmit}
            className="inline-flex items-center gap-2 border border-[#e5e7eb] rounded-lg px-3.5 py-[9px] bg-white text-[13px]"
          >
            <span className="uppercase tracking-[0.08em] text-[10px] text-[#9ca3af] font-semibold">ZIP</span>
            <input
              type="text"
              value={search.zip}
              onChange={(e) => search.setZip(e.target.value)}
              placeholder="33334"
              maxLength={5}
              inputMode="numeric"
              pattern="[0-9]{5}"
              className="border-0 outline-none bg-transparent text-[13px] text-[#1a1a1a] w-[52px] font-semibold tabular-nums"
              aria-label="ZIP code"
            />
          </form>

          {/* Plan-Type segmented control — single-active chip group */}
          <div className="inline-flex rounded-lg overflow-hidden border border-[#e5e7eb]">
            {NETWORK_SEGS.map(({ key, label }, idx) => {
              const active = filters.networkTypeFilter === key;
              const isLast = idx === NETWORK_SEGS.length - 1;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => filters.setNetworkTypeFilter(key)}
                  className={`px-3.5 py-[9px] text-[13px] font-semibold transition-colors cursor-pointer ${
                    active ? "bg-[#2a0f5c] text-white" : "bg-white text-[#6b7280] hover:text-[#1a1a1a]"
                  } ${isLast ? "" : "border-r border-[#f0f0f3]"}`}
                  aria-pressed={active}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Visual divider between segmented + dropdown fields */}
          <span aria-hidden className="w-px h-[22px] bg-[#e5e7eb]" />

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

          {/* Add medications — green CTA opens the meds modal */}
          <button
            type="button"
            onClick={() => setMedsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-[9px] rounded-lg bg-[#15803d] hover:bg-[#166534] active:bg-[#14532d] text-white text-[13px] font-semibold cursor-pointer transition-colors whitespace-nowrap"
          >
            <Plus size={14} />
            {selectedDrugs.length > 0 ? `${selectedDrugs.length} med${selectedDrugs.length !== 1 ? "s" : ""}` : "Add medications"}
          </button>

          {/* Search — pill-shaped input with ⌘K kbd hint */}
          <div className="inline-flex items-center gap-2 border border-[#e5e7eb] rounded-lg px-3.5 py-[9px] bg-[#fafafa] min-w-[200px]">
            <SearchGlyph size={13} className="text-[#888]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plans, carriers…"
              className="flex-1 border-0 outline-none bg-transparent text-[13px] text-[#1a1a1a] placeholder:text-[#9ca3af] min-w-0"
              aria-label="Search plans"
            />
            <kbd className="text-[10px] text-[#9ca3af] border border-[#e5e7eb] rounded px-1.5 py-0.5 ml-auto">⌘K</kbd>
          </div>
        </div>
      </section>

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
