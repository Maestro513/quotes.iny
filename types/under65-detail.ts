/**
 * Rich CMS Marketplace plan detail shape, captured from /plans/search responses.
 * Everything here is optional because CMS fills in different subsets per plan —
 * always guard reads in the UI.
 */

export interface CmsCostSharing {
  network_tier?: string;
  display_string?: string;
  coinsurance_rate?: number;
  coinsurance_options?: string;
  copay_amount?: number;
  copay_options?: string;
}

export interface CmsBenefit {
  type?: string;
  name?: string;
  covered?: boolean;
  cost_sharings?: CmsCostSharing[];
  explanation?: string;
  exclusions?: string;
  limit?: string;
  has_limits?: boolean;
  has_exclusions?: boolean;
}

export interface CmsDeductible {
  type?: string;
  amount?: number;
  network_tier?: string;
  family_cost?: string;
  csr?: string;
  individual?: number;
  family?: number;
}

export interface CmsMoop {
  type?: string;
  amount?: number;
  network_tier?: string;
  family_cost?: string;
  individual?: number;
  family?: number;
}

export interface CmsIssuer {
  name?: string;
  hios_id?: string;
  toll_free?: string;
  state?: string;
  shop_url?: string;
  marketing_url?: string;
  individual_consumer_email_address?: string;
}

export interface CmsQualityRating {
  global_rating?: number;
  enrollee_experience_rating?: number;
  clinical_quality_management_rating?: number;
  plan_efficiency_rating?: number;
}

export interface CmsPlanDetail {
  id: string;
  name: string;
  issuer?: CmsIssuer;
  metal_level?: string;
  type?: string;
  hsa_eligible?: boolean;
  premium?: number;
  premium_w_credit?: number;
  ehb_premium?: number;
  aptc_eligible_premium?: number;
  deductibles?: CmsDeductible[];
  moops?: CmsMoop[];
  benefits?: CmsBenefit[];
  quality_rating?: CmsQualityRating;
  has_national_network?: boolean;
  specialist_referral_required?: boolean;
  languages?: string[];
  disclaimer?: string;
  plan_url?: string;
  brochure_url?: string;
  formulary_url?: string;
  network_url?: string;
  service_area_id?: string;
}

export interface Under65DetailContext {
  zip: string;
  countyfips: string;
  state: string;
  annualIncome: number;
  age: number;
  householdSize: number;
}

export interface Under65DetailResponse {
  plan: CmsPlanDetail;
  context: Under65DetailContext;
}
