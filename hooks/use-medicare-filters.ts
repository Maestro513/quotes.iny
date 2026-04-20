"use client";

import { useState, useMemo } from "react";
import type { MedicarePlan, MedicarePlanType, MedicareNetworkType, DrugEstimate } from "@/types/medicare";

export type SortOption = "premium-asc" | "premium-desc" | "alpha" | "moop-asc" | "moop-desc" | "rating-desc" | "drugcost-asc";

/** Quick-filter preset tabs: one-click bundles that override individual filters. */
export type QuickPreset =
  | "all"
  | "zero-premium"
  | "highly-rated"
  | "low-moop"
  | "with-giveback"
  | "high-otc"
  | "ppo"
  | "hmo";

const PAGE_SIZE = 20;

export function useMedicareFilters(allPlans: MedicarePlan[], drugEstimates: Record<string, DrugEstimate> = {}) {
  const [planTypeFilter, setPlanTypeFilter] = useState<MedicarePlanType | "">("");
  const [networkTypeFilter, setNetworkTypeFilter] = useState<MedicareNetworkType | "">("");
  const [carrierFilter, setCarrierFilter] = useState<string[]>([]);
  const [zeroPremiumOnly, setZeroPremiumOnly] = useState(false);
  const [maxPremium, setMaxPremium] = useState<number | null>(null);
  const [maxMoop, setMaxMoop] = useState<number | null>(null);
  const [minGiveback, setMinGiveback] = useState<number>(0);
  const [minOtc, setMinOtc] = useState<number>(0);
  const [requiredBenefits, setRequiredBenefits] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>("premium-asc");
  const [quickPreset, setQuickPreset] = useState<QuickPreset>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const carriers = useMemo(() => {
    const set = new Set(allPlans.map((p) => p.carrier));
    return [...set].sort();
  }, [allPlans]);

  const filteredPlans = useMemo(() => {
    let result = allPlans;

    // Quick presets override individual controls
    switch (quickPreset) {
      case "zero-premium": result = result.filter((p) => p.premium_monthly === 0); break;
      case "highly-rated": result = result.filter((p) => (p.starRatingOverall ?? 0) >= 4.5); break;
      case "low-moop": result = result.filter((p) => p.outOfPocketMax > 0 && p.outOfPocketMax <= 5000); break;
      case "with-giveback": result = result.filter((p) => (p.partBGivebackAmount ?? 0) > 0); break;
      case "high-otc": result = result.filter((p) => (p.otcAllowanceAmount ?? 0) >= 45); break;
      case "ppo": result = result.filter((p) => p.networkType === "PPO"); break;
      case "hmo": result = result.filter((p) => p.networkType === "HMO"); break;
    }

    if (planTypeFilter) result = result.filter((p) => p.type === planTypeFilter);
    if (networkTypeFilter) result = result.filter((p) => p.networkType === networkTypeFilter);
    if (carrierFilter.length) result = result.filter((p) => carrierFilter.includes(p.carrier));
    if (zeroPremiumOnly) result = result.filter((p) => p.premium_monthly === 0);
    if (maxPremium !== null) result = result.filter((p) => p.premium_monthly <= maxPremium);
    if (maxMoop !== null) result = result.filter((p) => p.outOfPocketMax > 0 && p.outOfPocketMax <= maxMoop);
    if (minGiveback > 0) result = result.filter((p) => (p.partBGivebackAmount ?? 0) >= minGiveback);
    if (minOtc > 0) result = result.filter((p) => (p.otcAllowanceAmount ?? 0) >= minOtc);
    if (requiredBenefits.size) {
      result = result.filter((p) => {
        const b = p.benefits;
        for (const key of requiredBenefits) {
          switch (key) {
            case "dental": if (!b.dental) return false; break;
            case "vision": if (!b.vision) return false; break;
            case "hearing": if (!b.hearing) return false; break;
            case "otc": if (!b.otcAllowance) return false; break;
            case "giveback": if (!b.partBGiveback) return false; break;
          }
        }
        return true;
      });
    }

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "premium-asc": return a.premium_monthly - b.premium_monthly;
        case "premium-desc": return b.premium_monthly - a.premium_monthly;
        case "alpha": return a.name.localeCompare(b.name);
        case "moop-asc": return a.outOfPocketMax - b.outOfPocketMax;
        case "moop-desc": return b.outOfPocketMax - a.outOfPocketMax;
        case "rating-desc": return (b.starRatingOverall ?? 0) - (a.starRatingOverall ?? 0);
        case "drugcost-asc": return (drugEstimates[a.id]?.annualCost ?? Infinity) - (drugEstimates[b.id]?.annualCost ?? Infinity);
        default: return 0;
      }
    });

    return result;
  }, [allPlans, planTypeFilter, networkTypeFilter, carrierFilter, zeroPremiumOnly, maxPremium, maxMoop, minGiveback, minOtc, requiredBenefits, sortBy, drugEstimates, quickPreset]);

  const visiblePlans = filteredPlans.slice(0, visibleCount);

  const activeFilterCount = [
    planTypeFilter, networkTypeFilter, carrierFilter.length ? "carrier" : "",
    zeroPremiumOnly, maxPremium !== null, maxMoop !== null,
    minGiveback > 0, minOtc > 0, requiredBenefits.size > 0,
  ].filter(Boolean).length;

  function clearAll() {
    setPlanTypeFilter("");
    setNetworkTypeFilter("");
    setCarrierFilter([]);
    setZeroPremiumOnly(false);
    setMaxPremium(null);
    setMaxMoop(null);
    setMinGiveback(0);
    setMinOtc(0);
    setRequiredBenefits(new Set());
    setSortBy("premium-asc");
    setQuickPreset("all");
    setVisibleCount(PAGE_SIZE);
  }

  function loadMore() {
    setVisibleCount((c) => c + PAGE_SIZE);
  }

  // Preset counts — computed against base allPlans so tab labels reflect the full universe, not current filter
  const presetCounts = useMemo(() => ({
    all: allPlans.length,
    "zero-premium": allPlans.filter((p) => p.premium_monthly === 0).length,
    "highly-rated": allPlans.filter((p) => (p.starRatingOverall ?? 0) >= 4.5).length,
    "low-moop": allPlans.filter((p) => p.outOfPocketMax > 0 && p.outOfPocketMax <= 5000).length,
    "with-giveback": allPlans.filter((p) => (p.partBGivebackAmount ?? 0) > 0).length,
    "high-otc": allPlans.filter((p) => (p.otcAllowanceAmount ?? 0) >= 45).length,
    ppo: allPlans.filter((p) => p.networkType === "PPO").length,
    hmo: allPlans.filter((p) => p.networkType === "HMO").length,
  }), [allPlans]);

  return {
    planTypeFilter, networkTypeFilter, carrierFilter, zeroPremiumOnly,
    maxPremium, maxMoop, minGiveback, minOtc, requiredBenefits,
    sortBy, quickPreset,
    carriers, filteredPlans, visiblePlans, activeFilterCount, presetCounts, visibleCount,
    setPlanTypeFilter, setNetworkTypeFilter, setCarrierFilter, setZeroPremiumOnly,
    setMaxPremium, setMaxMoop, setMinGiveback, setMinOtc, setRequiredBenefits,
    setSortBy, setQuickPreset,
    clearAll, loadMore,
  };
}
