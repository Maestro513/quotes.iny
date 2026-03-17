"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo, Suspense } from "react";
import { parseParams } from "@/lib/params";
import { fetchUnder65Plans } from "@/lib/under65/adapter";
import type { Under65Plan, MetalTier, PlanType } from "@/types/under65";
import PlanCard from "@/components/plan-card";
import SkeletonCard from "@/components/skeleton-card";
import EmptyState from "@/components/empty-state";
import Pagination from "@/components/pagination";
import CoverageSearch from "@/components/coverage-search";

const PAGE_SIZE = 20;

const METAL_TIERS: MetalTier[] = ["Bronze", "Silver", "Gold", "Platinum", "Catastrophic"];
const PLAN_TYPES: PlanType[] = ["HMO", "PPO", "EPO", "POS"];
const SORT_OPTIONS = [
  { label: "Lowest Premium", value: "premium-asc" },
  { label: "Highest Premium", value: "premium-desc" },
  { label: "Lowest Deductible", value: "deductible-asc" },
  { label: "Lowest OOP Max", value: "oop-asc" },
];

const sidebarInput =
  "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/60 focus:bg-white/10 transition-colors";
const sidebarLabel = "text-white/50 text-[11px] uppercase tracking-wider block mb-1.5 font-medium";
const sectionTitle = "text-white/70 font-semibold text-xs uppercase tracking-widest mb-3";
const divider = "border-t border-white/[0.07] pt-4";

function CheckPill({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 cursor-pointer ${
        checked
          ? "bg-[#22c55e]/20 border-[#22c55e]/60 text-[#22c55e]"
          : "border-white/15 text-white/50 hover:border-white/30 hover:text-white/80"
      }`}
    >
      {label}
    </button>
  );
}

function Under65Content() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const parsed = parseParams(searchParams);

  // Search params
  const [zip, setZip] = useState(parsed.zip);
  const [dob, setDob] = useState(parsed.dob);
  const [gender, setGender] = useState(parsed.gender);
  const [income, setIncome] = useState(parsed.income);
  const [tobacco, setTobacco] = useState(false);
  const [householdSize, setHouseholdSize] = useState(1);
  const [coverageStart, setCoverageStart] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filter + sort state
  const [metalFilter, setMetalFilter] = useState<MetalTier[]>([]);
  const [typeFilter, setTypeFilter] = useState<PlanType[]>([]);
  const [hsaOnly, setHsaOnly] = useState(false);
  const [maxPremium, setMaxPremium] = useState("");
  const [sortBy, setSortBy] = useState("premium-asc");

  // Doctor / Rx coverage filters
  const [doctorNpi, setDoctorNpi] = useState<string | null>(null);
  const [doctorLabel, setDoctorLabel] = useState("");
  const [doctorCoveredIds, setDoctorCoveredIds] = useState<Set<string> | null>(null);
  const [doctorLoading, setDoctorLoading] = useState(false);

  const [drugRxcui, setDrugRxcui] = useState<string | null>(null);
  const [drugLabel, setDrugLabel] = useState("");
  const [drugCoveredIds, setDrugCoveredIds] = useState<Set<string> | null>(null);
  const [drugLoading, setDrugLoading] = useState(false);

  // Data state
  const [allPlans, setAllPlans] = useState<Under65Plan[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function loadPlans() {
    setLoading(true);
    setError(false);
    try {
      const results = await fetchUnder65Plans({ zip, dob, gender, income, tobacco, householdSize, coverageStartDate: coverageStart });
      setAllPlans(results);
      setPage(1);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPlans(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [metalFilter, typeFilter, hsaOnly, maxPremium, sortBy, doctorCoveredIds, drugCoveredIds]);

  async function checkCoverage(type: "provider" | "drug", id: string) {
    const planIds = allPlans.map((p) => p.id);
    if (!planIds.length) return new Set<string>();
    const res = await fetch("/api/under65/coverage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id, planIds, year: new Date().getFullYear() }),
    });
    const data = await res.json();
    return new Set<string>(data.coveredIds ?? []);
  }

  async function handleDoctorSelect(npi: string, label: string) {
    setDoctorNpi(npi);
    setDoctorLabel(label);
    setDoctorLoading(true);
    const covered = await checkCoverage("provider", npi);
    setDoctorCoveredIds(covered);
    setDoctorLoading(false);
  }

  async function handleDrugSelect(rxcui: string, label: string) {
    setDrugRxcui(rxcui);
    setDrugLabel(label);
    setDrugLoading(true);
    const covered = await checkCoverage("drug", rxcui);
    setDrugCoveredIds(covered);
    setDrugLoading(false);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.replace(`/under-65?${new URLSearchParams({ zip, dob, gender, income }).toString()}`);
    loadPlans();
  }

  function toggleMetal(tier: MetalTier) {
    setMetalFilter((prev) => prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier]);
  }

  function toggleType(type: PlanType) {
    setTypeFilter((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]);
  }

  // Apply filters + sort client-side
  const filteredPlans = useMemo(() => {
    let plans = [...allPlans];
    if (metalFilter.length) plans = plans.filter((p) => metalFilter.includes(p.metalTier));
    if (typeFilter.length) plans = plans.filter((p) => typeFilter.includes(p.planType as PlanType));
    if (hsaOnly) plans = plans.filter((p) => p.hsaEligible);
    if (maxPremium) plans = plans.filter((p) => p.netPremium <= Number(maxPremium));
    if (doctorCoveredIds) plans = plans.filter((p) => doctorCoveredIds.has(p.id));
    if (drugCoveredIds) plans = plans.filter((p) => drugCoveredIds.has(p.id));
    switch (sortBy) {
      case "premium-desc": plans.sort((a, b) => b.netPremium - a.netPremium); break;
      case "deductible-asc": plans.sort((a, b) => a.deductible - b.deductible); break;
      case "oop-asc": plans.sort((a, b) => a.outOfPocketMax - b.outOfPocketMax); break;
      default: plans.sort((a, b) => a.netPremium - b.netPremium);
    }
    return plans;
  }, [allPlans, metalFilter, typeFilter, hsaOnly, maxPremium, sortBy, doctorCoveredIds, drugCoveredIds]);

  const totalPages = Math.ceil(filteredPlans.length / PAGE_SIZE);
  const pagePlans = filteredPlans.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeFilterCount =
    metalFilter.length + typeFilter.length +
    (hsaOnly ? 1 : 0) + (maxPremium ? 1 : 0) +
    (doctorNpi ? 1 : 0) + (drugRxcui ? 1 : 0);

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside
        className={`w-full lg:w-72 shrink-0 bg-[#1e0f36]/80 backdrop-blur-md border-r border-white/[0.07] p-5 overflow-y-auto ${
          sidebarOpen ? "block" : "hidden"
        } lg:block`}
      >
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Your Info */}
          <div>
            <p className={sectionTitle}>Your Info</p>
            <div className="space-y-3">
              <div>
                <label className={sidebarLabel}>ZIP Code</label>
                <input value={zip} onChange={(e) => setZip(e.target.value)} className={sidebarInput} placeholder="33334" />
              </div>
              <div>
                <label className={sidebarLabel}>Date of Birth</label>
                <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={sidebarInput} />
              </div>
              <div>
                <label className={sidebarLabel}>Gender</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} className={sidebarInput}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className={sidebarLabel}>Household Income</label>
                <select value={income} onChange={(e) => setIncome(e.target.value)} className={sidebarInput}>
                  <option value="">Select</option>
                  <option value="0-25k">$0 – $25k</option>
                  <option value="25-50k">$25k – $50k</option>
                  <option value="50-75k">$50k – $75k</option>
                  <option value="75k+">$75k+</option>
                </select>
              </div>
            </div>
          </div>

          {/* Plan Details */}
          <div className={divider}>
            <p className={sectionTitle}>Plan Details</p>
            <div className="space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input type="checkbox" checked={tobacco} onChange={(e) => setTobacco(e.target.checked)} className="w-4 h-4 accent-[#22c55e]" />
                <span className="text-white/60 text-sm group-hover:text-white/80 transition-colors">Tobacco use</span>
              </label>
              <div>
                <label className={sidebarLabel}>Household Size</label>
                <input type="number" min={1} max={20} value={householdSize} onChange={(e) => setHouseholdSize(Number(e.target.value))} className={sidebarInput} />
              </div>
              <div>
                <label className={sidebarLabel}>Coverage Start Date</label>
                <input type="date" value={coverageStart} onChange={(e) => setCoverageStart(e.target.value)} className={sidebarInput} />
              </div>
            </div>
          </div>

          <button type="submit" className="w-full bg-[#22c55e] text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-green-400 transition-colors shadow-[0_0_16px_rgba(34,197,94,0.2)] cursor-pointer">
            Search Plans
          </button>
        </form>

        {/* Filters (client-side, no re-fetch) */}
        <div className="mt-5 space-y-4">
          {/* Sort */}
          <div className={divider}>
            <p className={sectionTitle}>Sort By</p>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={sidebarInput}>
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Metal tier */}
          <div className={divider}>
            <p className={sectionTitle}>Metal Tier</p>
            <div className="flex flex-wrap gap-1.5">
              {METAL_TIERS.map((tier) => (
                <CheckPill key={tier} label={tier} checked={metalFilter.includes(tier)} onChange={() => toggleMetal(tier)} />
              ))}
            </div>
          </div>

          {/* Plan type */}
          <div className={divider}>
            <p className={sectionTitle}>Plan Type</p>
            <div className="flex flex-wrap gap-1.5">
              {PLAN_TYPES.map((type) => (
                <CheckPill key={type} label={type} checked={typeFilter.includes(type)} onChange={() => toggleType(type)} />
              ))}
            </div>
          </div>

          {/* Max premium */}
          <div className={divider}>
            <label className={sidebarLabel}>Max Monthly Premium</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
              <input
                type="number" min={0} value={maxPremium}
                onChange={(e) => setMaxPremium(e.target.value)}
                className={sidebarInput + " pl-7"}
                placeholder="No limit"
              />
            </div>
          </div>

          {/* HSA */}
          <div className={divider}>
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input type="checkbox" checked={hsaOnly} onChange={(e) => setHsaOnly(e.target.checked)} className="w-4 h-4 accent-[#22c55e]" />
              <span className="text-white/60 text-sm group-hover:text-white/80 transition-colors">HSA eligible only</span>
            </label>
          </div>

          {/* Doctor coverage */}
          <div className={divider}>
            <p className={sectionTitle}>Find My Doctor</p>
            <CoverageSearch
              type="provider"
              zip={zip}
              selectedId={doctorNpi}
              selectedLabel={doctorLabel}
              loading={doctorLoading}
              onSelect={handleDoctorSelect}
              onClear={() => { setDoctorNpi(null); setDoctorLabel(""); setDoctorCoveredIds(null); }}
            />
          </div>

          {/* Rx coverage */}
          <div className={divider}>
            <p className={sectionTitle}>Find My Medication</p>
            <CoverageSearch
              type="drug"
              zip={zip}
              selectedId={drugRxcui}
              selectedLabel={drugLabel}
              loading={drugLoading}
              onSelect={handleDrugSelect}
              onClear={() => { setDrugRxcui(null); setDrugLabel(""); setDrugCoveredIds(null); }}
            />
          </div>

          {/* Clear filters */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setMetalFilter([]); setTypeFilter([]); setHsaOnly(false); setMaxPremium(""); setSortBy("premium-asc");
                setDoctorNpi(null); setDoctorLabel(""); setDoctorCoveredIds(null);
                setDrugRxcui(null); setDrugLabel(""); setDrugCoveredIds(null);
              }}
              className="w-full text-xs text-white/40 hover:text-white/70 border border-white/10 hover:border-white/25 rounded-lg py-2 transition-colors cursor-pointer"
            >
              Clear all filters ({activeFilterCount})
            </button>
          )}
        </div>
      </aside>

      {/* Results */}
      <main className="flex-1 p-6">
        <button
          className="lg:hidden mb-5 flex items-center gap-2 text-white/60 text-sm border border-white/15 rounded-lg px-3 py-2 hover:border-white/30 hover:text-white/80 transition-colors cursor-pointer"
          onClick={() => setSidebarOpen((o) => !o)}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" />
          </svg>
          {sidebarOpen ? "Hide Filters" : `Filters${activeFilterCount ? ` (${activeFilterCount})` : ""}`}
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Find Your Best Health Plan</h1>
            {!loading && !error && allPlans.length > 0 && (
              <p className="text-white/40 text-sm mt-1">
                {filteredPlans.length} of {allPlans.length} plan{allPlans.length !== 1 ? "s" : ""}
                {activeFilterCount > 0 && " match your filters"}
              </p>
            )}
          </div>
        </div>

        {loading && [1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        {error && <EmptyState type="error" onRetry={loadPlans} />}
        {!loading && !error && filteredPlans.length === 0 && (
          <EmptyState type="no-results" />
        )}

        {!loading && !error && pagePlans.map((plan, i) => (
          <PlanCard
            key={plan.id}
            isFeatured={page === 1 && i === 0}
            planName={plan.name}
            carrier={plan.carrier}
            monthlyPremium={plan.netPremium}
            badges={[plan.metalTier, plan.planType].filter(Boolean)}
            details={[
              `Deductible: $${plan.deductible.toLocaleString()}`,
              `OOP Max: $${plan.outOfPocketMax.toLocaleString()}`,
              `Subsidy: -$${plan.estimatedSubsidy}/mo`,
              ...(plan.hsaEligible ? ["HSA: Eligible"] : []),
            ]}
            primaryCta={{ label: "Enroll Now", href: "#" }}
            secondaryCta={{ label: "Learn More", href: "#" }}
          />
        ))}

        {!loading && !error && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={filteredPlans.length}
            pageSize={PAGE_SIZE}
            onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          />
        )}
      </main>
    </div>
  );
}

export default function Under65Page() {
  return (
    <Suspense>
      <Under65Content />
    </Suspense>
  );
}
