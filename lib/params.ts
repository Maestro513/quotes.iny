export type IncomeRange = "0-25k" | "25-50k" | "50-75k" | "75k+";

export interface QuoteParams {
  zip: string;
  dob: string;
  gender: string;
  income: string;
}

const ZIP_RE = /^\d{5}$/;
const DOB_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseParams(searchParams: URLSearchParams): QuoteParams {
  const zip = searchParams.get("zip") ?? "";
  const dob = searchParams.get("dob") ?? "";
  const gender = searchParams.get("gender") ?? "";
  const income = searchParams.get("income") ?? "";

  return {
    zip: ZIP_RE.test(zip) ? zip : "",
    dob: DOB_RE.test(dob) ? dob : "",
    gender: ["male", "female", "other"].includes(gender.toLowerCase()) ? gender : "",
    income,
  };
}

const INCOME_MAP: Record<IncomeRange, number> = {
  "0-25k": 12500,
  "25-50k": 37500,
  "50-75k": 62500,
  "75k+": 90000,
};

export function incomeToMidpoint(range: IncomeRange): number {
  return INCOME_MAP[range] ?? 0;
}
