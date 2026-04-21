"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useReducer, useState, Suspense } from "react";
import Link from "next/link";
import type {
  Under65Application,
  StepId,
  YesNo,
  HouseholdApplicant,
  MemberDetail,
  MemberIncome,
  IncomeEntry,
} from "@/types/under65-enrollment";

/* ──────────────────────────────────────────────────────────────────────────
   Step definitions — sidebar groups, labels, order
   ────────────────────────────────────────────────────────────────────────── */

const STEPS: { id: StepId; group: string; label: string }[] = [
  { id: "primary.info",              group: "Primary contact",       label: "Your information" },
  { id: "primary.address",           group: "Primary contact",       label: "Home address" },
  { id: "primary.contact",           group: "Primary contact",       label: "Contact details" },
  { id: "household.applying",        group: "Household",             label: "Who's applying?" },
  { id: "household.medicare",        group: "Household",             label: "Medicare" },
  { id: "household.residence",       group: "Household",             label: "Residence" },
  { id: "household.tax",             group: "Household",             label: "Tax household" },
  { id: "additional.relationships",  group: "Additional information", label: "Family relationships" },
  { id: "members.applicant",         group: "Members",               label: "Applicant details" },
  { id: "income.applicant",          group: "Income",                label: "Income" },
  { id: "additional.extraHelp",      group: "Additional questions",  label: "Extra help" },
  { id: "additional.coverage",       group: "Additional questions",  label: "Coverage" },
  { id: "additional.employer",       group: "Additional questions",  label: "Employer coverage" },
  { id: "additional.upcoming",       group: "Additional questions",  label: "Upcoming changes" },
  { id: "finalize.review",           group: "Finalize",              label: "Review" },
  { id: "finalize.agreements",       group: "Finalize",              label: "Agreements" },
  { id: "finalize.taxAttestation",   group: "Finalize",              label: "Tax attestation" },
  { id: "finalize.signSubmit",       group: "Finalize",              label: "Sign and submit" },
];

/* ──────────────────────────────────────────────────────────────────────────
   Blank-state factory
   ────────────────────────────────────────────────────────────────────────── */

function blankApplication(planId: string): Under65Application {
  return {
    planId,
    planYear: new Date().getFullYear(),
    startedAt: new Date().toISOString(),
    primaryContact: {
      firstName: "", middleName: "", lastName: "", suffix: "",
      dob: "", sex: "",
      applyingForCoverage: "yes",
      ssn: "", noSsn: false,
      homeAddress: {
        street: "", apt: "", city: "", state: "", zip: "",
        hasNoPermanent: false, mailingIsSame: "yes",
      },
      contactDetails: {
        email: "", phone: "", phoneExt: "", phoneType: "",
        writtenLanguage: "English", spokenLanguage: "English",
        noticePref: "electronic",
        emailMe: true, textMe: false,
      },
    },
    household: {
      wantsCostSavings: "yes",
      applicants: [],
      medicareEnrolledIds: [],
      residence: { livesInState: "yes", planToStay: "yes", temporarilyAway: "no" },
      taxInfo: {
        married: "",
        filingTaxes2026: "",
        filingJointly: "",
        claimingDependents: "",
        dependents: [],
      },
    },
    additionalInformation: {
      primaryRelationships: {
        livesWithOthersUnder19: "",
        primaryCaregiverUnder19: "",
      },
    },
    members: {},
    income: {},
    additionalQuestions: {
      extraHelp: { disabilityIds: [], dailyActivitiesIds: [] },
      coverageRecentHistory: {
        recentMedicaidEndIds: [],
        recentMedicaidNotEligibleIds: [],
        recentMedicaidNotEligibleDate: "",
        openEnrollmentApplyIds: [],
        qualifyingEventApplyIds: [],
        householdChanged: "",
        lastCoverageDay: "",
      },
      existingCoverage: [],
      employerCoverage: { offeredThroughOwnJobIds: [] },
      upcomingChanges: {
        losingCoverageIds: [],
        recentLifeEvents: [],
        ichraQsehraIds: [],
        taxFiling8962: "",
      },
    },
    finalize: {
      agreements: { renewEligibility: "", renewalYears: "" },
      taxAttestation: { understandsEligibilityRules: "", understandsReconciliation: "" },
      signAndSubmit: {
        agreeToReportChanges: "",
        endOverlappingCoverage: "",
        agreeToTruthfulness: "",
        signatureName: "",
      },
    },
  };
}

/* ──────────────────────────────────────────────────────────────────────────
   Reducer — deep-merge partial updates
   ────────────────────────────────────────────────────────────────────────── */

type Patch = Partial<Under65Application> | ((prev: Under65Application) => Under65Application);

function reducer(state: Under65Application, patch: Patch): Under65Application {
  const next = typeof patch === "function" ? patch(state) : { ...state, ...patch };
  return { ...next, lastSavedAt: new Date().toISOString() };
}

/* ──────────────────────────────────────────────────────────────────────────
   Reusable field components — compact, accessible
   ────────────────────────────────────────────────────────────────────────── */

const inputCls = "w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#22c55e] focus:ring-2 focus:ring-[#22c55e]/20 transition";
const labelCls = "block text-gray-800 text-sm font-semibold mb-1.5";
const optCls = "text-gray-500 text-xs ml-1 font-normal";
const sectionTitleCls = "text-violet-700 text-lg font-bold mb-1";
const sectionDescCls = "text-gray-600 text-sm mb-5";

function Field({ label, optional, children, help }: { label: string; optional?: boolean; help?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {optional && <span className={optCls}>(Optional)</span>}
        {help && <span className="ml-1 text-violet-500 text-xs" title={help}>ⓘ</span>}
      </label>
      {children}
    </div>
  );
}

function YesNoRadio({ value, onChange, name }: { value: YesNo; onChange: (v: YesNo) => void; name: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(["yes", "no"] as const).map((opt) => {
        const checked = value === opt;
        return (
          <label key={opt} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition ${checked ? "border-[#22c55e] bg-[#22c55e]/10 text-[#15803d]" : "border-gray-300 bg-white text-gray-700 hover:border-gray-500"}`}>
            <input type="radio" name={name} value={opt} checked={checked} onChange={() => onChange(opt)} className="w-4 h-4 accent-[#22c55e]" />
            <span className="text-sm font-medium capitalize">{opt}</span>
          </label>
        );
      })}
    </div>
  );
}

function SexToggle({ value, onChange }: { value: "male" | "female" | ""; onChange: (v: "male" | "female") => void }) {
  return (
    <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
      {(["male", "female"] as const).map((opt) => {
        const active = value === opt;
        return (
          <button key={opt} type="button" onClick={() => onChange(opt)} className={`px-5 py-2 text-sm font-medium capitalize transition ${active ? "bg-[#22c55e]/15 text-[#15803d]" : "bg-white text-gray-700 hover:bg-gray-50"}`}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function NavButtons({
  onBack, onContinue, continueLabel = "Continue", backLabel = "Back", canContinue = true, continueVariant = "primary",
}: {
  onBack?: () => void;
  onContinue: () => void;
  continueLabel?: string;
  backLabel?: string;
  canContinue?: boolean;
  continueVariant?: "primary" | "submit";
}) {
  return (
    <div className="flex items-center justify-between gap-3 pt-8 mt-6 border-t border-gray-100">
      <button
        type="button"
        onClick={onBack}
        disabled={!onBack}
        className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 bg-white hover:border-gray-500 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        {backLabel}
      </button>
      <button
        type="button"
        onClick={onContinue}
        disabled={!canContinue}
        className={`px-7 py-2.5 rounded-lg text-sm font-semibold text-white transition shadow-[0_2px_8px_rgba(34,197,94,0.25)] ${continueVariant === "submit" ? "bg-[#16a34a] hover:bg-green-700" : "bg-[#22c55e] hover:bg-green-500"} disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {continueLabel}
      </button>
    </div>
  );
}

function FormCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-7 lg:p-9 shadow-sm border border-black/5">
      <h2 className={sectionTitleCls}>{title}</h2>
      {description && <p className={sectionDescCls}>{description}</p>}
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Wizard
   ────────────────────────────────────────────────────────────────────────── */

function EnrollmentWizard() {
  const { planId } = useParams<{ planId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlStep = (searchParams.get("step") as StepId) || "primary.info";

  const [app, dispatch] = useReducer(reducer, null, () => blankApplication(planId));
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    try {
      const key = `u65-enroll-${planId}`;
      const saved = sessionStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved) as Under65Application;
        if (parsed.planId === planId) dispatch(() => parsed);
      }
    } catch {}
    setHydrated(true);
  }, [planId]);

  // Persist on every mutation
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(`u65-enroll-${planId}`, JSON.stringify(app));
    } catch {}
  }, [app, hydrated, planId]);

  // Map of completed steps — "complete" means user has left the step at least once.
  // For MVP: any step before the current one is treated as complete.
  const currentIdx = Math.max(0, STEPS.findIndex((s) => s.id === urlStep));

  function goToStep(stepId: StepId) {
    const qp = new URLSearchParams(searchParams.toString());
    qp.set("step", stepId);
    router.push(`?${qp.toString()}`);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function next() {
    const nextIdx = Math.min(STEPS.length - 1, currentIdx + 1);
    goToStep(STEPS[nextIdx].id);
  }

  function back() {
    const prevIdx = Math.max(0, currentIdx - 1);
    goToStep(STEPS[prevIdx].id);
  }

  async function submitApplication() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/under65/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(app),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || "Submission failed");
      }
      const data: { receiptId: string; submittedAt: string } = await res.json();
      sessionStorage.removeItem(`u65-enroll-${planId}`);
      router.push(`/under-65/${encodeURIComponent(planId)}/enroll/success?receipt=${encodeURIComponent(data.receiptId)}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Unable to submit. Please try again.");
      setSubmitting(false);
    }
  }

  // Sidebar: group steps, show complete/active/pending states
  const groups = useMemo(() => {
    const by = new Map<string, { id: StepId; label: string; idx: number }[]>();
    STEPS.forEach((s, idx) => {
      if (!by.has(s.group)) by.set(s.group, []);
      by.get(s.group)!.push({ id: s.id, label: s.label, idx });
    });
    return Array.from(by.entries());
  }, []);

  const header = STEPS[currentIdx]?.group ?? "";

  const totalSteps = STEPS.length;
  const progressPct = Math.round(((currentIdx + 1) / totalSteps) * 100);

  return (
    <div
      className="min-h-[calc(100vh-4rem)] relative"
      style={{
        background:
          "radial-gradient(1000px 500px at -10% -10%, rgba(164,52,153,0.22), transparent 60%)," +
          "radial-gradient(900px 500px at 110% 0%, rgba(34,197,94,0.10), transparent 55%)," +
          "#3d1f5e",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">

        {/* Top bar — progress + exit, sits on the purple */}
        <div className="flex items-center justify-between mb-5 text-white/85">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center text-sm font-bold">
              {currentIdx + 1}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-white/55 font-semibold">
                Step {currentIdx + 1} of {totalSteps}
              </p>
              <p className="text-sm font-semibold">{header}</p>
            </div>
          </div>
          <Link
            href={`/under-65/${encodeURIComponent(planId)}?${searchParams.toString()}`}
            className="text-white/70 hover:text-white text-sm inline-flex items-center gap-1.5 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            Save &amp; exit
          </Link>
        </div>

        {/* Slim progress rail across the whole width */}
        <div className="h-1 rounded-full bg-white/10 overflow-hidden mb-6">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#22c55e] via-[#a78bfa] to-[#22c55e] transition-[width] duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Cream work area — sidebar + main live inside this panel, purple shows on the edges */}
        <div className="rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(15,2,32,.35)] border border-white/10 bg-[#faf7f2]">
          <div className="grid grid-cols-1 lg:grid-cols-[270px_1fr]">

            {/* Sidebar — lives on a lavender-tinted surface inside the cream panel */}
            <aside className="lg:sticky lg:top-0 h-fit bg-gradient-to-b from-[#f3ecfb] to-[#faf7f2] border-b lg:border-b-0 lg:border-r border-black/[0.06] p-6 lg:p-7">
              <nav className="space-y-5">
                {groups.map(([group, stepsInGroup]) => {
                  const allBefore = stepsInGroup.every((s) => s.idx < currentIdx);
                  const hasActive = stepsInGroup.some((s) => s.idx === currentIdx);
                  const anyStarted = stepsInGroup.some((s) => s.idx <= currentIdx);
                  return (
                    <div key={group}>
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-[11px] uppercase tracking-[0.1em] font-bold ${hasActive ? "text-violet-700" : allBefore ? "text-[#15803d]" : anyStarted ? "text-gray-800" : "text-gray-400"}`}>
                          {group}
                        </p>
                        {allBefore && (
                          <span className="w-4 h-4 rounded-full bg-[#22c55e] text-white flex items-center justify-center shrink-0">
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          </span>
                        )}
                      </div>
                      {anyStarted && (
                        <ul className="mt-2.5 space-y-0.5">
                          {stepsInGroup.map((s) => {
                            const done = s.idx < currentIdx;
                            const active = s.idx === currentIdx;
                            return (
                              <li key={s.id}>
                                <button
                                  onClick={() => goToStep(s.id)}
                                  className={`flex items-center gap-2 text-left w-full transition rounded-md px-2 py-1.5 -mx-2 ${active ? "bg-violet-100/70 text-violet-800 font-semibold" : done ? "text-[#15803d] hover:bg-[#22c55e]/10" : "text-gray-500 hover:bg-black/5"}`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? "bg-violet-600" : done ? "bg-[#22c55e]" : "bg-gray-300"}`} />
                                  <span className="text-[13px]">{s.label}</span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </nav>

              <div className="mt-7 pt-5 border-t border-black/[0.08]">
                <p className="text-violet-700 font-bold text-[11px] uppercase tracking-[0.1em] mb-1.5">Application details</p>
                <p className="text-gray-700 text-sm">Plan year <span className="font-semibold">{app.planYear}</span></p>
                <p className="text-gray-400 text-[11px] mt-1.5 leading-relaxed">Saved to this browser only. Nothing leaves your device until you submit.</p>
              </div>
            </aside>

            {/* Main content — cream so white FormCards read as elevated surfaces */}
            <main className="p-6 lg:p-10 bg-[#faf7f2]">
              <StepRouter
                stepId={urlStep}
                app={app}
                dispatch={dispatch}
                onBack={currentIdx > 0 ? back : undefined}
                onNext={next}
                onSubmit={submitApplication}
                submitting={submitting}
                submitError={submitError}
              />
            </main>
          </div>
        </div>

        <p className="text-white/40 text-[11px] text-center mt-5">
          Secured &amp; private · Insurance &apos;n You is a licensed Marketplace agent · NPN 20116201
        </p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Step router — dispatches each StepId to the right form component
   ────────────────────────────────────────────────────────────────────────── */

interface StepProps {
  app: Under65Application;
  dispatch: React.Dispatch<Patch>;
  onBack?: () => void;
  onNext: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string | null;
}

function StepRouter({ stepId, ...rest }: { stepId: StepId } & StepProps) {
  switch (stepId) {
    case "primary.info":             return <PrimaryInfo {...rest} />;
    case "primary.address":          return <PrimaryAddress {...rest} />;
    case "primary.contact":          return <PrimaryContactDetails {...rest} />;
    case "household.applying":       return <HouseholdApplying {...rest} />;
    case "household.medicare":       return <HouseholdMedicare {...rest} />;
    case "household.residence":      return <HouseholdResidence {...rest} />;
    case "household.tax":            return <HouseholdTax {...rest} />;
    case "additional.relationships": return <AdditionalRelationships {...rest} />;
    case "members.applicant":        return <MembersApplicant {...rest} />;
    case "income.applicant":         return <IncomeApplicant {...rest} />;
    case "additional.extraHelp":     return <AdditionalExtraHelp {...rest} />;
    case "additional.coverage":      return <AdditionalCoverage {...rest} />;
    case "additional.employer":      return <AdditionalEmployer {...rest} />;
    case "additional.upcoming":      return <AdditionalUpcoming {...rest} />;
    case "finalize.review":          return <FinalizeReview {...rest} />;
    case "finalize.agreements":      return <FinalizeAgreements {...rest} />;
    case "finalize.taxAttestation":  return <FinalizeTaxAttestation {...rest} />;
    case "finalize.signSubmit":      return <FinalizeSignSubmit {...rest} />;
    default:                         return <PrimaryInfo {...rest} />;
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   STEP: Primary contact → Your information
   ────────────────────────────────────────────────────────────────────────── */

function PrimaryInfo({ app, dispatch, onBack, onNext }: StepProps) {
  const p = app.primaryContact;
  const setPC = (patch: Partial<typeof p>) =>
    dispatch((prev) => ({ ...prev, primaryContact: { ...prev.primaryContact, ...patch } }));

  const canContinue = p.firstName.trim() && p.lastName.trim() && p.dob && p.sex;

  return (
    <FormCard title="Your information" description="Tell us who's applying so we can verify identity and match household members later.">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="First name"><input className={inputCls} value={p.firstName} onChange={(e) => setPC({ firstName: e.target.value })} /></Field>
        <Field label="Middle" optional><input className={inputCls} value={p.middleName} onChange={(e) => setPC({ middleName: e.target.value })} /></Field>
        <Field label="Last name"><input className={inputCls} value={p.lastName} onChange={(e) => setPC({ lastName: e.target.value })} /></Field>
      </div>

      <div className="mt-4 max-w-xs">
        <Field label="Suffix" optional>
          <select className={inputCls} value={p.suffix} onChange={(e) => setPC({ suffix: e.target.value })}>
            <option value="">Select</option><option>Jr.</option><option>Sr.</option><option>II</option><option>III</option><option>IV</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Field label="Date of birth"><input type="date" className={inputCls} value={p.dob} onChange={(e) => setPC({ dob: e.target.value })} /></Field>
        <Field label="Sex">
          <SexToggle value={p.sex} onChange={(v) => setPC({ sex: v })} />
        </Field>
      </div>

      <div className="mt-6">
        <Field label="Are you applying for coverage?">
          <YesNoRadio name="applying" value={p.applyingForCoverage} onChange={(v) => setPC({ applyingForCoverage: v })} />
        </Field>
      </div>

      <div className="mt-6">
        <label className={labelCls}>
          Social Security Number
          <span className="ml-1 text-violet-500 text-xs" title="We verify SSNs with Social Security based on the consent you gave at the start.">ⓘ</span>
        </label>
        <p className="text-gray-500 text-xs mb-2">Required for anyone over 90 days old applying for health coverage. Speeds up processing even if you're not applying.</p>
        <input
          className={inputCls + " max-w-xs"}
          placeholder="XXX-XX-XXXX"
          value={p.ssn}
          onChange={(e) => setPC({ ssn: e.target.value })}
          inputMode="numeric"
          maxLength={11}
        />
        <label className="flex items-start gap-2 mt-3 cursor-pointer">
          <input type="checkbox" checked={p.noSsn} onChange={(e) => setPC({ noSsn: e.target.checked })} className="mt-0.5 w-4 h-4 accent-[#22c55e]" />
          <span className="text-sm text-gray-700">This person doesn't have an SSN. Only check if they've never been issued one.</span>
        </label>
      </div>

      <NavButtons onBack={onBack} onContinue={onNext} canContinue={Boolean(canContinue)} />
    </FormCard>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   STEP: Primary contact → Home address
   ────────────────────────────────────────────────────────────────────────── */

function PrimaryAddress({ app, dispatch, onBack, onNext }: StepProps) {
  const h = app.primaryContact.homeAddress;
  const setH = (patch: Partial<typeof h>) =>
    dispatch((prev) => ({ ...prev, primaryContact: { ...prev.primaryContact, homeAddress: { ...prev.primaryContact.homeAddress, ...patch } } }));

  const canContinue = h.hasNoPermanent || (h.street.trim() && h.city.trim() && h.state && h.zip.trim());

  return (
    <FormCard title="Home address" description="Enter your permanent address. We use this to confirm your coverage area and county.">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-4">
        <Field label="Street address"><input className={inputCls} value={h.street} onChange={(e) => setH({ street: e.target.value })} /></Field>
        <Field label="Apt. / Ste." optional><input className={inputCls} value={h.apt} onChange={(e) => setH({ apt: e.target.value })} /></Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <Field label="City"><input className={inputCls} value={h.city} onChange={(e) => setH({ city: e.target.value })} /></Field>
        <Field label="State">
          <select className={inputCls} value={h.state} onChange={(e) => setH({ state: e.target.value })}>
            <option value="">Select</option>
            {US_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="ZIP code"><input className={inputCls} value={h.zip} onChange={(e) => setH({ zip: e.target.value })} inputMode="numeric" maxLength={5} /></Field>
      </div>

      <label className="flex items-start gap-2 mt-5 cursor-pointer">
        <input type="checkbox" checked={h.hasNoPermanent} onChange={(e) => setH({ hasNoPermanent: e.target.checked })} className="mt-0.5 w-4 h-4 accent-[#22c55e]" />
        <span className="text-sm text-gray-700">I don't have a permanent address.</span>
      </label>

      <div className="mt-6">
        <Field label="Is your mailing address the same as your permanent address?">
          <YesNoRadio name="mailing-same" value={h.mailingIsSame} onChange={(v) => setH({ mailingIsSame: v })} />
        </Field>
      </div>

      {h.mailingIsSame === "no" && (
        <div className="mt-5 p-4 bg-violet-50/50 border border-violet-100 rounded-lg">
          <p className="text-violet-700 font-semibold text-sm mb-3">Mailing address</p>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-4">
            <Field label="Street address"><input className={inputCls} value={h.mailingAddress?.street ?? ""} onChange={(e) => setH({ mailingAddress: { ...(h.mailingAddress ?? { street: "", apt: "", city: "", state: "", zip: "" }), street: e.target.value } })} /></Field>
            <Field label="Apt. / Ste." optional><input className={inputCls} value={h.mailingAddress?.apt ?? ""} onChange={(e) => setH({ mailingAddress: { ...(h.mailingAddress ?? { street: "", apt: "", city: "", state: "", zip: "" }), apt: e.target.value } })} /></Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            <Field label="City"><input className={inputCls} value={h.mailingAddress?.city ?? ""} onChange={(e) => setH({ mailingAddress: { ...(h.mailingAddress ?? { street: "", apt: "", city: "", state: "", zip: "" }), city: e.target.value } })} /></Field>
            <Field label="State">
              <select className={inputCls} value={h.mailingAddress?.state ?? ""} onChange={(e) => setH({ mailingAddress: { ...(h.mailingAddress ?? { street: "", apt: "", city: "", state: "", zip: "" }), state: e.target.value } })}>
                <option value="">Select</option>
                {US_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="ZIP code"><input className={inputCls} value={h.mailingAddress?.zip ?? ""} onChange={(e) => setH({ mailingAddress: { ...(h.mailingAddress ?? { street: "", apt: "", city: "", state: "", zip: "" }), zip: e.target.value } })} inputMode="numeric" maxLength={5} /></Field>
          </div>
        </div>
      )}

      <NavButtons onBack={onBack} onContinue={onNext} canContinue={Boolean(canContinue)} />
    </FormCard>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   STEP: Primary contact → Contact details
   ────────────────────────────────────────────────────────────────────────── */

function PrimaryContactDetails({ app, dispatch, onBack, onNext }: StepProps) {
  const c = app.primaryContact.contactDetails;
  const setC = (patch: Partial<typeof c>) =>
    dispatch((prev) => ({ ...prev, primaryContact: { ...prev.primaryContact, contactDetails: { ...prev.primaryContact.contactDetails, ...patch } } }));

  const canContinue = c.phone.trim().length >= 10;

  return (
    <FormCard title="Contact details" description="So we can reach you with next steps and eligibility findings.">
      <div className="max-w-md">
        <Field label="Email address" optional><input type="email" className={inputCls} value={c.email} onChange={(e) => setC({ email: e.target.value })} /></Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_100px_180px] gap-4 mt-4">
        <Field label="Phone number"><input type="tel" className={inputCls} placeholder="(555) 123-4567" value={c.phone} onChange={(e) => setC({ phone: e.target.value })} /></Field>
        <Field label="Extension" optional><input className={inputCls} value={c.phoneExt} onChange={(e) => setC({ phoneExt: e.target.value })} /></Field>
        <Field label="Type">
          <select className={inputCls} value={c.phoneType} onChange={(e) => setC({ phoneType: e.target.value as typeof c.phoneType })}>
            <option value="">Select</option><option value="home">Home</option><option value="mobile">Mobile</option><option value="work">Work</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 max-w-xl">
        <Field label="Written language">
          <select className={inputCls} value={c.writtenLanguage} onChange={(e) => setC({ writtenLanguage: e.target.value })}>
            <option>English</option><option>Spanish</option><option>Chinese</option><option>Vietnamese</option><option>Arabic</option><option>Russian</option><option>Korean</option>
          </select>
        </Field>
        <Field label="Spoken language">
          <select className={inputCls} value={c.spokenLanguage} onChange={(e) => setC({ spokenLanguage: e.target.value })}>
            <option>English</option><option>Spanish</option><option>Chinese</option><option>Vietnamese</option><option>Arabic</option><option>Russian</option><option>Korean</option>
          </select>
        </Field>
      </div>

      <div className="mt-6">
        <label className={labelCls}>How would you like to get notices about your application?</label>
        <div className="space-y-2 max-w-md">
          {([
            { v: "mail" as const, label: "Send me paper notices in the mail" },
            { v: "electronic" as const, label: "Send me emails and texts" },
          ]).map((opt) => {
            const active = c.noticePref === opt.v;
            return (
              <label key={opt.v} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition ${active ? "border-[#22c55e] bg-[#22c55e]/10" : "border-gray-300 bg-white hover:border-gray-500"}`}>
                <input type="radio" name="notice" checked={active} onChange={() => setC({ noticePref: opt.v })} className="w-4 h-4 accent-[#22c55e]" />
                <span className="text-sm text-gray-800">{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {c.noticePref === "electronic" && (
        <div className="mt-4 ml-0 md:ml-4 space-y-2 max-w-md">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={c.emailMe} onChange={(e) => setC({ emailMe: e.target.checked })} className="w-4 h-4 accent-[#22c55e]" />
            <span className="text-sm text-gray-700">Email me</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={c.textMe} onChange={(e) => setC({ textMe: e.target.checked })} className="w-4 h-4 accent-[#22c55e]" />
            <span className="text-sm text-gray-700">Text me</span>
          </label>
        </div>
      )}

      <NavButtons onBack={onBack} onContinue={onNext} canContinue={Boolean(canContinue)} />
    </FormCard>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   STEP: Household → Who's applying?
   ────────────────────────────────────────────────────────────────────────── */

function HouseholdApplying({ app, dispatch, onBack, onNext }: StepProps) {
  const hh = app.household;
  const setHH = (patch: Partial<typeof hh>) =>
    dispatch((prev) => ({ ...prev, household: { ...prev.household, ...patch } }));

  function addApplicant() {
    const id = `app-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newApplicant: HouseholdApplicant = {
      id, firstName: "", middleName: "", lastName: "", suffix: "",
      dob: "", sex: "", relationship: "", applyingForCoverage: "yes",
      ssn: "", noSsn: false,
    };
    setHH({ applicants: [...hh.applicants, newApplicant] });
  }
  function removeApplicant(id: string) {
    setHH({ applicants: hh.applicants.filter((a) => a.id !== id) });
  }
  function updateApplicant(id: string, patch: Partial<HouseholdApplicant>) {
    setHH({ applicants: hh.applicants.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
  }

  return (
    <FormCard title="Who's applying for coverage?" description="Add anyone in your household who needs a plan. Your name is already the primary applicant.">
      <Field label="Do you want to see if you are eligible for cost savings?" help="Savings can lower your monthly premium and out-of-pocket costs.">
        <YesNoRadio name="cost-savings" value={hh.wantsCostSavings} onChange={(v) => setHH({ wantsCostSavings: v })} />
      </Field>
      <p className="text-xs text-gray-500 mt-2">If you select &quot;Yes,&quot; you&apos;ll answer questions about your income and household later.</p>

      <div className="mt-7">
        <div className="flex items-center justify-between mb-3">
          <p className="text-violet-700 font-semibold text-sm">Additional applicants</p>
          <button type="button" onClick={addApplicant} className="text-violet-700 hover:text-violet-900 text-sm font-semibold">+ Add another applicant</button>
        </div>

        {hh.applicants.length === 0 && <p className="text-gray-500 text-sm">Only you are applying. Use the button above to add a spouse, child, or other household member.</p>}

        <div className="space-y-4">
          {hh.applicants.map((a) => (
            <div key={a.id} className="border border-gray-200 rounded-lg p-5 bg-gray-50/50">
              <div className="flex items-center justify-between mb-3">
                <p className="text-violet-700 font-semibold text-sm">{a.firstName || "New applicant"}</p>
                <button type="button" onClick={() => removeApplicant(a.id)} className="text-xs text-red-600 hover:text-red-800 border border-red-300 rounded px-2 py-1">Remove</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="First name"><input className={inputCls} value={a.firstName} onChange={(e) => updateApplicant(a.id, { firstName: e.target.value })} /></Field>
                <Field label="Middle" optional><input className={inputCls} value={a.middleName} onChange={(e) => updateApplicant(a.id, { middleName: e.target.value })} /></Field>
                <Field label="Last name"><input className={inputCls} value={a.lastName} onChange={(e) => updateApplicant(a.id, { lastName: e.target.value })} /></Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                <Field label="Date of birth"><input type="date" className={inputCls} value={a.dob} onChange={(e) => updateApplicant(a.id, { dob: e.target.value })} /></Field>
                <Field label="Sex">
                  <SexToggle value={a.sex} onChange={(v) => updateApplicant(a.id, { sex: v })} />
                </Field>
                <Field label="Relationship to you">
                  <select className={inputCls} value={a.relationship} onChange={(e) => updateApplicant(a.id, { relationship: e.target.value })}>
                    <option value="">Select</option>
                    <option>Spouse</option><option>Child (including adopted)</option><option>Stepchild</option><option>Parent</option><option>Grandparent</option><option>Grandchild</option><option>Sibling</option><option>Other</option>
                  </select>
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Applying for coverage?">
                  <YesNoRadio name={`applying-${a.id}`} value={a.applyingForCoverage} onChange={(v) => updateApplicant(a.id, { applyingForCoverage: v })} />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </div>

      <NavButtons onBack={onBack} onContinue={onNext} />
    </FormCard>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   STEP: Household → Medicare eligibility
   ────────────────────────────────────────────────────────────────────────── */

function HouseholdMedicare({ app, dispatch, onBack, onNext }: StepProps) {
  const applicants = [{ id: "primary", name: `${app.primaryContact.firstName} ${app.primaryContact.lastName}`.trim() || "Primary applicant", primary: true }, ...app.household.applicants.map((a) => ({ id: a.id, name: `${a.firstName} ${a.lastName}`.trim() || "Applicant", primary: false }))];
  const selected = app.household.medicareEnrolledIds;

  function toggle(id: string) {
    const nextSet = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    dispatch((prev) => ({ ...prev, household: { ...prev.household, medicareEnrolledIds: nextSet } }));
  }

  return (
    <FormCard title="Medicare eligibility" description="Are any of these people currently enrolled in Medicare Part A or C, or will be in the next 3 months?">
      <div className="space-y-2 max-w-md">
        {applicants.map((a) => {
          const checked = selected.includes(a.id);
          return (
            <label key={a.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition ${checked ? "border-[#22c55e] bg-[#22c55e]/10" : "border-gray-300 bg-white hover:border-gray-500"}`}>
              <input type="checkbox" checked={checked} onChange={() => toggle(a.id)} className="w-4 h-4 accent-[#22c55e]" />
              <div>
                <div className="text-sm font-semibold text-gray-800">{a.name}</div>
                <div className="text-xs text-gray-500">{a.primary ? "Primary applicant" : "Household applicant"}</div>
              </div>
            </label>
          );
        })}
      </div>

      <div className="mt-6 p-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 flex gap-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-violet-700 shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <div>
          <p className="font-semibold">Sign up for Medicare on time to avoid penalties</p>
          <p className="mt-1 text-gray-600">It&apos;s important to sign up for Medicare coverage during your Initial Enrollment Period, if you&apos;re eligible. If you don&apos;t, you may have to pay a late enrollment penalty.</p>
        </div>
      </div>

      <NavButtons onBack={onBack} onContinue={onNext} />
    </FormCard>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   STEP: Household → Residence
   ────────────────────────────────────────────────────────────────────────── */

function HouseholdResidence({ app, dispatch, onBack, onNext }: StepProps) {
  const r = app.household.residence;
  const setR = (patch: Partial<typeof r>) =>
    dispatch((prev) => ({ ...prev, household: { ...prev.household, residence: { ...prev.household.residence, ...patch } } }));

  return (
    <FormCard title="Residence" description="A few questions about where household members live.">
      <div className="space-y-5 max-w-md">
        <Field label={`Do you currently live in ${app.primaryContact.homeAddress.state || "your state"}?`}>
          <YesNoRadio name="lives-in-state" value={r.livesInState} onChange={(v) => setR({ livesInState: v })} />
        </Field>
        <Field label="Do you plan to stay in that state?">
          <YesNoRadio name="plan-stay" value={r.planToStay} onChange={(v) => setR({ planToStay: v })} />
        </Field>
        <Field label="Are you temporarily away from home?">
          <YesNoRadio name="temp-away" value={r.temporarilyAway} onChange={(v) => setR({ temporarilyAway: v })} />
        </Field>
      </div>
      <NavButtons onBack={onBack} onContinue={onNext} />
    </FormCard>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   STEP: Household → Tax household
   ────────────────────────────────────────────────────────────────────────── */

function HouseholdTax({ app, dispatch, onBack, onNext }: StepProps) {
  const t = app.household.taxInfo;
  const setT = (patch: Partial<typeof t>) =>
    dispatch((prev) => ({ ...prev, household: { ...prev.household, taxInfo: { ...prev.household.taxInfo, ...patch } } }));

  return (
    <FormCard title="Your tax information" description="Tax filing status affects how we calculate premium subsidies and eligibility.">
      <Field label="Are you married?">
        <YesNoRadio name="married" value={t.married} onChange={(v) => setT({ married: v })} />
      </Field>

      {t.married === "yes" && (
        <div className="mt-5 p-5 bg-violet-50/50 border border-violet-100 rounded-lg">
          <p className="text-violet-700 font-semibold text-sm mb-3">Who is your spouse?</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="First name"><input className={inputCls} value={t.spouse?.firstName ?? ""} onChange={(e) => setT({ spouse: { ...(t.spouse ?? { firstName: "", middleName: "", lastName: "", suffix: "", dob: "", sex: "", livesWithYou: "", ssn: "", noSsn: false }), firstName: e.target.value } })} /></Field>
            <Field label="Middle" optional><input className={inputCls} value={t.spouse?.middleName ?? ""} onChange={(e) => setT({ spouse: { ...(t.spouse ?? { firstName: "", middleName: "", lastName: "", suffix: "", dob: "", sex: "", livesWithYou: "", ssn: "", noSsn: false }), middleName: e.target.value } })} /></Field>
            <Field label="Last name"><input className={inputCls} value={t.spouse?.lastName ?? ""} onChange={(e) => setT({ spouse: { ...(t.spouse ?? { firstName: "", middleName: "", lastName: "", suffix: "", dob: "", sex: "", livesWithYou: "", ssn: "", noSsn: false }), lastName: e.target.value } })} /></Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <Field label="Date of birth"><input type="date" className={inputCls} value={t.spouse?.dob ?? ""} onChange={(e) => setT({ spouse: { ...(t.spouse ?? { firstName: "", middleName: "", lastName: "", suffix: "", dob: "", sex: "", livesWithYou: "", ssn: "", noSsn: false }), dob: e.target.value } })} /></Field>
            <Field label="Sex">
              <SexToggle value={t.spouse?.sex ?? ""} onChange={(v) => setT({ spouse: { ...(t.spouse ?? { firstName: "", middleName: "", lastName: "", suffix: "", dob: "", sex: "", livesWithYou: "", ssn: "", noSsn: false }), sex: v } })} />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Does this person live with you?">
              <YesNoRadio name="spouse-lives" value={t.spouse?.livesWithYou ?? ""} onChange={(v) => setT({ spouse: { ...(t.spouse ?? { firstName: "", middleName: "", lastName: "", suffix: "", dob: "", sex: "", livesWithYou: "", ssn: "", noSsn: false }), livesWithYou: v } })} />
            </Field>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-5 max-w-xl">
        <Field label="Do you plan to file a federal income tax return for 2026?" help="You don't have to file to apply, but you need to file next year to get a premium tax credit.">
          <YesNoRadio name="filing-2026" value={t.filingTaxes2026} onChange={(v) => setT({ filingTaxes2026: v })} />
        </Field>
        {t.filingTaxes2026 === "yes" && t.married === "yes" && (
          <Field label="Are you filing taxes jointly with your spouse for 2026?">
            <YesNoRadio name="filing-jointly" value={t.filingJointly} onChange={(v) => setT({ filingJointly: v })} />
          </Field>
        )}
        {t.filingTaxes2026 === "yes" && (
          <Field label="Are you claiming any dependents on your taxes for 2026?">
            <YesNoRadio name="claiming-dep" value={t.claimingDependents} onChange={(v) => setT({ claimingDependents: v })} />
          </Field>
        )}
      </div>

      <NavButtons onBack={onBack} onContinue={onNext} />
    </FormCard>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   STEP: Additional information → Family relationships (primary)
   ────────────────────────────────────────────────────────────────────────── */

function AdditionalRelationships({ app, dispatch, onBack, onNext }: StepProps) {
  const r = app.additionalInformation.primaryRelationships;
  const name = `${app.primaryContact.firstName} ${app.primaryContact.lastName}`.trim() || "You";
  const setR = (patch: Partial<typeof r>) =>
    dispatch((prev) => ({ ...prev, additionalInformation: { ...prev.additionalInformation, primaryRelationships: { ...prev.additionalInformation.primaryRelationships, ...patch } } }));

  return (
    <FormCard title={`Other relationships for ${name}`}>
      <div className="space-y-5 max-w-xl">
        <Field label={`Does ${name} live with any other people under 19 who are not already on the application?`}>
          <YesNoRadio name="lives-under19" value={r.livesWithOthersUnder19} onChange={(v) => setR({ livesWithOthersUnder19: v })} />
        </Field>
        <Field label={`Is ${name} the primary person taking care of a child under 19?`}>
          <YesNoRadio name="primary-care" value={r.primaryCaregiverUnder19} onChange={(v) => setR({ primaryCaregiverUnder19: v })} />
        </Field>
      </div>
      <NavButtons onBack={onBack} onContinue={onNext} />
    </FormCard>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   STEP: Members → Applicant details (primary for MVP; loops later)
   ────────────────────────────────────────────────────────────────────────── */

function MembersApplicant({ app, dispatch, onBack, onNext }: StepProps) {
  const memberId = "primary";
  const current: MemberDetail = app.members[memberId] ?? {
    memberId, tobaccoUse: "", lastTobaccoDate: "", usCitizen: "",
    eligibleImmigrationStatus: "", incarcerated: "", incarceratedPendingDisposition: "",
    americanIndianAlaskaNative: "", hispanicOrigin: "", hispanicOriginDetail: "",
    raceEthnicity: "", declineRace: false,
  };

  const name = `${app.primaryContact.firstName} ${app.primaryContact.lastName}`.trim() || "Primary applicant";
  const setM = (patch: Partial<MemberDetail>) =>
    dispatch((prev) => ({ ...prev, members: { ...prev.members, [memberId]: { ...(prev.members[memberId] ?? current), ...patch } } }));

  return (
    <FormCard title="Your information" description={`Primary applicant: ${name}`}>
      <div className="space-y-6">
        <Field label="Have you used tobacco 4 or more times a week in the past 6 months?">
          <YesNoRadio name="tobacco" value={current.tobaccoUse} onChange={(v) => setM({ tobaccoUse: v })} />
        </Field>
        {current.tobaccoUse === "yes" && (
          <Field label="Last date of tobacco usage">
            <input type="date" className={inputCls + " max-w-xs"} value={current.lastTobaccoDate} onChange={(e) => setM({ lastTobaccoDate: e.target.value })} />
          </Field>
        )}

        <Field label="Are you a US citizen or US national?">
          <YesNoRadio name="citizen" value={current.usCitizen} onChange={(v) => setM({ usCitizen: v })} />
        </Field>
        {current.usCitizen === "no" && (
          <div className="ml-4 p-4 bg-violet-50/50 border border-violet-100 rounded-lg">
            <p className="text-violet-700 font-semibold text-sm mb-2">Do you have eligible immigration status?</p>
            <div className="space-y-2">
              <label className="flex items-start gap-2 p-3 rounded border border-gray-200 bg-white cursor-pointer">
                <input type="radio" name="immigration" checked={current.eligibleImmigrationStatus === "yes"} onChange={() => setM({ eligibleImmigrationStatus: "yes" })} className="mt-0.5 w-4 h-4 accent-[#22c55e]" />
                <span className="text-sm text-gray-700">Yes, I have eligible immigration status</span>
              </label>
              <label className="flex items-start gap-2 p-3 rounded border border-gray-200 bg-white cursor-pointer">
                <input type="radio" name="immigration" checked={current.eligibleImmigrationStatus === "skip"} onChange={() => setM({ eligibleImmigrationStatus: "skip" })} className="mt-0.5 w-4 h-4 accent-[#22c55e]" />
                <span className="text-xs text-gray-600">I would like to continue without answering this question. If I don&apos;t answer, this person won&apos;t be eligible for full Medicaid or Marketplace coverage and will be considered only for emergency services.</span>
              </label>
            </div>
          </div>
        )}

        <Field label="Are you currently incarcerated (detained or jailed)?">
          <YesNoRadio name="incarc" value={current.incarcerated} onChange={(v) => setM({ incarcerated: v })} />
        </Field>
        {current.incarcerated === "yes" && (
          <Field label="Are you incarcerated pending disposition of charges?">
            <YesNoRadio name="incarc-pending" value={current.incarceratedPendingDisposition} onChange={(v) => setM({ incarceratedPendingDisposition: v })} />
          </Field>
        )}

        <Field label="Are you an American Indian or Alaska Native?">
          <YesNoRadio name="ai-an" value={current.americanIndianAlaskaNative} onChange={(v) => setM({ americanIndianAlaskaNative: v })} />
        </Field>

        <div>
          <label className={labelCls}>Are you of Hispanic, Latino, or Spanish origin? <span className={optCls}>(Optional)</span></label>
          <div className="grid grid-cols-3 gap-2 max-w-md">
            {([["yes","Yes"],["no","No"],["decline","Decline to answer"]] as const).map(([v, lbl]) => {
              const active = current.hispanicOrigin === v;
              return (
                <label key={v} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition text-sm ${active ? "border-[#22c55e] bg-[#22c55e]/10 text-[#15803d]" : "border-gray-300 bg-white text-gray-700 hover:border-gray-500"}`}>
                  <input type="radio" name="hispanic" checked={active} onChange={() => setM({ hispanicOrigin: v })} className="w-4 h-4 accent-[#22c55e]" />
                  <span>{lbl}</span>
                </label>
              );
            })}
          </div>
        </div>

        <Field label="Race and ethnicity" optional>
          <select className={inputCls + " max-w-md"} value={current.raceEthnicity} onChange={(e) => setM({ raceEthnicity: e.target.value })} disabled={current.declineRace}>
            <option value="">Select</option>
            <option>American Indian or Alaska Native</option><option>Asian</option><option>Black or African American</option>
            <option>Native Hawaiian or Other Pacific Islander</option><option>White</option><option>Multi-racial</option><option>Other</option>
          </select>
          <label className="flex items-center gap-2 mt-2">
            <input type="checkbox" checked={current.declineRace} onChange={(e) => setM({ declineRace: e.target.checked })} className="w-4 h-4 accent-[#22c55e]" />
            <span className="text-sm text-gray-700">Decline to answer</span>
          </label>
        </Field>
      </div>
      <NavButtons onBack={onBack} onContinue={onNext} />
    </FormCard>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   STEP: Income
   ────────────────────────────────────────────────────────────────────────── */

function IncomeApplicant({ app, dispatch, onBack, onNext }: StepProps) {
  const memberId = "primary";
  const name = app.primaryContact.firstName || "Primary applicant";

  const current: MemberIncome = app.income[memberId] ?? {
    memberId, hasIncome: "", entries: [], hasDeductions: "", deductions: [],
    yearlyEstimateCorrect: "", yearlyEstimateOverride: 0, hardToPredict: "",
  };

  const setI = (patch: Partial<MemberIncome>) =>
    dispatch((prev) => ({ ...prev, income: { ...prev.income, [memberId]: { ...(prev.income[memberId] ?? current), ...patch } } }));

  function addEntry() {
    const entry: IncomeEntry = { id: `inc-${Date.now()}`, type: "Job", employerName: "", amount: 0, frequency: "", employerAddress: "" };
    setI({ entries: [...current.entries, entry] });
  }
  function updateEntry(id: string, patch: Partial<IncomeEntry>) {
    setI({ entries: current.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  }
  function removeEntry(id: string) {
    setI({ entries: current.entries.filter((e) => e.id !== id) });
  }

  return (
    <FormCard title={`Current income for ${name}`} description="To determine if you're eligible for savings, tell us about your income this month.">
      <Field label={`Does ${name} currently get any income?`}>
        <YesNoRadio name="has-income" value={current.hasIncome} onChange={(v) => setI({ hasIncome: v })} />
      </Field>

      {current.hasIncome === "yes" && (
        <div className="mt-5 space-y-4">
          {current.entries.map((entry) => (
            <div key={entry.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50/50">
              <div className="flex items-center justify-between mb-3">
                <p className="text-violet-700 font-semibold text-sm">{entry.type || "Income"}</p>
                <button type="button" onClick={() => removeEntry(entry.id)} className="text-xs text-red-600 hover:text-red-800">Remove</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Income type">
                  <select className={inputCls} value={entry.type} onChange={(e) => updateEntry(entry.id, { type: e.target.value })}>
                    <option>Job</option><option>Self-employment</option><option>Unemployment</option><option>Social Security</option><option>Pension</option><option>Interest/dividends</option><option>Rental</option><option>Other</option>
                  </select>
                </Field>
                <Field label="Employer name"><input className={inputCls} value={entry.employerName} onChange={(e) => updateEntry(entry.id, { employerName: e.target.value })} /></Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <Field label="Amount">
                  <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input type="number" min={0} className={inputCls + " pl-7"} value={entry.amount || ""} onChange={(e) => updateEntry(entry.id, { amount: parseFloat(e.target.value) || 0 })} />
                  </div>
                </Field>
                <Field label="How often">
                  <select className={inputCls} value={entry.frequency} onChange={(e) => updateEntry(entry.id, { frequency: e.target.value as IncomeEntry["frequency"] })}>
                    <option value="">Select</option><option value="weekly">Weekly</option><option value="biweekly">Biweekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="one-time">One-time</option>
                  </select>
                </Field>
              </div>
              <Field label="Employer street address" optional>
                <input className={inputCls + " mt-3"} value={entry.employerAddress} onChange={(e) => updateEntry(entry.id, { employerAddress: e.target.value })} />
              </Field>
            </div>
          ))}
          <button type="button" onClick={addEntry} className="text-violet-700 hover:text-violet-900 text-sm font-semibold">+ Add another income source</button>
        </div>
      )}

      <div className="mt-6">
        <Field label={`Does ${name} have any deductions for 2026?`}>
          <YesNoRadio name="has-deductions" value={current.hasDeductions} onChange={(v) => setI({ hasDeductions: v })} />
        </Field>
      </div>

      <div className="mt-6">
        <Field label={`Is ${name}'s income for 2026 hard to predict?`}>
          <YesNoRadio name="hard-predict" value={current.hardToPredict} onChange={(v) => setI({ hardToPredict: v })} />
        </Field>
      </div>

      <NavButtons onBack={onBack} onContinue={onNext} />
    </FormCard>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   STEP: Additional questions → Extra help
   ────────────────────────────────────────────────────────────────────────── */

function AdditionalExtraHelp({ app, dispatch, onBack, onNext }: StepProps) {
  const x = app.additionalQuestions.extraHelp;
  const members = [{ id: "primary", name: `${app.primaryContact.firstName} ${app.primaryContact.lastName}`.trim() || "Primary applicant" }, ...app.household.applicants.map((a) => ({ id: a.id, name: `${a.firstName} ${a.lastName}`.trim() || "Applicant" }))];

  function toggle(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }
  const set = (patch: Partial<typeof x>) =>
    dispatch((prev) => ({ ...prev, additionalQuestions: { ...prev.additionalQuestions, extraHelp: { ...prev.additionalQuestions.extraHelp, ...patch } } }));

  return (
    <FormCard title="Extra help" description="These answers help us find any extra support you may qualify for.">
      <div className="space-y-6">
        <div>
          <p className={labelCls}>Do any of these people have a disability or mental health condition that limits their ability to work, attend school, or take care of their daily needs? <span className={optCls}>(Optional)</span></p>
          <div className="space-y-2 max-w-md">
            {members.map((m) => (
              <label key={m.id} className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-gray-300 bg-white cursor-pointer">
                <input type="checkbox" checked={x.disabilityIds.includes(m.id)} onChange={() => set({ disabilityIds: toggle(x.disabilityIds, m.id) })} className="w-4 h-4 accent-[#22c55e]" />
                <span className="text-sm text-gray-800">{m.name}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className={labelCls}>Do any of these people need help with daily activities (like dressing or using the bathroom), or live in a medical facility or nursing home? <span className={optCls}>(Optional)</span></p>
          <div className="space-y-2 max-w-md">
            {members.map((m) => (
              <label key={m.id} className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-gray-300 bg-white cursor-pointer">
                <input type="checkbox" checked={x.dailyActivitiesIds.includes(m.id)} onChange={() => set({ dailyActivitiesIds: toggle(x.dailyActivitiesIds, m.id) })} className="w-4 h-4 accent-[#22c55e]" />
                <span className="text-sm text-gray-800">{m.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <NavButtons onBack={onBack} onContinue={onNext} />
    </FormCard>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   STEP: Additional questions → Coverage
   ────────────────────────────────────────────────────────────────────────── */

const COVERAGE_TYPES = [
  "Medicaid", "CHIP", "Medicare", "TRICARE", "VA health care program", "Peace Corps",
  "Individual insurance (including Marketplace or private market non-group coverage)",
  "COBRA", "Coverage through a job (or another person's job, like a spouse or parent)",
  "Retiree plan coverage", "Other Coverage",
];

function AdditionalCoverage({ app, dispatch, onBack, onNext }: StepProps) {
  const members = [{ id: "primary", name: `${app.primaryContact.firstName} ${app.primaryContact.lastName}`.trim() || "Primary applicant" }, ...app.household.applicants.map((a) => ({ id: a.id, name: `${a.firstName} ${a.lastName}`.trim() || "Applicant" }))];

  function getEntry(memberId: string) {
    return app.additionalQuestions.existingCoverage.find((e) => e.memberId === memberId) ?? { memberId, enrolled: "" as YesNo, endingBy619: "" as YesNo, types: [] as string[], ichraOffered: false, ichraOfferedNotAccepted: false };
  }
  function updateEntry(memberId: string, patch: Partial<ReturnType<typeof getEntry>>) {
    dispatch((prev) => {
      const existing = prev.additionalQuestions.existingCoverage;
      const has = existing.some((e) => e.memberId === memberId);
      const next = has ? existing.map((e) => e.memberId === memberId ? { ...e, ...patch } : e) : [...existing, { ...getEntry(memberId), ...patch }];
      return { ...prev, additionalQuestions: { ...prev.additionalQuestions, existingCoverage: next } };
    });
  }
  function toggleType(memberId: string, t: string) {
    const cur = getEntry(memberId);
    const types = cur.types.includes(t) ? cur.types.filter((x) => x !== t) : [...cur.types, t];
    updateEntry(memberId, { types });
  }

  return (
    <FormCard title="Existing coverage information" description="Current coverage affects your Marketplace eligibility window and subsidy.">
      <div className="space-y-6">
        {members.map((m) => {
          const entry = getEntry(m.id);
          return (
            <div key={m.id} className="p-5 border border-gray-200 rounded-lg bg-gray-50/50">
              <p className="text-violet-700 font-semibold text-sm mb-3">{m.name}</p>
              <div className="space-y-4">
                <Field label={`Is ${m.name} currently enrolled in health coverage?`}>
                  <YesNoRadio name={`enrolled-${m.id}`} value={entry.enrolled} onChange={(v) => updateEntry(m.id, { enrolled: v })} />
                </Field>
                {entry.enrolled === "yes" && (
                  <>
                    <Field label={`Will ${m.name}'s current health coverage end on or before 6/19/2026?`}>
                      <YesNoRadio name={`ending-${m.id}`} value={entry.endingBy619} onChange={(v) => updateEntry(m.id, { endingBy619: v })} />
                    </Field>
                    <div>
                      <p className={labelCls}>What type of coverage does {m.name} have? (Select all that apply.)</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {COVERAGE_TYPES.map((t) => (
                          <label key={t} className="flex items-center gap-2 px-3 py-2 rounded border border-gray-200 bg-white cursor-pointer text-sm">
                            <input type="checkbox" checked={entry.types.includes(t)} onChange={() => toggleType(m.id, t)} className="w-4 h-4 accent-[#22c55e]" />
                            <span className="text-gray-700">{t}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" checked={entry.ichraOffered} onChange={(e) => updateEntry(m.id, { ichraOffered: e.target.checked })} className="mt-0.5 w-4 h-4 accent-[#22c55e]" />
                      <span className="text-sm text-gray-700">Has an Individual Coverage HRA (ICHRA) through their job or a family member&apos;s job</span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" checked={entry.ichraOfferedNotAccepted} onChange={(e) => updateEntry(m.id, { ichraOfferedNotAccepted: e.target.checked })} className="mt-0.5 w-4 h-4 accent-[#22c55e]" />
                      <span className="text-sm text-gray-700">Has been offered an ICHRA they haven&apos;t yet accepted</span>
                    </label>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <NavButtons onBack={onBack} onContinue={onNext} />
    </FormCard>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   STEP: Additional questions → Employer coverage offer
   ────────────────────────────────────────────────────────────────────────── */

function AdditionalEmployer({ app, dispatch, onBack, onNext }: StepProps) {
  const members = [{ id: "primary", name: `${app.primaryContact.firstName} ${app.primaryContact.lastName}`.trim() || "Primary applicant" }, ...app.household.applicants.map((a) => ({ id: a.id, name: `${a.firstName} ${a.lastName}`.trim() || "Applicant" }))];
  const selected = app.additionalQuestions.employerCoverage.offeredThroughOwnJobIds;
  function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    dispatch((prev) => ({ ...prev, additionalQuestions: { ...prev.additionalQuestions, employerCoverage: { offeredThroughOwnJobIds: next } } }));
  }
  return (
    <FormCard title="Employer Sponsored Coverage" description="Will any of these people be offered health coverage through their own job? (including self-employment)">
      <div className="space-y-2 max-w-md">
        {members.map((m) => {
          const checked = selected.includes(m.id);
          return (
            <label key={m.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition ${checked ? "border-[#22c55e] bg-[#22c55e]/10" : "border-gray-300 bg-white hover:border-gray-500"}`}>
              <input type="checkbox" checked={checked} onChange={() => toggle(m.id)} className="w-4 h-4 accent-[#22c55e]" />
              <span className="text-sm text-gray-800">{m.name}</span>
            </label>
          );
        })}
      </div>
      <NavButtons onBack={onBack} onContinue={onNext} />
    </FormCard>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   STEP: Additional questions → Upcoming changes
   ────────────────────────────────────────────────────────────────────────── */

function AdditionalUpcoming({ app, dispatch, onBack, onNext }: StepProps) {
  const u = app.additionalQuestions.upcomingChanges;
  const members = [{ id: "primary", name: `${app.primaryContact.firstName} ${app.primaryContact.lastName}`.trim() || "Primary applicant" }, ...app.household.applicants.map((a) => ({ id: a.id, name: `${a.firstName} ${a.lastName}`.trim() || "Applicant" }))];
  const events = ["Lost qualifying health coverage","Got married","Changed primary place of living","Released from incarceration (detention or jail)","Adopted, placed for adoption, or placed for foster care"];

  function toggleArr(list: string[], id: string) { return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]; }
  const set = (patch: Partial<typeof u>) =>
    dispatch((prev) => ({ ...prev, additionalQuestions: { ...prev.additionalQuestions, upcomingChanges: { ...prev.additionalQuestions.upcomingChanges, ...patch } } }));

  return (
    <FormCard title="Upcoming changes">
      <div className="space-y-6">
        <div>
          <p className={labelCls}>Will anyone lose qualifying health coverage before 6/19/2026?</p>
          <p className="text-xs text-gray-500 mb-2">You may need to submit documents to confirm recent lost coverage before your new coverage can start.</p>
          <div className="space-y-2 max-w-md">
            {members.map((m) => (
              <label key={m.id} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white cursor-pointer">
                <input type="checkbox" checked={u.losingCoverageIds.includes(m.id)} onChange={() => set({ losingCoverageIds: toggleArr(u.losingCoverageIds, m.id) })} className="w-4 h-4 accent-[#22c55e]" />
                <span className="text-sm text-gray-800">{m.name}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className={labelCls}>Recent changes</p>
          <p className="text-xs text-gray-500 mb-2">Select any life changes that apply — some must have happened in the last 60 days.</p>
          <div className="space-y-2 max-w-md">
            {events.map((e) => (
              <label key={e} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white cursor-pointer">
                <input type="checkbox" checked={u.recentLifeEvents.includes(e)} onChange={() => set({ recentLifeEvents: toggleArr(u.recentLifeEvents, e) })} className="w-4 h-4 accent-[#22c55e]" />
                <span className="text-sm text-gray-800">{e}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className={labelCls}>Past premium tax credit reconciliation</p>
          <p className="text-xs text-gray-500 mb-2">If you got premium tax credits in 2023 and 2024, did you file a tax return with IRS form 8962 to reconcile for at least one of those years?</p>
          <div className="space-y-2 max-w-md">
            <label className="flex items-start gap-2 p-3 rounded border border-gray-200 bg-white cursor-pointer">
              <input type="radio" name="8962" checked={u.taxFiling8962 === "filed"} onChange={() => set({ taxFiling8962: "filed" })} className="mt-0.5 w-4 h-4 accent-[#22c55e]" />
              <span className="text-sm text-gray-700">Yes, got premium tax credits and filed Form 8962 for at least one year</span>
            </label>
            <label className="flex items-start gap-2 p-3 rounded border border-gray-200 bg-white cursor-pointer">
              <input type="radio" name="8962" checked={u.taxFiling8962 === "not-filed"} onChange={() => set({ taxFiling8962: "not-filed" })} className="mt-0.5 w-4 h-4 accent-[#22c55e]" />
              <span className="text-sm text-gray-700">No, either didn&apos;t get them or didn&apos;t file Form 8962</span>
            </label>
          </div>
        </div>
      </div>
      <NavButtons onBack={onBack} onContinue={onNext} />
    </FormCard>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   STEP: Finalize → Review
   ────────────────────────────────────────────────────────────────────────── */

function FinalizeReview({ app, onBack, onNext }: StepProps) {
  const p = app.primaryContact;
  const h = p.homeAddress;
  const c = p.contactDetails;
  const applicantCount = 1 + app.household.applicants.length;

  return (
    <FormCard title="Finalize — review" description="Take a minute to review everything you've told us. Use the sidebar to jump back and edit.">
      <ReviewSection title="Primary contact">
        <dl className="text-sm text-gray-700 space-y-1">
          <Row k="Full name" v={`${p.firstName} ${p.middleName ? p.middleName + " " : ""}${p.lastName}${p.suffix ? " " + p.suffix : ""}`.trim()} />
          <Row k="Date of birth" v={p.dob || "—"} />
          <Row k="Sex" v={p.sex || "—"} />
          <Row k="Phone" v={c.phone || "—"} />
          <Row k="Email" v={c.email || "—"} />
          <Row k="Home address" v={h.hasNoPermanent ? "No permanent address" : `${h.street}${h.apt ? " " + h.apt : ""}, ${h.city}, ${h.state} ${h.zip}`} />
          <Row k="Preferred notices" v={c.noticePref === "mail" ? "Mail" : c.noticePref === "electronic" ? "Email/text" : "—"} />
          <Row k="Languages" v={`Written: ${c.writtenLanguage} · Spoken: ${c.spokenLanguage}`} />
        </dl>
      </ReviewSection>

      <ReviewSection title="Household">
        <dl className="text-sm text-gray-700 space-y-1">
          <Row k="Applicants on application" v={String(applicantCount)} />
          <Row k="Wants cost savings" v={app.household.wantsCostSavings || "—"} />
          <Row k="Married" v={app.household.taxInfo.married || "—"} />
          <Row k="Filing 2026 taxes" v={app.household.taxInfo.filingTaxes2026 || "—"} />
          <Row k="Claiming dependents" v={app.household.taxInfo.claimingDependents || "—"} />
          <Row k="Medicare-enrolled members" v={app.household.medicareEnrolledIds.length ? String(app.household.medicareEnrolledIds.length) : "None"} />
        </dl>
      </ReviewSection>

      <ReviewSection title="Income">
        <dl className="text-sm text-gray-700 space-y-1">
          {Object.values(app.income).length === 0 && <Row k="Summary" v="No income reported" />}
          {Object.values(app.income).map((i) => (
            <Row key={i.memberId} k={`${i.memberId === "primary" ? p.firstName || "Primary" : "Applicant"} — sources`} v={i.entries.length ? i.entries.map((e) => `${e.type} ($${e.amount.toLocaleString()} ${e.frequency || ""})`).join("; ") : "None"} />
          ))}
        </dl>
      </ReviewSection>

      <NavButtons onBack={onBack} onContinue={onNext} />
    </FormCard>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 pt-4 border-t border-gray-100 first:border-t-0 first:pt-0 first:mt-0">
      <h3 className="text-violet-700 font-bold text-base mb-3">{title}</h3>
      {children}
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-4 py-1"><dt className="text-gray-500">{k}</dt><dd className="text-right text-gray-800 font-medium">{v || "—"}</dd></div>;
}

/* ──────────────────────────────────────────────────────────────────────────
   STEP: Finalize → Agreements
   ────────────────────────────────────────────────────────────────────────── */

function FinalizeAgreements({ app, dispatch, onBack, onNext }: StepProps) {
  const a = app.finalize.agreements;
  const set = (patch: Partial<typeof a>) =>
    dispatch((prev) => ({ ...prev, finalize: { ...prev.finalize, agreements: { ...prev.finalize.agreements, ...patch } } }));

  return (
    <FormCard title="Agreements" description="Please read the attestations and select a response for each statement.">
      <p className="text-violet-700 font-semibold text-sm mb-2">Renewal of eligibility</p>
      <p className="text-gray-700 text-sm mb-4">To make it easier to determine your eligibility for help paying for coverage in future years, I agree to allow the Marketplace to use my income data, including information from tax returns, for the next 5 years. The Marketplace will send notices and let me opt out at any time.</p>
      <div className="grid grid-cols-2 gap-2 max-w-md">
        {([["yes","I agree"],["no","I disagree"]] as const).map(([v, lbl]) => {
          const active = a.renewEligibility === v;
          return (
            <label key={v} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition ${active ? "border-[#22c55e] bg-[#22c55e]/10 text-[#15803d]" : "border-gray-300 bg-white text-gray-700 hover:border-gray-500"}`}>
              <input type="radio" name="renew-elig" checked={active} onChange={() => set({ renewEligibility: v })} className="w-4 h-4 accent-[#22c55e]" />
              <span className="text-sm font-medium">{lbl}</span>
            </label>
          );
        })}
      </div>

      {a.renewEligibility === "yes" && (
        <div className="mt-5">
          <Field label="How long would you like your eligibility to be renewed?">
            <select className={inputCls + " max-w-xs"} value={a.renewalYears} onChange={(e) => set({ renewalYears: e.target.value as typeof a.renewalYears })}>
              <option value="">Select</option>
              <option value="1">1 year</option><option value="2">2 years</option><option value="3">3 years</option><option value="4">4 years</option><option value="5">5 years</option>
            </select>
          </Field>
          <p className="text-xs text-gray-500 mt-2">Opting out may affect your ability to get help paying for coverage when you renew.</p>
        </div>
      )}

      <NavButtons onBack={onBack} onContinue={onNext} />
    </FormCard>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   STEP: Finalize → Tax attestation
   ────────────────────────────────────────────────────────────────────────── */

function FinalizeTaxAttestation({ app, dispatch, onBack, onNext }: StepProps) {
  const t = app.finalize.taxAttestation;
  const set = (patch: Partial<typeof t>) =>
    dispatch((prev) => ({ ...prev, finalize: { ...prev.finalize, taxAttestation: { ...prev.finalize.taxAttestation, ...patch } } }));
  return (
    <FormCard title="Tax attestation" description="Please read the attestations and select a response for each statement.">
      <p className="text-gray-700 text-sm mb-4">I understand that I&apos;m not eligible for a premium tax credit if I&apos;m found eligible for other qualifying health coverage, like Medicaid, CHIP, or a job-based health plan. If I become eligible for other qualifying coverage, I must contact the Marketplace to end my Marketplace coverage and premium tax credit.</p>
      <Field label="Do you agree?">
        <YesNoRadio name="tax-elig" value={t.understandsEligibilityRules} onChange={(v) => set({ understandsEligibilityRules: v })} />
      </Field>

      <div className="mt-6">
        <p className="text-gray-700 text-sm mb-4">I understand that when I file my 2026 federal income tax return, the IRS will compare the income on my return with the income on my application. If income differs, I may be eligible for an additional credit — or I may owe additional federal income tax.</p>
        <Field label="Do you agree?">
          <YesNoRadio name="tax-recon" value={t.understandsReconciliation} onChange={(v) => set({ understandsReconciliation: v })} />
        </Field>
      </div>

      <NavButtons onBack={onBack} onContinue={onNext} />
    </FormCard>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   STEP: Finalize → Sign and submit
   ────────────────────────────────────────────────────────────────────────── */

function FinalizeSignSubmit({ app, dispatch, onBack, onSubmit, submitting, submitError }: StepProps) {
  const s = app.finalize.signAndSubmit;
  const expectedName = `${app.primaryContact.firstName} ${app.primaryContact.lastName}`.trim();
  const set = (patch: Partial<typeof s>) =>
    dispatch((prev) => ({ ...prev, finalize: { ...prev.finalize, signAndSubmit: { ...prev.finalize.signAndSubmit, ...patch } } }));

  const canSubmit =
    s.agreeToReportChanges === "yes" &&
    s.endOverlappingCoverage !== "" &&
    s.agreeToTruthfulness === "yes" &&
    s.signatureName.trim().toLowerCase() === expectedName.toLowerCase() &&
    expectedName.length > 0;

  return (
    <FormCard title="Sign and submit" description="Please read the attestations and select a response for each statement.">
      <p className="text-gray-700 text-sm mb-3">I know that I must tell the program I&apos;ll be enrolled in within 30 days if information on this application changes. I know I can make changes in my Marketplace account or by calling the Marketplace Call Center at 1-800-318-2596 (TTY: 1-855-889-4325).</p>
      <Field label="Do you agree?">
        <YesNoRadio name="agree-report" value={s.agreeToReportChanges} onChange={(v) => set({ agreeToReportChanges: v })} />
      </Field>

      <p className="text-gray-700 text-sm mt-6 mb-3">If anyone on your application is enrolled in Marketplace coverage and is also found to have Medicare coverage, the Marketplace will automatically end their Marketplace plan coverage.</p>
      <div className="space-y-2 max-w-xl">
        <label className={`flex items-start gap-2 p-3 rounded border cursor-pointer ${s.endOverlappingCoverage === "agree" ? "border-[#22c55e] bg-[#22c55e]/10" : "border-gray-200 bg-white"}`}>
          <input type="radio" name="overlap" checked={s.endOverlappingCoverage === "agree"} onChange={() => set({ endOverlappingCoverage: "agree" })} className="mt-0.5 w-4 h-4 accent-[#22c55e]" />
          <span className="text-sm text-gray-700">I agree to allow the Marketplace to end Marketplace coverage for anyone also enrolled in Medicare.</span>
        </label>
        <label className={`flex items-start gap-2 p-3 rounded border cursor-pointer ${s.endOverlappingCoverage === "disagree" ? "border-[#22c55e] bg-[#22c55e]/10" : "border-gray-200 bg-white"}`}>
          <input type="radio" name="overlap" checked={s.endOverlappingCoverage === "disagree"} onChange={() => set({ endOverlappingCoverage: "disagree" })} className="mt-0.5 w-4 h-4 accent-[#22c55e]" />
          <span className="text-sm text-gray-700">I don&apos;t give the Marketplace permission. I understand the person will pay the full cost for the Marketplace plan premium and covered services.</span>
        </label>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100">
        <p className="text-violet-700 font-semibold text-sm mb-2">Sign</p>
        <p className="text-gray-700 text-sm mb-3">I&apos;m signing this application under penalty of perjury. I understand I may be subject to penalties under federal law if I intentionally provide false information.</p>
        <Field label="Do you agree?">
          <YesNoRadio name="truth" value={s.agreeToTruthfulness} onChange={(v) => set({ agreeToTruthfulness: v })} />
        </Field>
        <div className="mt-4">
          <Field label={`${expectedName || "Primary applicant"}, type your full name below to sign electronically.`}>
            <input className={inputCls + " max-w-md"} value={s.signatureName} onChange={(e) => set({ signatureName: e.target.value })} placeholder={expectedName || "Full name"} />
          </Field>
          {s.signatureName && expectedName && s.signatureName.trim().toLowerCase() !== expectedName.toLowerCase() && (
            <p className="text-xs text-red-600 mt-1">Please type your full name exactly as it appears on the application: <strong>{expectedName}</strong>.</p>
          )}
        </div>
      </div>

      {submitError && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <strong>Couldn&apos;t submit:</strong> {submitError}
        </div>
      )}

      <NavButtons onBack={onBack} onContinue={onSubmit} continueLabel={submitting ? "Submitting…" : "Submit application"} canContinue={canSubmit && !submitting} continueVariant="submit" />
    </FormCard>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   US States lookup
   ────────────────────────────────────────────────────────────────────────── */

const US_STATES = [
  {code:"AL",name:"Alabama"},{code:"AK",name:"Alaska"},{code:"AZ",name:"Arizona"},{code:"AR",name:"Arkansas"},{code:"CA",name:"California"},{code:"CO",name:"Colorado"},{code:"CT",name:"Connecticut"},{code:"DE",name:"Delaware"},{code:"DC",name:"District of Columbia"},{code:"FL",name:"Florida"},{code:"GA",name:"Georgia"},{code:"HI",name:"Hawaii"},{code:"ID",name:"Idaho"},{code:"IL",name:"Illinois"},{code:"IN",name:"Indiana"},{code:"IA",name:"Iowa"},{code:"KS",name:"Kansas"},{code:"KY",name:"Kentucky"},{code:"LA",name:"Louisiana"},{code:"ME",name:"Maine"},{code:"MD",name:"Maryland"},{code:"MA",name:"Massachusetts"},{code:"MI",name:"Michigan"},{code:"MN",name:"Minnesota"},{code:"MS",name:"Mississippi"},{code:"MO",name:"Missouri"},{code:"MT",name:"Montana"},{code:"NE",name:"Nebraska"},{code:"NV",name:"Nevada"},{code:"NH",name:"New Hampshire"},{code:"NJ",name:"New Jersey"},{code:"NM",name:"New Mexico"},{code:"NY",name:"New York"},{code:"NC",name:"North Carolina"},{code:"ND",name:"North Dakota"},{code:"OH",name:"Ohio"},{code:"OK",name:"Oklahoma"},{code:"OR",name:"Oregon"},{code:"PA",name:"Pennsylvania"},{code:"RI",name:"Rhode Island"},{code:"SC",name:"South Carolina"},{code:"SD",name:"South Dakota"},{code:"TN",name:"Tennessee"},{code:"TX",name:"Texas"},{code:"UT",name:"Utah"},{code:"VT",name:"Vermont"},{code:"VA",name:"Virginia"},{code:"WA",name:"Washington"},{code:"WV",name:"West Virginia"},{code:"WI",name:"Wisconsin"},{code:"WY",name:"Wyoming"},
];

export default function UnderEnrollmentPage() {
  return (
    <Suspense>
      <EnrollmentWizard />
    </Suspense>
  );
}
