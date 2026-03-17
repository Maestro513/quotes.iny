import type { Under65Plan } from "@/types/under65";

export const mockUnder65Plans: Under65Plan[] = [
  {
    id: "u65-1",
    name: "Blue Select Silver 3500",
    carrier: "Florida Blue",
    metalTier: "Silver", planType: "PPO", hsaEligible: false,
    monthlyPremium: 420, deductible: 3500, outOfPocketMax: 8700, estimatedSubsidy: 180, netPremium: 240,
  },
  {
    id: "u65-2", name: "Ambetter Essential Care Bronze", carrier: "Ambetter",
    metalTier: "Bronze", planType: "HMO", hsaEligible: true,
    monthlyPremium: 290, deductible: 7000, outOfPocketMax: 9100, estimatedSubsidy: 90, netPremium: 200,
  },
  {
    id: "u65-3", name: "Oscar Simple Silver", carrier: "Oscar Health",
    metalTier: "Silver", planType: "EPO", hsaEligible: false,
    monthlyPremium: 395, deductible: 4000, outOfPocketMax: 8500, estimatedSubsidy: 200, netPremium: 195,
  },
  {
    id: "u65-4", name: "UHC Gold Choice Plus", carrier: "UnitedHealthcare",
    metalTier: "Gold", planType: "PPO", hsaEligible: false,
    monthlyPremium: 560, deductible: 1500, outOfPocketMax: 6000, estimatedSubsidy: 220, netPremium: 340,
  },
];
