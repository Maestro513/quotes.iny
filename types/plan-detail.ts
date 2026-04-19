/**
 * Raw shape of a plan JSON in data/extracted_cms/ after the Claude SOB merge.
 * Matches the output of iny-assets/convert_benefits_to_sections.py plus the
 * existing fields carried from CMS PBP 2026 data.
 */
export interface PlanRow {
  label: string;
  value: string;
}

export interface PlanSection {
  title: string;
  icon?: string;
  rows: PlanRow[];
}

export interface PlanDetail {
  plan_id: string;               // "H0609-048" (2-seg) or "H0609-048-001" (3-seg split)
  plan_id_full?: string;         // always 3-seg form, e.g. "H0609-048-000"
  plan_name: string;
  carrier: string;
  contract_number: string;
  org_name?: string;
  plan_type: string;             // "HMO" | "HMO-POS" | "PPO" | "HMO D-SNP" | etc.
  snp_type?: string | null;      // "D-SNP" | "C-SNP" | "I-SNP" | null
  geographic_area?: string;
  states?: string;               // "CO" | "NY, PA" | etc.
  counties_count?: string;
  source?: string;               // "CMS PBP 2026"

  // Price card fields
  monthly_premium?: string;
  annual_deductible_in?: string;
  annual_deductible_out?: string;
  moop_in?: string;
  moop_out?: string;
  moop_combined?: string;
  drug_deductible?: string;
  part_b_premium_reduction?: string | null;

  // Ratings (CMS)
  star_rating_overall?: number | null;
  star_rating_part_c?: number | null;
  star_rating_part_d?: number | null;

  // Filters
  eghp?: boolean;                // employer group — exclude from general consumer search
  channel?: "employer_group" | string;
  pace?: boolean;
  platino?: boolean;

  // Section-organized benefit rows
  sections: PlanSection[];
}
