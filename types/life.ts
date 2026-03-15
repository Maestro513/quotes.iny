export type LifePlanType = "Term" | "Whole" | "Universal";
export type CoverageAmount = "100k" | "250k" | "500k" | "1M+";
export type TermLength = "10yr" | "20yr" | "30yr" | "Whole Life";

export interface LifePlan {
  id: string;
  name: string;
  carrier: string;
  type: LifePlanType;
  monthlyPremium: number;
  coverageAmount: CoverageAmount;
  term: TermLength;
}
