import type { LifePlan } from "@/types/life";

export const mockLifePlans: LifePlan[] = [
  {
    id: "life-1",
    name: "Haven Term 20",
    carrier: "Haven Life",
    type: "Term",
    monthlyPremium: 28,
    coverageAmount: "250k",
    term: "20yr",
  },
  {
    id: "life-2",
    name: "Ladder Term 20",
    carrier: "Ladder",
    type: "Term",
    monthlyPremium: 22,
    coverageAmount: "250k",
    term: "20yr",
  },
  {
    id: "life-3",
    name: "Northwestern Whole Life Select",
    carrier: "Northwestern Mutual",
    type: "Whole",
    monthlyPremium: 195,
    coverageAmount: "250k",
    term: "Whole Life",
  },
  {
    id: "life-4",
    name: "Pacific Life Promise Term 30",
    carrier: "Pacific Life",
    type: "Term",
    monthlyPremium: 48,
    coverageAmount: "500k",
    term: "30yr",
  },
];
