import type { Under65Plan } from "@/types/under65";
import { mockUnder65Plans } from "./mock";

export interface Under65SearchParams {
  zip: string;
  dob: string;
  gender: string;
  income: string;
  tobacco: boolean;
  householdSize: number;
  coverageStartDate: string;
}

export async function fetchUnder65Plans(
  _params: Under65SearchParams
): Promise<Under65Plan[]> {
  // TODO: Replace with Marketplace API call when credentials are available
  await new Promise((r) => setTimeout(r, 600));
  return [...mockUnder65Plans].sort((a, b) => a.netPremium - b.netPremium);
}
