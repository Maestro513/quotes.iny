import type { MedicarePlan } from "@/types/medicare";

/**
 * Three recommendation axes ranked across the current filtered set.
 * Each axis surfaces top-3 plans as Strong (rank 1) / Solid (rank 2-3).
 *
 * - lowest-moop: catastrophic-cost protection. Lower MOOP = stronger.
 * - lowest-copays: per-visit cost. Sum of primary + specialist copays. Plans
 *   that quote coinsurance (% of cost) instead of a flat $ are excluded —
 *   coinsurance % is not directly comparable across plans (depends on the
 *   underlying service cost), and ranking them would mislead.
 * - most-allowances: total extra-benefit dollars. Sum of dental + hearing +
 *   vision + OTC + Part B giveback (giveback annualized to $/yr). Higher = stronger.
 */
export type TierCategory = "lowest-moop" | "lowest-copays" | "most-allowances";

export type TierLevel = "strong" | "solid";

export type TierBadge = {
  category: TierCategory;
  tier: TierLevel;
  label: string;
};

const CATEGORY_LABEL: Record<TierCategory, string> = {
  "lowest-moop": "Protection",
  "lowest-copays": "Copays",
  "most-allowances": "Allowances",
};

/** ASCENDING categories: smallest value wins (e.g. lowest cost is best). */
const ASCENDING: ReadonlySet<TierCategory> = new Set(["lowest-moop", "lowest-copays"]);

function parseAllowance(raw: string | undefined): number | null {
  if (!raw) return null;
  const matches = raw.match(/\$?([0-9][0-9,]*\.?\d*)/);
  if (!matches) return null;
  const num = parseFloat(matches[1].replace(/,/g, ""));
  if (!isFinite(num) || num <= 0) return null;

  const lower = raw.toLowerCase();
  if (lower.includes("/qtr") || lower.includes("quarterly") || lower.includes("/quarter")) {
    return num * 4;
  }
  if (lower.includes("/mo") || lower.includes("monthly") || lower.includes("/month")) {
    return num * 12;
  }
  return num;
}

/**
 * Parse a copay string like "$45 copay" or "$0" to a dollar amount.
 * Returns null for coinsurance ("20% coinsurance") — incomparable across plans.
 */
function parseCopayDollar(raw: string | undefined): number | null {
  if (!raw) return null;
  if (/%|coinsurance/i.test(raw)) return null;
  const m = raw.match(/\$?([0-9][0-9,]*\.?\d*)/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  return isFinite(n) ? n : null;
}

function getCategoryScore(plan: MedicarePlan, category: TierCategory): number | null {
  const b = plan.benefits;
  switch (category) {
    case "lowest-moop": {
      // $0 MOOP for an MA plan is a data hole, not a real value — exclude from ranking.
      // Part D plans (no MOOP concept) also get excluded since `outOfPocketMax` is 0.
      return plan.outOfPocketMax > 0 ? plan.outOfPocketMax : null;
    }
    case "lowest-copays": {
      const primary = parseCopayDollar(b.primaryCare);
      const specialist = parseCopayDollar(b.specialist);
      // Both must be present and dollar-valued. If either is coinsurance, skip ranking
      // this plan — we can't meaningfully sum or compare with the rest.
      if (primary === null || specialist === null) return null;
      return primary + specialist;
    }
    case "most-allowances": {
      const dental = parseAllowance(b.dental) ?? 0;
      const hearing = parseAllowance(b.hearing) ?? 0;
      const vision = parseAllowance(b.vision) ?? 0;
      const otc = plan.otcAllowanceAmount ?? parseAllowance(b.otcAllowance) ?? 0;
      // Part B giveback is monthly cash. parseAllowance returns the value as-given;
      // if it was tagged "/mo" the helper has already annualized. Otherwise we
      // multiply the raw numeric `partBGivebackAmount` (which is $/mo) by 12.
      const givebackParsed = parseAllowance(b.partBGiveback);
      const givebackAnnual = givebackParsed ?? (plan.partBGivebackAmount ? plan.partBGivebackAmount * 12 : 0);
      const total = dental + hearing + vision + otc + givebackAnnual;
      return total > 0 ? total : null;
    }
  }
}

const CATEGORIES: TierCategory[] = ["lowest-moop", "lowest-copays", "most-allowances"];

export function computeTierBadges(plans: MedicarePlan[]): Map<string, TierBadge[]> {
  const badgesByPlanId = new Map<string, TierBadge[]>();

  for (const category of CATEGORIES) {
    const ascending = ASCENDING.has(category);
    const ranked = plans
      .map((p) => ({ id: p.id, value: getCategoryScore(p, category) }))
      .filter((r): r is { id: string; value: number } => r.value !== null)
      .sort((a, b) => (ascending ? a.value - b.value : b.value - a.value));

    ranked.slice(0, 3).forEach((r, i) => {
      const tier: TierLevel = i === 0 ? "strong" : "solid";
      const badge: TierBadge = {
        category,
        tier,
        label: `${tier === "strong" ? "Strong" : "Solid"} ${CATEGORY_LABEL[category]}`,
      };
      const existing = badgesByPlanId.get(r.id) ?? [];
      existing.push(badge);
      badgesByPlanId.set(r.id, existing);
    });
  }

  return badgesByPlanId;
}
