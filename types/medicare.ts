export type MedicarePlanType = "MA" | "Supplement" | "PartD";

export interface MedicareBenefits {
  primaryCare: string;
  specialist: string;
  emergencyRoom: string;
  urgentCare: string;
  rxCoverage: string;
  dental?: string;
  vision?: string;
  hearing?: string;
}

export interface MedicarePlan {
  id: string;
  name: string;
  type: MedicarePlanType;
  carrier: string;
  premium_monthly: number;
  deductible: number;
  outOfPocketMax: number;
  starRating?: number;
  benefits: MedicareBenefits;
  highlights: string[];
  county: string;
  zip_codes: string[];
}
