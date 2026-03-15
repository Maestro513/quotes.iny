export type MetalTier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Catastrophic";

export interface Under65Plan {
  id: string;
  name: string;
  carrier: string;
  metalTier: MetalTier;
  monthlyPremium: number;
  deductible: number;
  outOfPocketMax: number;
  estimatedSubsidy: number;
  netPremium: number;
}
