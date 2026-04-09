import { parseParams, incomeToMidpoint, type IncomeRange } from "@/lib/params";

function makeSearchParams(obj: Record<string, string>) {
  return new URLSearchParams(obj);
}

describe("parseParams", () => {
  it("parses valid ZIP, DOB, and gender", () => {
    const result = parseParams(
      makeSearchParams({ zip: "33334", dob: "1990-05-15", gender: "male", income: "45000" })
    );
    expect(result).toEqual({ zip: "33334", dob: "1990-05-15", gender: "male", income: "45000" });
  });

  it("rejects invalid ZIP codes", () => {
    expect(parseParams(makeSearchParams({ zip: "1234" })).zip).toBe("");
    expect(parseParams(makeSearchParams({ zip: "123456" })).zip).toBe("");
    expect(parseParams(makeSearchParams({ zip: "abcde" })).zip).toBe("");
    expect(parseParams(makeSearchParams({ zip: "" })).zip).toBe("");
  });

  it("accepts valid 5-digit ZIP codes", () => {
    expect(parseParams(makeSearchParams({ zip: "00000" })).zip).toBe("00000");
    expect(parseParams(makeSearchParams({ zip: "99999" })).zip).toBe("99999");
  });

  it("rejects invalid DOB formats", () => {
    expect(parseParams(makeSearchParams({ dob: "05/15/1990" })).dob).toBe("");
    expect(parseParams(makeSearchParams({ dob: "1990-5-15" })).dob).toBe("");
    expect(parseParams(makeSearchParams({ dob: "not-a-date" })).dob).toBe("");
    expect(parseParams(makeSearchParams({ dob: "" })).dob).toBe("");
  });

  it("accepts valid YYYY-MM-DD dates", () => {
    expect(parseParams(makeSearchParams({ dob: "2000-01-01" })).dob).toBe("2000-01-01");
    expect(parseParams(makeSearchParams({ dob: "1955-12-31" })).dob).toBe("1955-12-31");
  });

  it("rejects invalid genders and normalizes case", () => {
    expect(parseParams(makeSearchParams({ gender: "unknown" })).gender).toBe("");
    expect(parseParams(makeSearchParams({ gender: "" })).gender).toBe("");
    // Case-insensitive match
    expect(parseParams(makeSearchParams({ gender: "Male" })).gender).toBe("Male");
    expect(parseParams(makeSearchParams({ gender: "FEMALE" })).gender).toBe("FEMALE");
    expect(parseParams(makeSearchParams({ gender: "Other" })).gender).toBe("Other");
  });

  it("passes income through without validation", () => {
    expect(parseParams(makeSearchParams({ income: "anything" })).income).toBe("anything");
    expect(parseParams(makeSearchParams({})).income).toBe("");
  });

  it("defaults missing params to empty strings", () => {
    const result = parseParams(makeSearchParams({}));
    expect(result).toEqual({ zip: "", dob: "", gender: "", income: "" });
  });
});

describe("incomeToMidpoint", () => {
  it("maps known ranges to midpoints", () => {
    expect(incomeToMidpoint("0-25k")).toBe(12500);
    expect(incomeToMidpoint("25-50k")).toBe(37500);
    expect(incomeToMidpoint("50-75k")).toBe(62500);
    expect(incomeToMidpoint("75k+")).toBe(90000);
  });

  it("returns 0 for unknown ranges", () => {
    expect(incomeToMidpoint("invalid" as IncomeRange)).toBe(0);
  });
});
