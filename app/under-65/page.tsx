"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { parseParams } from "@/lib/params";
import { fetchUnder65Plans } from "@/lib/under65/adapter";
import type { Under65Plan } from "@/types/under65";
import PlanCard from "@/components/plan-card";
import SkeletonCard from "@/components/skeleton-card";
import EmptyState from "@/components/empty-state";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function loadPlans() {
    setLoading(true);
    setError(false);
    try {
      const results = await fetchUnder65Plans({
        zip,
        dob,
        gender,
        income,
        tobacco,
        householdSize,
        coverageStartDate: coverageStart,
      });
      setPlans(results);
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
        className={`w-full lg:w-72 shrink-0 bg-[#2d1b4e] p-5 ${
          sidebarOpen ? "block" : "hidden"
        } lg:block`}
      >
        <form onSubmit={handleSearch} className="space-y-4">
          <h2 className="text-white/60 font-semibold text-xs uppercase tracking-wider">
            Your Info
          </h2>

          <div>
            <label className="text-white/70 text-xs block mb-1">ZIP Code</label>
            <input
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#22c55e]"
              placeholder="33334"
            />
          </div>
          <div>
            <label className="text-white/70 text-xs block mb-1">Date of Birth</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#22c55e]"
            />
          </div>
          <div>
            <label className="text-white/70 text-xs block mb-1">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#22c55e]"
            >
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-white/70 text-xs block mb-1">Household Income</label>
            <select
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#22c55e]"
            >
              <option value="">Select</option>
              <option value="0-25k">$0 – $25k</option>
              <option value="25-50k">$25k – $50k</option>
              <option value="50-75k">$50k – $75k</option>
              <option value="75k+">$75k+</option>
            </select>
          </div>

          <hr className="border-white/10" />
          <h2 className="text-white/60 font-semibold text-xs uppercase tracking-wider">
            Plan Details
          </h2>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="tobacco"
              checked={tobacco}
              onChange={(e) => setTobacco(e.target.checked)}
              className="accent-[#22c55e]"
            />
            <label htmlFor="tobacco" className="text-white/70 text-sm">
              Tobacco use
            </label>
          </div>
          <div>
            <label className="text-white/70 text-xs block mb-1">Household Size</label>
            <input
              type="number"
              min={1}
              max={20}
              value={householdSize}
              onChange={(e) => setHouseholdSize(Number(e.target.value))}
              className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#22c55e]"
            />
          </div>
          <div>
            <label className="text-white/70 text-xs block mb-1">Coverage Start Date</label>
            <input
              type="date"
              value={coverageStart}
              onChange={(e) => setCoverageStart(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#22c55e]"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#22c55e] text-white font-semibold py-2.5 rounded-md text-sm hover:bg-green-500 transition-colors mt-2"
          >
            Search Plans
          </button>
        </form>
      </aside>

      {/* Results */}
      <main className="flex-1 bg-[#3d1f5e] p-6">
        <button
          className="lg:hidden mb-4 flex items-center gap-2 text-white/70 text-sm border border-white/20 rounded-md px-3 py-1.5 hover:border-white/40 transition-colors"
          onClick={() => setSidebarOpen((o) => !o)}
        >
          {sidebarOpen ? "Hide Filters" : "Show Filters"}
        </button>

        <h1 className="text-white text-2xl font-bold mb-1">
          Find Your Best Health Insurance Plan
        </h1>
        {!loading && !error && (
          <p className="text-white/60 text-sm mb-5">{plans.length} plans available</p>
        )}

        {loading && (
          <div>
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}
        {error && <EmptyState type="error" onRetry={loadPlans} />}
        {!loading && !error && plans.length === 0 && <EmptyState type="no-results" />}

        {!loading &&
          !error &&
          plans.map((plan, i) => (
            <PlanCard
              key={plan.id}
              isFeatured={i === 0}
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
