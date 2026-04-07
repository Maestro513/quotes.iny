/**
 * CMS Benefits SQLite Query Layer
 * Ported from conci-fresh/backend/app/cms_lookup.py
 *
 * Queries cms_benefits.db for drug formulary, tier, copay, and restriction data.
 */

import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "cms_benefits.db");

// Known insulin brand names for IRA $35/month cap
const INSULIN_NAMES = [
  "humalog", "humulin", "lantus", "levemir", "novolog", "novolin",
  "basaglar", "admelog", "apidra", "toujeo", "tresiba", "fiasp",
  "lyumjev", "semglee", "rezvoglar", "insulin lispro", "insulin aspart",
  "insulin glargine", "insulin detemir", "insulin degludec",
  "insulin regular", "insulin nph", "insulin isophane",
];

const TIER_LABELS: Record<number, string> = {
  1: "Preferred Generic",
  2: "Generic",
  3: "Preferred Brand",
  4: "Non-Preferred Drug",
  5: "Specialty",
  6: "Select Care",
};

// Lazy singleton — opened once per process
let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH, { readonly: true });
    _db.pragma("journal_mode = WAL");
  }
  return _db;
}

function parsePlanNumber(planNumber: string): { contractId: string; planId: string } {
  const parts = planNumber.trim().toUpperCase().replace(/\s/g, "").split("-");
  return {
    contractId: parts[0] ?? "",
    planId: parts[1] ?? "000",
  };
}

function isInsulin(drugName: string): boolean {
  const lower = drugName.toLowerCase();
  return INSULIN_NAMES.some((name) => lower.includes(name));
}

function safeFloat(val: unknown): number | null {
  if (val == null || String(val).trim() === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

export interface DrugCoverage {
  rxcui: string;
  drugName: string;
  tier: number | null;
  tierLabel: string;
  costType: "copay" | "coinsurance";
  copayAmount: number | null;
  coinsurancePct: number | null;
  copayMail: number | null;
  costTypeMail: "copay" | "coinsurance";
  priorAuth: boolean;
  stepTherapy: boolean;
  quantityLimit: boolean;
  deductibleApplies: boolean;
  isInsulin: boolean;
  found: true;
}

export interface DrugNotFound {
  drugName: string;
  rxcui: string;
  found: false;
  error: string;
}

export type DrugLookupResult = DrugCoverage | DrugNotFound;

export interface PlanDeductible {
  drugDeductible: number;
  deductibleTiers: number[];
}

/**
 * Get the drug deductible for a plan from plan_formulary.
 */
export function getPlanDeductible(planNumber: string): PlanDeductible {
  const { contractId, planId } = parsePlanNumber(planNumber);
  const db = getDb();

  const row = db.prepare(
    `SELECT deductible FROM plan_formulary
     WHERE contract_id = ? AND plan_id = ? LIMIT 1`
  ).get(contractId, planId) as { deductible: unknown } | undefined;

  const deductible = safeFloat(row?.deductible) ?? 0;

  // CMS standard: tiers 3-5 typically have deductible. We check beneficiary_cost for actual flags.
  const tiers = db.prepare(
    `SELECT DISTINCT tier FROM beneficiary_cost
     WHERE contract_id = ? AND plan_id = ? AND ded_applies_yn = 'Y'`
  ).all(contractId, planId) as { tier: string }[];

  return {
    drugDeductible: deductible,
    deductibleTiers: tiers.map((t) => parseInt(t.tier)),
  };
}

/**
 * Look up a single drug's coverage for a plan by RXCUI.
 */
export function getDrugCoverage(
  planNumber: string,
  rxcui: string,
  drugName: string,
  daysSupply: number = 30,
): DrugLookupResult {
  const { contractId, planId } = parsePlanNumber(planNumber);
  const db = getDb();

  // Step 1: Plan → Formulary ID
  const puf = db.prepare(
    `SELECT formulary_id FROM plan_formulary
     WHERE contract_id = ? AND plan_id = ? LIMIT 1`
  ).get(contractId, planId) as { formulary_id: string } | undefined;

  if (!puf) return { drugName, rxcui, found: false, error: "Plan not found in formulary" };

  // Step 2: Formulary + RXCUI → tier + restrictions
  const drug = db.prepare(
    `SELECT tier_level_value, prior_authorization_yn, step_therapy_yn, quantity_limit_yn
     FROM formulary_drugs
     WHERE formulary_id = ? AND rxcui = ? LIMIT 1`
  ).get(puf.formulary_id, rxcui) as {
    tier_level_value: string;
    prior_authorization_yn: string;
    step_therapy_yn: string;
    quantity_limit_yn: string;
  } | undefined;

  if (!drug) return { drugName, rxcui, found: false, error: "Drug not on formulary" };

  const tier = drug.tier_level_value ? parseInt(drug.tier_level_value) : null;

  // Step 3: Tier → copay from beneficiary_cost
  const dsCode = daysSupply >= 90 ? "3" : daysSupply >= 60 ? "2" : "1";
  const dsCodes = dsCode !== "1" ? [dsCode, "1"] : ["1"];

  let cost: Record<string, unknown> | undefined;
  for (const ds of dsCodes) {
    cost = db.prepare(
      `SELECT cost_type_pref, cost_amt_pref, cost_type_nonpref, cost_amt_nonpref,
              cost_type_mail_pref, cost_amt_mail_pref,
              ded_applies_yn
       FROM beneficiary_cost
       WHERE contract_id = ? AND plan_id = ? AND tier = ? AND days_supply = ?
             AND coverage_level = '1'
       LIMIT 1`
    ).get(contractId, planId, String(tier), ds) as Record<string, unknown> | undefined;
    if (cost) break;
  }

  // Fallback without coverage_level filter
  if (!cost) {
    cost = db.prepare(
      `SELECT cost_type_pref, cost_amt_pref, cost_type_nonpref, cost_amt_nonpref,
              cost_type_mail_pref, cost_amt_mail_pref,
              ded_applies_yn
       FROM beneficiary_cost
       WHERE contract_id = ? AND plan_id = ? AND tier = ? AND days_supply = '1'
       LIMIT 1`
    ).get(contractId, planId, String(tier)) as Record<string, unknown> | undefined;
  }

  // Parse cost data
  let costType: "copay" | "coinsurance" = "copay";
  let copayAmount: number | null = null;
  let coinsurancePct: number | null = null;
  let copayMail: number | null = null;
  let costTypeMail: "copay" | "coinsurance" = "copay";
  let deductibleApplies = false;

  if (cost) {
    const rawType = String(cost.cost_type_pref ?? "0").trim();
    const prefAmt = safeFloat(cost.cost_amt_pref);

    if (rawType === "1") {
      costType = "coinsurance";
      coinsurancePct = prefAmt;
    } else if (prefAmt != null && prefAmt > 0) {
      costType = "copay";
      copayAmount = prefAmt;
    } else {
      // Preferred is $0 — fall back to non-preferred which often has real cost data
      const nonprefType = String(cost.cost_type_nonpref ?? "0").trim();
      const nonprefAmt = safeFloat(cost.cost_amt_nonpref);
      if (nonprefType === "2" && nonprefAmt != null && nonprefAmt > 0) {
        // CMS type 2 = coinsurance+copay combo, treat as coinsurance
        costType = "coinsurance";
        coinsurancePct = nonprefAmt * 100; // stored as decimal (0.25 = 25%)
      } else if (nonprefType === "1" && nonprefAmt != null && nonprefAmt > 0) {
        costType = "copay";
        copayAmount = nonprefAmt;
      } else {
        costType = "copay";
        copayAmount = 0;
      }
    }

    const mailType = String(cost.cost_type_mail_pref ?? "0").trim();
    if (mailType === "1") {
      costTypeMail = "coinsurance";
      copayMail = safeFloat(cost.cost_amt_mail_pref);
    } else {
      costTypeMail = "copay";
      copayMail = safeFloat(cost.cost_amt_mail_pref);
    }

    deductibleApplies = cost.ded_applies_yn === "Y";
  }

  return {
    rxcui,
    drugName,
    tier,
    tierLabel: TIER_LABELS[tier ?? 0] ?? `Tier ${tier}`,
    costType,
    copayAmount,
    coinsurancePct,
    copayMail,
    costTypeMail,
    priorAuth: drug.prior_authorization_yn === "Y",
    stepTherapy: drug.step_therapy_yn === "Y",
    quantityLimit: drug.quantity_limit_yn === "Y",
    deductibleApplies,
    isInsulin: isInsulin(drugName),
    found: true,
  };
}

/**
 * RxNorm API: drug name → RXCUIs.
 * Uses three strategies for reliable matching.
 */
export async function getRxcuisByName(drugName: string): Promise<string[]> {
  const rxcuis: string[] = [];
  const seen = new Set<string>();

  function add(id: string) {
    if (!seen.has(id)) {
      seen.add(id);
      rxcuis.push(id);
    }
  }

  try {
    // Strategy 1: /drugs endpoint
    const res1 = await fetch(
      `https://rxnav.nlm.nih.gov/REST/drugs.json?name=${encodeURIComponent(drugName)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    const data1 = await res1.json();
    for (const group of data1?.drugGroup?.conceptGroup ?? []) {
      for (const prop of group?.conceptProperties ?? []) {
        if (prop.rxcui) add(prop.rxcui);
      }
    }

    // Strategy 2: /approximateTerm (fuzzy — helps insulin brands)
    try {
      const res2 = await fetch(
        `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(drugName)}&maxEntries=20`,
        { signal: AbortSignal.timeout(3000) },
      );
      const data2 = await res2.json();
      for (const c of data2?.approximateGroup?.candidate ?? []) {
        if (c.rxcui) add(c.rxcui);
      }
    } catch {
      // Non-critical
    }

    // Strategy 3: ingredient-level fallback
    if (rxcuis.length === 0) {
      const res3 = await fetch(
        `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(drugName)}&search=2`,
        { signal: AbortSignal.timeout(3000) },
      );
      const data3 = await res3.json();
      for (const id of data3?.idGroup?.rxnormId ?? []) {
        add(id);
      }
    }
  } catch {
    // Total failure — return whatever we have
  }

  return rxcuis;
}

/**
 * Look up a drug by name for a plan. Resolves name → RXCUIs via RxNorm,
 * then checks each against the plan's formulary.
 */
export async function getDrugByName(
  planNumber: string,
  drugName: string,
  daysSupply: number = 30,
): Promise<DrugLookupResult> {
  const rxcuis = await getRxcuisByName(drugName);

  for (const rxcui of rxcuis) {
    const result = getDrugCoverage(planNumber, rxcui, drugName, daysSupply);
    if (result.found) return result;
  }

  return {
    drugName,
    rxcui: rxcuis[0] ?? "",
    found: false,
    error: `'${drugName}' not on this plan's formulary`,
  };
}
