export type MetalTier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Catastrophic";
export type PlanType = "HMO" | "PPO" | "EPO" | "POS";

export interface Under65Plan {
  id: string;
  name: string;
  carrier: string;
  metalTier: MetalTier;
  planType: PlanType | string;
  hsaEligible: boolean;
  monthlyPremium: number;
  deductible: number;
  outOfPocketMax: number;
  estimatedSubsidy: number;
  netPremium: number;
}
