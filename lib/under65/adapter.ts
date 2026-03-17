import type { Under65Plan } from "@/types/under65";

export interface Under65SearchParams {
  zip: string;
  dob: string;
  gender: string;
  income: string;
  tobacco: boolean;
  householdSize: number;
  coverageStartDate: string;
}

export async function fetchUnder65Plans(
  params: Under65SearchParams
): Promise<Under65Plan[]> {
  const res = await fetch("/api/under65/plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) throw new Error("Failed to fetch plans");

  const plans: Under65Plan[] = await res.json();
  return plans.sort((a, b) => a.netPremium - b.netPremium);
}
