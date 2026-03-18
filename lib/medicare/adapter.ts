import type { MedicarePlan, MedicarePlanType } from "@/types/medicare";

export interface MedicareSearchParams {
  zip: string;
  planType?: MedicarePlanType;
  page?: number;
}

export interface MedicareSearchResult {
  plans: MedicarePlan[];
  total: number;
  page: number;
}

export async function fetchMedicarePlans(
  params: MedicareSearchParams
): Promise<MedicareSearchResult> {
  const qs = new URLSearchParams();
  if (params.zip) qs.set("zip", params.zip);
  if (params.page) qs.set("page", String(params.page));
  if (params.planType) qs.set("planType", params.planType);

  const res = await fetch(`/api/medicare/plans?${qs.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch Medicare plans");

  const data = await res.json();

  const plans: MedicarePlan[] = (data.plans ?? data).sort(
    (a: MedicarePlan, b: MedicarePlan) => a.premium_monthly - b.premium_monthly
  );

  return { plans, total: data.total ?? plans.length, page: data.page ?? 1 };
}
