import type { LifePlan } from "@/types/life";
import type { CoverageAmount, TermLength } from "@/types/life";
import { mockLifePlans } from "./mock";

export interface LifeSearchParams {
  zip: string;
  dob: string;
  gender: string;
  coverageAmount: CoverageAmount;
  termLength: TermLength;
}

export async function fetchLifePlans(
  params: LifeSearchParams
): Promise<LifePlan[]> {
  const enabled = process.env.NEXT_PUBLIC_LIFE_API_ENABLED === "true";
  if (!enabled) {
    await new Promise((r) => setTimeout(r, 600));
    return mockLifePlans
      .filter(
        (p) =>
          p.coverageAmount === params.coverageAmount ||
          params.termLength === "Whole Life"
      )
      .sort((a, b) => a.monthlyPremium - b.monthlyPremium);
  }
  // TODO: Replace with real Life API call when NEXT_PUBLIC_LIFE_API_ENABLED=true
  throw new Error("Life API not yet configured");
}
