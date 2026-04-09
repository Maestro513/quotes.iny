"use client";

import { useState, useMemo } from "react";
import type { MedicarePlan, MedicarePlanType, DrugEstimate } from "@/types/medicare";

export type SortOption = "premium-asc" | "premium-desc" | "alpha" | "moop-asc" | "moop-desc" | "rating-desc" | "drugcost-asc";

const PAGE_SIZE = 20;

export function useMedicareFilters(allPlans: MedicarePlan[], drugEstimates: Record<string, DrugEstimate> = {}) {
  const [planTypeFilter, setPlanTypeFilter] = useState<MedicarePlanType | "">("");
  const [carrierFilter, setCarrierFilter] = useState("");
  const [zeroPremiumOnly, setZeroPremiumOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("premium-asc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const carriers = useMemo(() => {
    const set = new Set(allPlans.map((p) => p.carrier));
    return [...set].sort();
  }, [allPlans]);

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
        case "rating-desc": return (b.starRatingOverall ?? 0) - (a.starRatingOverall ?? 0);
        case "drugcost-asc": return (drugEstimates[a.id]?.annualCost ?? Infinity) - (drugEstimates[b.id]?.annualCost ?? Infinity);
        default: return 0;
      }
    });

    return result;
  }, [allPlans, planTypeFilter, carrierFilter, zeroPremiumOnly, sortBy, drugEstimates]);

  const visiblePlans = filteredPlans.slice(0, visibleCount);
  const activeFilterCount = [planTypeFilter, carrierFilter, zeroPremiumOnly].filter(Boolean).length;

  function clearAll() {
    setPlanTypeFilter("");
    setCarrierFilter("");
    setZeroPremiumOnly(false);
    setSortBy("premium-asc");
    setVisibleCount(PAGE_SIZE);
  }

  function loadMore() {
    setVisibleCount((c) => c + PAGE_SIZE);
  }

  return {
    planTypeFilter, carrierFilter, zeroPremiumOnly, sortBy,
    carriers, filteredPlans, visiblePlans, activeFilterCount,
    setPlanTypeFilter, setCarrierFilter, setZeroPremiumOnly, setSortBy,
    clearAll, loadMore, visibleCount,
  };
}
