export type MedicarePlanType = "MA" | "Supplement" | "PartD";
export type MedicareNetworkType = "HMO" | "PPO" | "HMO-POS" | "PFFS" | "Other";

/**
 * Special Needs Plan designation (per CMS).
 * - D-SNP: Dual-eligible (Medicare + Medicaid). FIDE/HIDE are integrated D-SNP variants.
 * - C-SNP: Chronic condition (diabetes, ESRD, HIV/AIDS, cardiovascular, etc.)
 * - I-SNP: Institutional (long-term care residents)
 */
export type MedicareSnpType = "D-SNP" | "C-SNP" | "I-SNP";

export interface MedicareBenefits {
  primaryCare: string;
  specialist: string;
  emergencyRoom: string;
  urgentCare: string;
  rxCoverage: string;
  dental?: string;
  vision?: string;
  hearing?: string;
  otcAllowance?: string;
  partBGiveback?: string;
}

export interface MedicarePlan {
  id: string;
  name: string;
  type: MedicarePlanType;
  networkType?: MedicareNetworkType;
  carrier: string;
  premium_monthly: number;
  deductible: number;
  outOfPocketMax: number;
  starRatingOverall?: number;
  starRatingPartC?: number;
  starRatingPartD?: number;
  benefits: MedicareBenefits;
  partBGivebackAmount?: number;
  otcAllowanceAmount?: number;
  /** Special Needs Plan type, undefined for general MA plans. */
  snp?: MedicareSnpType;
  highlights: string[];
  county: string;
  zip_codes: string[];
}

export interface DrugEstimate {
  annualCost: number;
  uncoveredDrugs: string[];
}
