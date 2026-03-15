import type { MedicarePlan, MedicarePlanType } from "@/types/medicare";

export interface MedicareSearchParams {
  zip: string;
  planType?: MedicarePlanType;
}

export async function fetchMedicarePlans(
  params: MedicareSearchParams
): Promise<MedicarePlan[]> {
  const res = await fetch(`/api/medicare/plans?zip=${params.zip}`);
  if (!res.ok) throw new Error("Failed to fetch Medicare plans");
  const plans: MedicarePlan[] = await res.json();

  const filtered = params.planType
    ? plans.filter((p) => p.type === params.planType)
    : plans;

  return filtered.sort((a, b) => a.premium_monthly - b.premium_monthly);
}
