"use client";

import { useState, useMemo } from "react";
import type { MedicarePlan, MedicarePlanType, MedicareNetworkType, DrugEstimate } from "@/types/medicare";

export type SortOption =
  | "premium-asc"
  | "premium-desc"
  | "rating-desc"
  | "moop-asc"
  | "giveback-desc"
  | "otc-desc"
  | "drugcost-asc"
  | "alpha";

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
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const carriers = useMemo(() => {
    const set = new Set(allPlans.map((p) => p.carrier));
    return [...set].sort();
  }, [allPlans]);

  const filteredPlans = useMemo(() => {
    let result = allPlans;

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
        case "rating-desc": return (b.starRatingOverall ?? 0) - (a.starRatingOverall ?? 0);
        case "moop-asc": {
          // Plans with $0 or missing MOOP sort to the bottom (likely data gap, not genuinely unlimited)
          const am = a.outOfPocketMax > 0 ? a.outOfPocketMax : Infinity;
          const bm = b.outOfPocketMax > 0 ? b.outOfPocketMax : Infinity;
          return am - bm;
        }
        case "giveback-desc": return (b.partBGivebackAmount ?? 0) - (a.partBGivebackAmount ?? 0);
        case "otc-desc": return (b.otcAllowanceAmount ?? 0) - (a.otcAllowanceAmount ?? 0);
        case "drugcost-asc": return (drugEstimates[a.id]?.annualCost ?? Infinity) - (drugEstimates[b.id]?.annualCost ?? Infinity);
        case "alpha": return a.name.localeCompare(b.name);
        default: return 0;
      }
    });

    return result;
  }, [allPlans, planTypeFilter, networkTypeFilter, carrierFilter, zeroPremiumOnly, maxPremium, maxMoop, minGiveback, minOtc, requiredBenefits, sortBy, drugEstimates]);

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
    setVisibleCount(PAGE_SIZE);
  }

  function loadMore() {
    setVisibleCount((c) => c + PAGE_SIZE);
  }

  return {
    planTypeFilter, networkTypeFilter, carrierFilter, zeroPremiumOnly,
    maxPremium, maxMoop, minGiveback, minOtc, requiredBenefits, sortBy,
    carriers, filteredPlans, visiblePlans, activeFilterCount, visibleCount,
    setPlanTypeFilter, setNetworkTypeFilter, setCarrierFilter, setZeroPremiumOnly,
    setMaxPremium, setMaxMoop, setMinGiveback, setMinOtc, setRequiredBenefits, setSortBy,
    clearAll, loadMore,
  };
}
