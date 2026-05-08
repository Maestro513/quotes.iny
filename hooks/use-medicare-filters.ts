"use client";

import { useState, useMemo } from "react";
import type { MedicarePlan, MedicarePlanType, MedicareNetworkType, DrugEstimate } from "@/types/medicare";

/**
 * Annualize a benefit allowance string (e.g. "$300/qtr", "$50/mo", "$1500").
 * Returns 0 (not null) when missing, so caller can sum without null-checks.
 */
function annualizeAllowance(raw: string | undefined): number {
  if (!raw) return 0;
  const m = raw.match(/\$?([0-9][0-9,]*\.?\d*)/);
  if (!m) return 0;
  const num = parseFloat(m[1].replace(/,/g, ""));
  if (!isFinite(num) || num <= 0) return 0;
  const lower = raw.toLowerCase();
  if (lower.includes("/qtr") || lower.includes("quarterly") || lower.includes("/quarter")) return num * 4;
  if (lower.includes("/mo") || lower.includes("monthly") || lower.includes("/month")) return num * 12;
  return num;
}

/**
 * Composite "expected annual net cost" score — the lower, the better.
 *
 * Premium and deductible are full-weight (everyone pays premium; most enrollees
 * who use any care hit at least part of the deductible). MOOP gets 0.15 weight
 * because <10% of enrollees hit MOOP in a typical year, but a $11k cap is still
 * materially worse than a $3k cap and shouldn't be ignored. Allowances are
 * subtracted at 0.7 utilization (most enrollees don't claim 100% of dental/OTC/
 * hearing/vision/giveback benefits).
 *
 * The weights are deliberately conservative round numbers — refining them with
 * real claims data would be better, but these are defensible for a default sort.
 */
function netAnnualCostScore(plan: MedicarePlan): number {
  const annualPremium = plan.premium_monthly * 12;
  const deductible = plan.deductible;
  const moopRiskWeighted = plan.outOfPocketMax * 0.15;

  const b = plan.benefits;
  const allowancesAnnual =
    annualizeAllowance(b.dental) +
    annualizeAllowance(b.hearing) +
    annualizeAllowance(b.vision) +
    (plan.otcAllowanceAmount ? plan.otcAllowanceAmount * 12 : annualizeAllowance(b.otcAllowance)) +
    (plan.partBGivebackAmount ? plan.partBGivebackAmount * 12 : annualizeAllowance(b.partBGiveback));

  return annualPremium + deductible + moopRiskWeighted - allowancesAnnual * 0.7;
}

/**
 * SNP eligibility intake. Drives whether D-SNP / C-SNP plans appear in results.
 * Default = both false → SNP plans hidden (most users don't qualify; including
 * them would clutter results with plans they can't enroll in). When Medicaid
 * is on, D-SNP plans are surfaced. When chronic is on, C-SNP plans are surfaced.
 */
export interface SnpEligibility {
  medicaid: boolean;
  chronic: boolean;
}

export type SortOption =
  | "value-asc"
  | "premium-asc"
  | "premium-desc"
  | "alpha"
  | "moop-asc"
  | "moop-desc"
  | "rating-desc"
  | "drugcost-asc"
  | "deductible-asc"
  | "otc-desc";

/** Quick-filter preset tabs: one-click bundles that override individual filters. */
export type QuickPreset =
  | "all"
  | "zero-premium"
  | "highly-rated"
  | "low-moop"
  | "with-giveback"
  | "high-otc"
  | "ppo";

const PAGE_SIZE = 20;

export function useMedicareFilters(
  allPlans: MedicarePlan[],
  drugEstimates: Record<string, DrugEstimate> = {},
  initialSnp: Partial<SnpEligibility> = {}
) {
  const [planTypeFilter, setPlanTypeFilter] = useState<MedicarePlanType | "">("");
  const [networkTypeFilter, setNetworkTypeFilter] = useState<MedicareNetworkType | "">("");
  const [carrierFilter, setCarrierFilter] = useState<string[]>([]);
  const [zeroPremiumOnly, setZeroPremiumOnly] = useState(false);
  const [maxPremium, setMaxPremium] = useState<number | null>(null);
  const [maxMoop, setMaxMoop] = useState<number | null>(null);
  const [minGiveback, setMinGiveback] = useState<number>(0);
  const [minOtc, setMinOtc] = useState<number>(0);
  const [requiredBenefits, setRequiredBenefits] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>("value-asc");
  const [quickPreset, setQuickPreset] = useState<QuickPreset>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [medicaidEligible, setMedicaidEligible] = useState<boolean>(!!initialSnp.medicaid);
  const [chronicCondition, setChronicCondition] = useState<boolean>(!!initialSnp.chronic);

  const carriers = useMemo(() => {
    const set = new Set(allPlans.map((p) => p.carrier));
    return [...set].sort();
  }, [allPlans]);

  const filteredPlans = useMemo(() => {
    let result = allPlans;

    // SNP visibility: hide D-SNP / C-SNP / I-SNP unless user has opted in via
    // the eligibility toggles. Most visitors don't qualify, so surfacing SNP
    // plans by default would clutter results with plans they can't enroll in.
    result = result.filter((p) => {
      if (!p.snp) return true; // ordinary MA plans always show
      if (p.snp === "D-SNP" && medicaidEligible) return true;
      if (p.snp === "C-SNP" && chronicCondition) return true;
      // I-SNP (institutional) never auto-surfaces — niche population
      return false;
    });

    // Quick presets override individual controls
    switch (quickPreset) {
      case "zero-premium": result = result.filter((p) => p.premium_monthly === 0); break;
      case "highly-rated": result = result.filter((p) => (p.starRatingOverall ?? 0) >= 4.5); break;
      case "low-moop": result = result.filter((p) => p.outOfPocketMax > 0 && p.outOfPocketMax <= 5000); break;
      case "with-giveback": result = result.filter((p) => (p.partBGivebackAmount ?? 0) > 0); break;
      case "high-otc": result = result.filter((p) => (p.otcAllowanceAmount ?? 0) >= 45); break;
      case "ppo": result = result.filter((p) => p.networkType === "PPO"); break;
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
        case "value-asc": {
          // Composite "expected annual net cost" — lower wins.
          // Tiebreak by CMS stars (descending) so equally-priced plans surface
          // higher-rated ones first.
          const byCost = netAnnualCostScore(a) - netAnnualCostScore(b);
          if (byCost !== 0) return byCost;
          return (b.starRatingOverall ?? 0) - (a.starRatingOverall ?? 0);
        }
        case "premium-asc": return a.premium_monthly - b.premium_monthly;
        case "premium-desc": return b.premium_monthly - a.premium_monthly;
        case "alpha": return a.name.localeCompare(b.name);
        case "moop-asc": return a.outOfPocketMax - b.outOfPocketMax;
        case "moop-desc": return b.outOfPocketMax - a.outOfPocketMax;
        case "rating-desc": {
          // Stars are low-cardinality (0.5 increments) so tie often.
          // Tiebreak: cheaper premium, then lower MOOP.
          const byStars = (b.starRatingOverall ?? 0) - (a.starRatingOverall ?? 0);
          if (byStars !== 0) return byStars;
          const byPremium = a.premium_monthly - b.premium_monthly;
          if (byPremium !== 0) return byPremium;
          return a.outOfPocketMax - b.outOfPocketMax;
        }
        case "drugcost-asc": return (drugEstimates[a.id]?.annualCost ?? Infinity) - (drugEstimates[b.id]?.annualCost ?? Infinity);
        case "deductible-asc": {
          // Plans with $0 deductible should win — but a literal 0 < any positive,
          // so a plain ascending sort already handles that correctly.
          // Tiebreak by premium so two $0-deductible plans rank by cheapest.
          const byDed = a.deductible - b.deductible;
          if (byDed !== 0) return byDed;
          return a.premium_monthly - b.premium_monthly;
        }
        case "otc-desc": {
          // Higher OTC allowance wins. Plans without an OTC benefit (`undefined`)
          // sort to the bottom — coerce to 0 so they rank below any positive amount.
          return (b.otcAllowanceAmount ?? 0) - (a.otcAllowanceAmount ?? 0);
        }
        default: return 0;
      }
    });

    return result;
  }, [allPlans, planTypeFilter, networkTypeFilter, carrierFilter, zeroPremiumOnly, maxPremium, maxMoop, minGiveback, minOtc, requiredBenefits, sortBy, drugEstimates, quickPreset, medicaidEligible, chronicCondition]);

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
    setSortBy("value-asc");
    setQuickPreset("all");
    setVisibleCount(PAGE_SIZE);
    // Note: medicaidEligible / chronicCondition are NOT reset by clearAll.
    // They reflect a person's qualifying status, not a filter — wiping them
    // would silently hide D-SNP plans the user is qualified for.
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
  }), [allPlans]);

  return {
    planTypeFilter, networkTypeFilter, carrierFilter, zeroPremiumOnly,
    maxPremium, maxMoop, minGiveback, minOtc, requiredBenefits,
    sortBy, quickPreset,
    medicaidEligible, chronicCondition,
    carriers, filteredPlans, visiblePlans, activeFilterCount, presetCounts, visibleCount,
    setPlanTypeFilter, setNetworkTypeFilter, setCarrierFilter, setZeroPremiumOnly,
    setMaxPremium, setMaxMoop, setMinGiveback, setMinOtc, setRequiredBenefits,
    setSortBy, setQuickPreset,
    setMedicaidEligible, setChronicCondition,
    clearAll, loadMore,
  };
}
