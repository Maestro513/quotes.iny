import type { MedicarePlan } from "@/types/medicare";

export type TierCategory = "dental" | "hearing" | "vision" | "partBGiveback" | "otc";

export type TierLevel = "strong" | "solid";

export type TierBadge = {
  category: TierCategory;
  tier: TierLevel;
  label: string;
};

const CATEGORY_LABEL: Record<TierCategory, string> = {
  dental: "Dental",
  hearing: "Hearing",
  vision: "Vision",
  partBGiveback: "Part B Giveback",
  otc: "OTC",
};

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

function getCategoryValue(plan: MedicarePlan, category: TierCategory): number | null {
  const b = plan.benefits;
  switch (category) {
    case "dental": return parseAllowance(b.dental);
    case "hearing": return parseAllowance(b.hearing);
    case "vision": return parseAllowance(b.vision);
    case "partBGiveback": return parseAllowance(b.partBGiveback);
    case "otc": return parseAllowance(b.otcAllowance);
  }
}

const CATEGORIES: TierCategory[] = ["dental", "hearing", "vision", "partBGiveback", "otc"];

export function computeTierBadges(plans: MedicarePlan[]): Map<string, TierBadge[]> {
  const badgesByPlanId = new Map<string, TierBadge[]>();

  for (const category of CATEGORIES) {
    const ranked = plans
      .map((p) => ({ id: p.id, value: getCategoryValue(p, category) }))
      .filter((r): r is { id: string; value: number } => r.value !== null)
      .sort((a, b) => b.value - a.value);

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
