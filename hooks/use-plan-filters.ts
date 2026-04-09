"use client";

import { useState, useMemo } from "react";
import type { Under65Plan, MetalTier, PlanType } from "@/types/under65";

const PAGE_SIZE = 20;

export function usePlanFilters(allPlans: Under65Plan[]) {
  const [metalFilter, setMetalFilter] = useState<MetalTier[]>([]);
  const [typeFilter, setTypeFilter] = useState<PlanType[]>([]);
  const [hsaOnly, setHsaOnly] = useState(false);
  const [maxPremium, setMaxPremium] = useState("");
  const [sortBy, setSortBy] = useState("premium-asc");
  const [page, setPage] = useState(1);

  // Doctor / Rx coverage filter IDs
  const [doctorCoveredIds, setDoctorCoveredIds] = useState<Set<string> | null>(null);
  const [drugCoveredIds, setDrugCoveredIds] = useState<Set<string> | null>(null);

  const filteredPlans = useMemo(() => {
    let plans = [...allPlans];
    if (metalFilter.length) plans = plans.filter((p) => metalFilter.includes(p.metalTier));
    if (typeFilter.length) plans = plans.filter((p) => typeFilter.includes(p.planType as PlanType));
    if (hsaOnly) plans = plans.filter((p) => p.hsaEligible);
    if (maxPremium) plans = plans.filter((p) => p.netPremium <= Number(maxPremium));
    if (doctorCoveredIds) plans = plans.filter((p) => doctorCoveredIds.has(p.id));
    if (drugCoveredIds) plans = plans.filter((p) => drugCoveredIds.has(p.id));
    switch (sortBy) {
      case "premium-desc": plans.sort((a, b) => b.netPremium - a.netPremium); break;
      case "deductible-asc": plans.sort((a, b) => a.deductible - b.deductible); break;
      case "oop-asc": plans.sort((a, b) => a.outOfPocketMax - b.outOfPocketMax); break;
      default: plans.sort((a, b) => a.netPremium - b.netPremium);
    }
    return plans;
  }, [allPlans, metalFilter, typeFilter, hsaOnly, maxPremium, sortBy, doctorCoveredIds, drugCoveredIds]);

  const totalPages = Math.ceil(filteredPlans.length / PAGE_SIZE);
  const pagePlans = filteredPlans.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleMetal(tier: MetalTier) {
    setMetalFilter((prev) => prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier]);
    setPage(1);
  }

  function toggleType(type: PlanType) {
    setTypeFilter((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]);
    setPage(1);
  }

  const activeFilterCount =
    metalFilter.length + typeFilter.length +
    (hsaOnly ? 1 : 0) + (maxPremium ? 1 : 0) +
    (doctorCoveredIds ? 1 : 0) + (drugCoveredIds ? 1 : 0);

  function clearAll() {
    setMetalFilter([]);
    setTypeFilter([]);
    setHsaOnly(false);
    setMaxPremium("");
    setSortBy("premium-asc");
    setDoctorCoveredIds(null);
    setDrugCoveredIds(null);
    setPage(1);
  }

  return {
    metalFilter, typeFilter, hsaOnly, maxPremium, sortBy, page,
    doctorCoveredIds, drugCoveredIds,
    filteredPlans, pagePlans, totalPages, activeFilterCount,
    setHsaOnly, setMaxPremium, setSortBy, setPage,
    setDoctorCoveredIds, setDrugCoveredIds,
    toggleMetal, toggleType, clearAll,
    PAGE_SIZE,
  };
}
