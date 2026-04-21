/**
 * Under-65 Marketplace enrollment application shape.
 * Modeled on the HealthCare.gov flow but scoped to what we collect at submit
 * time — a licensed agent calls back to finish anything conditional on
 * eligibility findings (Medicaid referrals, CSR variants, immigration docs).
 */

export type YesNo = "yes" | "no" | "";

export interface HomeAddress {
  street: string;
  apt: string;
  city: string;
  state: string;
  zip: string;
  hasNoPermanent: boolean;
  mailingIsSame: YesNo;
  mailingAddress?: {
    street: string;
    apt: string;
    city: string;
    state: string;
    zip: string;
  };
}

export interface ContactDetails {
  email: string;
  phone: string;
  phoneExt: string;
  phoneType: "home" | "mobile" | "work" | "";
  writtenLanguage: string;
  spokenLanguage: string;
  noticePref: "mail" | "electronic" | "";
  emailMe: boolean;
  textMe: boolean;
}

export interface PrimaryContact {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  dob: string;
  sex: "male" | "female" | "";
  applyingForCoverage: YesNo;
  ssn: string;
  noSsn: boolean;
  homeAddress: HomeAddress;
  contactDetails: ContactDetails;
}

export interface HouseholdApplicant {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  dob: string;
  sex: "male" | "female" | "";
  relationship: string;
  applyingForCoverage: YesNo;
  ssn: string;
  noSsn: boolean;
}

export interface HouseholdTaxInfo {
  married: YesNo;
  spouse?: {
    firstName: string;
    middleName: string;
    lastName: string;
    suffix: string;
    dob: string;
    sex: "male" | "female" | "";
    livesWithYou: YesNo;
    ssn: string;
    noSsn: boolean;
  };
  filingTaxes2026: YesNo;
  filingJointly: YesNo;
  claimingDependents: YesNo;
  dependents: HouseholdApplicant[];
}

export interface HouseholdSection {
  wantsCostSavings: YesNo;
  applicants: HouseholdApplicant[];
  medicareEnrolledIds: string[];
  residence: {
    livesInState: YesNo;
    planToStay: YesNo;
    temporarilyAway: YesNo;
  };
  taxInfo: HouseholdTaxInfo;
}

export interface MemberDetail {
  memberId: string; // "primary" for primary contact, else applicant.id
  tobaccoUse: YesNo;
  lastTobaccoDate: string;
  usCitizen: YesNo;
  eligibleImmigrationStatus: "yes" | "skip" | "";
  incarcerated: YesNo;
  incarceratedPendingDisposition: YesNo;
  americanIndianAlaskaNative: YesNo;
  hispanicOrigin: "yes" | "no" | "decline" | "";
  hispanicOriginDetail: string;
  raceEthnicity: string;
  declineRace: boolean;
}

export interface IncomeEntry {
  id: string;
  type: string; // Job / Self-employment / Unemployment / Social Security / etc.
  employerName: string;
  amount: number;
  frequency: "weekly" | "biweekly" | "monthly" | "yearly" | "one-time" | "";
  employerAddress: string;
}

export interface DeductionEntry {
  id: string;
  type: string;
  amount: number;
  frequency: "monthly" | "yearly" | "";
}

export interface MemberIncome {
  memberId: string;
  hasIncome: YesNo;
  entries: IncomeEntry[];
  hasDeductions: YesNo;
  deductions: DeductionEntry[];
  yearlyEstimateCorrect: YesNo;
  yearlyEstimateOverride: number;
  hardToPredict: YesNo;
}

export interface AdditionalInformationSection {
  primaryRelationships: {
    livesWithOthersUnder19: YesNo;
    primaryCaregiverUnder19: YesNo;
  };
}

export interface ExistingCoverageEntry {
  memberId: string;
  enrolled: YesNo;
  endingBy619: YesNo;
  types: string[]; // medicaid / chip / medicare / tricare / va / peace corps / individual / cobra / job / retiree / other
  ichraOffered: boolean;
  ichraOfferedNotAccepted: boolean;
}

export interface AdditionalQuestionsSection {
  extraHelp: {
    disabilityIds: string[];
    dailyActivitiesIds: string[];
  };
  coverageRecentHistory: {
    recentMedicaidEndIds: string[];
    recentMedicaidNotEligibleIds: string[];
    recentMedicaidNotEligibleDate: string;
    openEnrollmentApplyIds: string[];
    qualifyingEventApplyIds: string[];
    householdChanged: YesNo;
    lastCoverageDay: string;
  };
  existingCoverage: ExistingCoverageEntry[];
  employerCoverage: {
    offeredThroughOwnJobIds: string[];
  };
  upcomingChanges: {
    losingCoverageIds: string[];
    recentLifeEvents: string[]; // lost coverage, married, moved, released, adopted
    ichraQsehraIds: string[];
    taxFiling8962: "filed" | "not-filed" | "";
  };
}

export interface FinalizeSection {
  agreements: {
    renewEligibility: YesNo;
    renewalYears: "" | "1" | "2" | "3" | "4" | "5";
  };
  taxAttestation: {
    understandsEligibilityRules: YesNo;
    understandsReconciliation: YesNo;
  };
  signAndSubmit: {
    agreeToReportChanges: YesNo;
    endOverlappingCoverage: "agree" | "disagree" | "";
    agreeToTruthfulness: YesNo;
    signatureName: string;
    submittedAt?: string;
  };
}

export interface Under65Application {
  planId: string;
  planYear: number;
  startedAt: string;
  lastSavedAt?: string;
  primaryContact: PrimaryContact;
  household: HouseholdSection;
  additionalInformation: AdditionalInformationSection;
  members: Record<string, MemberDetail>;
  income: Record<string, MemberIncome>;
  additionalQuestions: AdditionalQuestionsSection;
  finalize: FinalizeSection;
}

export type StepId =
  | "primary.info"
  | "primary.address"
  | "primary.contact"
  | "household.applying"
  | "household.medicare"
  | "household.residence"
  | "household.tax"
  | "additional.relationships"
  | "members.applicant"
  | "income.applicant"
  | "additional.extraHelp"
  | "additional.coverage"
  | "additional.employer"
  | "additional.upcoming"
  | "finalize.review"
  | "finalize.agreements"
  | "finalize.taxAttestation"
  | "finalize.signSubmit";
