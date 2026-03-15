export type MedicarePlanType = "MA" | "Supplement" | "PartD";

export interface MedicarePlan {
  id: string;
  name: string;
  type: MedicarePlanType;
  carrier: string;
  premium_monthly: number;
  highlights: string[];
  county: string;
  zip_codes: string[];
}
