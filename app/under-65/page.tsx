"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { parseParams } from "@/lib/params";
import { fetchUnder65Plans } from "@/lib/under65/adapter";
import type { Under65Plan } from "@/types/under65";
import PlanCard from "@/components/plan-card";
import SkeletonCard from "@/components/skeleton-card";
import EmptyState from "@/components/empty-state";
import Pagination from "@/components/pagination";

const PAGE_SIZE = 20;

const sidebarInput =
  "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/60 focus:bg-white/10 transition-colors";

const sidebarLabel = "text-white/50 text-[11px] uppercase tracking-wider block mb-1.5 font-medium";

function Under65Content() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const parsed = parseParams(searchParams);

  const [zip, setZip] = useState(parsed.zip);
  const [dob, setDob] = useState(parsed.dob);
  const [gender, setGender] = useState(parsed.gender);
  const [income, setIncome] = useState(parsed.income);
  const [tobacco, setTobacco] = useState(false);
  const [householdSize, setHouseholdSize] = useState(1);
  const [coverageStart, setCoverageStart] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [plans, setPlans] = useState<Under65Plan[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function loadPlans() {
    setLoading(true);
    setError(false);
    try {
      const results = await fetchUnder65Plans({
        zip, dob, gender, income, tobacco, householdSize,
        coverageStartDate: coverageStart,
      });
      setPlans(results);
      setPage(1);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlans();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ zip, dob, gender, income });
    router.replace(`/under-65?${params.toString()}`);
    loadPlans();
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside
        className={`w-full lg:w-72 shrink-0 bg-[#1e0f36]/80 backdrop-blur-md border-r border-white/[0.07] p-5 ${
          sidebarOpen ? "block" : "hidden"
        } lg:block`}
      >
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <p className="text-white/70 font-semibold text-xs uppercase tracking-widest mb-4">Your Info</p>
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

          <div className="border-t border-white/[0.07] pt-4">
            <p className="text-white/70 font-semibold text-xs uppercase tracking-widest mb-3">Plan Details</p>
            <div className="space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={tobacco}
                  onChange={(e) => setTobacco(e.target.checked)}
                  className="w-4 h-4 accent-[#22c55e]"
                />
                <span className="text-white/60 text-sm group-hover:text-white/80 transition-colors">Tobacco use</span>
              </label>
              <div>
                <label className={sidebarLabel}>Household Size</label>
                <input
                  type="number" min={1} max={20} value={householdSize}
                  onChange={(e) => setHouseholdSize(Number(e.target.value))}
                  className={sidebarInput}
                />
              </div>
              <div>
                <label className={sidebarLabel}>Coverage Start Date</label>
                <input type="date" value={coverageStart} onChange={(e) => setCoverageStart(e.target.value)} className={sidebarInput} />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#22c55e] text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-green-400 transition-colors shadow-[0_0_16px_rgba(34,197,94,0.2)] cursor-pointer"
          >
            Search Plans
          </button>
        </form>
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
          {sidebarOpen ? "Hide Filters" : "Show Filters"}
        </button>

        <div className="mb-6">
          <h1 className="text-white text-2xl font-bold tracking-tight">Find Your Best Health Plan</h1>
          {!loading && !error && plans.length > 0 && (
            <p className="text-white/40 text-sm mt-1">{plans.length} plan{plans.length !== 1 ? "s" : ""} available</p>
          )}
        </div>

        {loading && [1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        {error && <EmptyState type="error" onRetry={loadPlans} />}
        {!loading && !error && plans.length === 0 && <EmptyState type="no-results" />}

        {!loading && !error && (() => {
          const totalPages = Math.ceil(plans.length / PAGE_SIZE);
          const pagePlans = plans.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
          return (
            <>
              {pagePlans.map((plan, i) => (
                <PlanCard
                  key={plan.id}
                  isFeatured={page === 1 && i === 0}
                  planName={plan.name}
                  carrier={plan.carrier}
                  monthlyPremium={plan.netPremium}
                  badges={[plan.metalTier]}
                  details={[
                    `Deductible: $${plan.deductible.toLocaleString()}`,
                    `OOP Max: $${plan.outOfPocketMax.toLocaleString()}`,
                    `Subsidy: -$${plan.estimatedSubsidy}/mo`,
                  ]}
                  primaryCta={{ label: "Enroll Now", href: "#" }}
                  secondaryCta={{ label: "Learn More", href: "#" }}
                />
              ))}
              <Pagination
                page={page}
                totalPages={totalPages}
                total={plans.length}
                pageSize={PAGE_SIZE}
                onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              />
            </>
          );
        })()}
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
