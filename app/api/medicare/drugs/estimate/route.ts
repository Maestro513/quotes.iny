import { NextRequest, NextResponse } from "next/server";
import { getDrugByName, getPlanDeductible, type DrugCoverage } from "@/lib/medicare/cms-db";
import { computeAnnualDrugCosts, type DrugInput } from "@/lib/medicare/drug-cost-engine";

interface DrugRequest {
  name: string;
  rxcui?: string;
}

interface PlanEstimate {
  annualCost: number;
  uncoveredDrugs: string[];
}

/**
 * POST /api/medicare/drugs/estimate
 * Input: { planIds: string[], drugs: [{ name, rxcui? }] }
 * Returns: { estimates: Record<planId, { annualCost, uncoveredDrugs }> }
 */
export async function POST(req: NextRequest) {
  const { planIds, drugs } = (await req.json()) as {
    planIds: string[];
    drugs: DrugRequest[];
  };

  if (!planIds?.length || !drugs?.length) {
    return NextResponse.json({ estimates: {} });
  }

  // Resolve drug names → coverage per plan in parallel
  const estimates: Record<string, PlanEstimate> = {};

  await Promise.all(
    planIds.map(async (planId) => {
      try {
        const { drugDeductible, deductibleTiers } = getPlanDeductible(planId);

        // Look up each drug for this plan
        const lookups = await Promise.all(
          drugs.map((d) => getDrugByName(planId, d.name))
        );

        const uncoveredDrugs: string[] = [];
        const drugInputs: DrugInput[] = [];

        for (const lookup of lookups) {
          if (!lookup.found) {
            uncoveredDrugs.push(lookup.drugName);
            continue;
          }

          const cov = lookup as DrugCoverage;
          // CMS PUF doesn't include negotiated prices. Use tier-based estimates
          // for coinsurance drugs and deductible-phase modeling.
          const TIER_COST_ESTIMATES: Record<number, number> = {
            1: 15, 2: 30, 3: 150, 4: 300, 5: 600, 6: 100,
          };
          const estCost = TIER_COST_ESTIMATES[cov.tier ?? 3] ?? 150;

          drugInputs.push({
            name: cov.drugName,
            tier: cov.tier,
            costType: cov.costType,
            copayAmount: cov.copayAmount,
            coinsurancePct: cov.coinsurancePct,
            estimatedFullCost: estCost,
            isInsulin: cov.isInsulin,
            deductibleApplies: cov.deductibleApplies,
          });
        }

        if (drugInputs.length === 0) {
          estimates[planId] = { annualCost: 0, uncoveredDrugs };
          return;
        }

        const result = computeAnnualDrugCosts(
          drugInputs,
          drugDeductible,
          deductibleTiers,
        );

        estimates[planId] = {
          annualCost: result.annualTotal,
          uncoveredDrugs,
        };
      } catch (err) {
        console.error(`Drug estimate failed for plan ${planId}:`, err);
        estimates[planId] = { annualCost: 0, uncoveredDrugs: drugs.map((d) => d.name) };
      }
    })
  );

  return NextResponse.json({ estimates });
}
