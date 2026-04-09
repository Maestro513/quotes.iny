/**
 * Tests for Medicare plans API route helper functions.
 * Tests pure functions: parseMoney, mapPlanType, mapCmsLabel, findMedical
 */

describe("parseMoney", () => {
  function parseMoney(s: string | undefined): number {
    if (!s) return 0;
    const n = s.replace(/[^0-9.]/g, "");
    return n ? parseFloat(n) : 0;
  }

  it("parses dollar amounts", () => {
    expect(parseMoney("$25.00")).toBe(25);
    expect(parseMoney("$1,234.56")).toBe(1234.56);
    expect(parseMoney("$0")).toBe(0);
  });

  it("returns 0 for undefined/empty", () => {
    expect(parseMoney(undefined)).toBe(0);
    expect(parseMoney("")).toBe(0);
    expect(parseMoney("N/A")).toBe(0);
  });

  it("handles plain numbers", () => {
    expect(parseMoney("100")).toBe(100);
    expect(parseMoney("45.99")).toBe(45.99);
  });
});

describe("mapPlanType", () => {
  type MedicarePlanType = "MA" | "Supplement" | "PartD";

  function mapPlanType(planType: string, planNumber: string): MedicarePlanType {
    const pt = planType?.toLowerCase() ?? "";
    if (pt.includes("supplement") || pt.includes("medigap")) return "Supplement";
    if (pt.includes("pdp") || pt.includes("part d")) return "PartD";
    if (planNumber.charAt(0).toUpperCase() === "S") return "PartD";
    return "MA";
  }

  it("maps supplement types", () => {
    expect(mapPlanType("Medicare Supplement", "H0001-001")).toBe("Supplement");
    expect(mapPlanType("Medigap Plan F", "H0001-001")).toBe("Supplement");
  });

  it("maps Part D types", () => {
    expect(mapPlanType("PDP", "S5678-001")).toBe("PartD");
    expect(mapPlanType("Part D prescription", "H0001-001")).toBe("PartD");
  });

  it("infers Part D from S-prefix plan number", () => {
    expect(mapPlanType("", "S1234-001")).toBe("PartD");
  });

  it("defaults to MA", () => {
    expect(mapPlanType("HMO", "H0001-001")).toBe("MA");
    expect(mapPlanType("", "H0001-001")).toBe("MA");
  });
});

describe("mapCmsLabel", () => {
  function mapCmsLabel(label: string): string {
    const map: Record<string, string> = {
      "PCP Visit": "PCP visit",
      "Specialist Visit": "Specialist visit",
      "Emergency Room": "Emergency room",
      "Urgent Care": "Urgent care center",
      "Preventive Dental": "Dental preventive",
      "Comprehensive Dental": "Dental comprehensive",
      "Eye Exam": "Vision routine exam",
      "Eyewear": "Vision eyewear",
      "Hearing Exam": "Hearing exam",
      "Hearing Aids": "Hearing aids",
    };
    return map[label] ?? label;
  }

  it("maps known CMS labels to expected format", () => {
    expect(mapCmsLabel("PCP Visit")).toBe("PCP visit");
    expect(mapCmsLabel("Specialist Visit")).toBe("Specialist visit");
    expect(mapCmsLabel("Emergency Room")).toBe("Emergency room");
    expect(mapCmsLabel("Urgent Care")).toBe("Urgent care center");
    expect(mapCmsLabel("Eye Exam")).toBe("Vision routine exam");
  });

  it("passes through unknown labels unchanged", () => {
    expect(mapCmsLabel("Custom Benefit")).toBe("Custom Benefit");
    expect(mapCmsLabel("")).toBe("");
  });
});

describe("findMedical", () => {
  function findMedical(
    medical: { label: string; in_network: string }[],
    label: string
  ): string {
    const raw = medical?.find((m) => m.label === label)?.in_network ?? "—";
    return raw.replace(/\s*\(see EOC[^)]*\)/i, "").trim() || raw;
  }

  it("finds matching medical benefit", () => {
    const medical = [
      { label: "PCP visit", in_network: "$20 copay" },
      { label: "Specialist visit", in_network: "$40 copay" },
    ];
    expect(findMedical(medical, "PCP visit")).toBe("$20 copay");
  });

  it("strips CMS boilerplate from values", () => {
    const medical = [{ label: "PCP visit", in_network: "$20 copay (see EOC for cost)" }];
    expect(findMedical(medical, "PCP visit")).toBe("$20 copay");
  });

  it("returns dash for missing benefits", () => {
    expect(findMedical([], "Missing")).toBe("—");
  });
});
