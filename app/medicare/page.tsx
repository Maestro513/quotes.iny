"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { parseParams } from "@/lib/params";
import { fetchMedicarePlans } from "@/lib/medicare/adapter";
import type { MedicarePlan, MedicarePlanType } from "@/types/medicare";
import PlanCard from "@/components/plan-card";
import SkeletonCard from "@/components/skeleton-card";
import EmptyState from "@/components/empty-state";

const PLAN_TYPES: { label: string; value: MedicarePlanType | "" }[] = [
  { label: "All Plans", value: "" },
  { label: "Medicare Advantage", value: "MA" },
  { label: "Supplement", value: "Supplement" },
  { label: "Part D", value: "PartD" },
];

function MedicareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const parsed = parseParams(searchParams);

  const [zip, setZip] = useState(parsed.zip);
  const [planTypeFilter, setPlanTypeFilter] = useState<MedicarePlanType | "">("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [plans, setPlans] = useState<MedicarePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function loadPlans(
    currentZip = zip,
    currentType = planTypeFilter
  ) {
    setLoading(true);
    setError(false);
    try {
      const results = await fetchMedicarePlans({
        zip: currentZip,
        planType: currentType || undefined,
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
    const params = new URLSearchParams({ zip });
    router.replace(`/medicare?${params.toString()}`);
    loadPlans(zip, planTypeFilter);
  }

  function handleTypeFilter(type: MedicarePlanType | "") {
    setPlanTypeFilter(type);
    loadPlans(zip, type);
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
          <button
            type="submit"
            className="w-full bg-[#22c55e] text-white font-semibold py-2.5 rounded-md text-sm hover:bg-green-500 transition-colors"
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

        <h1 className="text-white text-2xl font-bold mb-4">
          Find Your Best Medicare Plan
        </h1>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 mb-5">
          {PLAN_TYPES.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => handleTypeFilter(value)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                planTypeFilter === value
                  ? "bg-[#22c55e] text-white"
                  : "border border-white/30 text-white/70 hover:border-white/60 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {!loading && !error && (
          <p className="text-white/60 text-sm mb-4">{plans.length} plans available</p>
        )}

        {loading && (
          <div>
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}
        {error && <EmptyState type="error" onRetry={() => loadPlans()} />}
        {!loading && !error && plans.length === 0 && <EmptyState type="no-results" />}

        {!loading &&
          !error &&
          plans.map((plan, i) => (
            <PlanCard
              key={plan.id}
              isFeatured={i === 0}
              planName={plan.name}
              carrier={plan.carrier}
              monthlyPremium={plan.premium_monthly}
              badges={[plan.type]}
              details={plan.highlights}
              primaryCta={{ label: "View Plan", href: "#" }}
              secondaryCta={{ label: "Call Agent", href: "tel:844-467-6968" }}
            />
          ))}
      </main>
    </div>
  );
}

export default function MedicarePage() {
  return (
    <Suspense>
      <MedicareContent />
    </Suspense>
  );
}
