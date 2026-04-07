/**
 * Drug Cost Engine — 12-month Medicare Part D simulation.
 * Ported from conci-fresh/backend/app/drug_cost_engine.py
 *
 * Simulates: Deductible → Initial Coverage → Catastrophic ($0 after $2k TrOOP)
 * Handles: copay, coinsurance, insulin $35 IRA cap, tier-specific deductibles.
 */

// 2026 Part D parameters (CMS standard)
const CATASTROPHIC_TROOP_THRESHOLD = 2000.0;
const DEFAULT_INSULIN_CAP = 35.0;

export interface DrugInput {
  name: string;
  tier: number | null;
  costType: "copay" | "coinsurance";
  copayAmount: number | null;
  coinsurancePct: number | null;
  estimatedFullCost: number | null;
  isInsulin: boolean;
  deductibleApplies: boolean;
}

interface MonthDrugCost {
  drug: string;
  memberCost: number;
  phase: "deductible" | "initial" | "deductible_to_initial" | "catastrophic";
  deductibleSpend: number;
}

interface MonthBreakdown {
  month: number;
  drugs: MonthDrugCost[];
  total: number;
}

interface DrugSummary {
  name: string;
  annualTotal: number;
  averageMonthly: number;
}

export interface SimulationResult {
  monthlyBreakdown: MonthBreakdown[];
  annualTotal: number;
  averageMonthly: number;
  drugsSummary: DrugSummary[];
}

export function computeAnnualDrugCosts(
  drugs: DrugInput[],
  drugDeductible: number = 0,
  deductibleTiers: number[] = [],
  insulinCap: number = DEFAULT_INSULIN_CAP,
  months: number = 12,
): SimulationResult {
  if (months <= 0 || drugs.length === 0) {
    return {
      monthlyBreakdown: [],
      annualTotal: 0,
      averageMonthly: 0,
      drugsSummary: drugs.map((d) => ({ name: d.name, annualTotal: 0, averageMonthly: 0 })),
    };
  }

  let deductibleRemaining = drugDeductible;
  let troopSpent = 0;

  const monthlyBreakdown: MonthBreakdown[] = [];
  const drugAnnualTotals = new Array(drugs.length).fill(0);

  for (let monthIdx = 0; monthIdx < months; monthIdx++) {
    const monthCosts: MonthDrugCost[] = [];
    let monthTotal = 0;

    for (let drugIdx = 0; drugIdx < drugs.length; drugIdx++) {
      const cost = calcDrugMonth(
        drugs[drugIdx],
        deductibleRemaining,
        deductibleTiers,
        insulinCap,
        troopSpent,
      );

      deductibleRemaining = Math.max(0, deductibleRemaining - cost.deductibleSpend);
      troopSpent += cost.memberCost;

      monthCosts.push(cost);
      monthTotal += cost.memberCost;
      drugAnnualTotals[drugIdx] += cost.memberCost;
    }

    monthlyBreakdown.push({
      month: monthIdx + 1,
      drugs: monthCosts,
      total: round2(monthTotal),
    });
  }

  const annualTotal = monthlyBreakdown.reduce((s, m) => s + m.total, 0);

  return {
    monthlyBreakdown,
    annualTotal: round2(annualTotal),
    averageMonthly: round2(annualTotal / months),
    drugsSummary: drugs.map((d, i) => ({
      name: d.name,
      annualTotal: round2(drugAnnualTotals[i]),
      averageMonthly: round2(drugAnnualTotals[i] / months),
    })),
  };
}

function calcDrugMonth(
  drug: DrugInput,
  deductibleRemaining: number,
  deductibleTiers: number[],
  insulinCap: number,
  troopSpent: number,
): MonthDrugCost {
  const name = drug.name;

  // Catastrophic phase: $0 after TrOOP threshold
  if (troopSpent >= CATASTROPHIC_TROOP_THRESHOLD) {
    return { drug: name, memberCost: 0, phase: "catastrophic", deductibleSpend: 0 };
  }

  const dedApplies = drug.deductibleApplies ||
    (drug.tier != null && deductibleTiers.includes(drug.tier));

  // Initial Coverage cost
  let icCost = calcInitialCoverageCost(drug);

  // Insulin cap
  if (drug.isInsulin && icCost > insulinCap) {
    icCost = insulinCap;
  }

  // Insulin: always pays IC rate, payment counts toward deductible
  if (drug.isInsulin) {
    const dedSpend = dedApplies && deductibleRemaining > 0
      ? Math.min(icCost, deductibleRemaining)
      : 0;
    return {
      drug: name,
      memberCost: round2(icCost),
      phase: dedApplies && deductibleRemaining > 0 ? "deductible" : "initial",
      deductibleSpend: round2(dedSpend),
    };
  }

  // Non-insulin: no estimated cost → fall back to IC cost
  const fullCost = drug.estimatedFullCost;
  if (fullCost == null || fullCost <= 0) {
    return { drug: name, memberCost: round2(icCost), phase: "initial", deductibleSpend: 0 };
  }

  // Deductible doesn't apply or already cleared
  if (!dedApplies || deductibleRemaining <= 0) {
    return { drug: name, memberCost: round2(icCost), phase: "initial", deductibleSpend: 0 };
  }

  // Deductible still active
  if (deductibleRemaining >= fullCost) {
    // Entire fill is in deductible — member pays full retail
    return {
      drug: name,
      memberCost: round2(fullCost),
      phase: "deductible",
      deductibleSpend: round2(fullCost),
    };
  }

  // Deductible clears on this fill — pay remaining deductible + IC cost
  return {
    drug: name,
    memberCost: round2(deductibleRemaining + icCost),
    phase: "deductible_to_initial",
    deductibleSpend: round2(deductibleRemaining),
  };
}

function calcInitialCoverageCost(drug: DrugInput): number {
  if (drug.costType === "copay" && drug.copayAmount != null) {
    return drug.copayAmount;
  }

  if (drug.costType === "coinsurance" && drug.coinsurancePct != null) {
    if (drug.estimatedFullCost != null && drug.estimatedFullCost > 0) {
      return (drug.coinsurancePct / 100) * drug.estimatedFullCost;
    }
    return 0;
  }

  return 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
