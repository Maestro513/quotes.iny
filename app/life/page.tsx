"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { parseParams } from "@/lib/params";
import type { CoverageAmount, TermLength } from "@/types/life";
import EmptyState from "@/components/empty-state";

const COVERAGE_OPTIONS: CoverageAmount[] = ["100k", "250k", "500k", "1M+"];
const TERM_OPTIONS: TermLength[] = ["10yr", "20yr", "30yr", "Whole Life"];

const LIFE_API_ENABLED = process.env.NEXT_PUBLIC_LIFE_API_ENABLED === "true";

function LifeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const parsed = parseParams(searchParams);

  const [zip, setZip] = useState(parsed.zip);
  const [dob, setDob] = useState(parsed.dob);
  const [gender, setGender] = useState(parsed.gender);
  const [coverageAmount, setCoverageAmount] = useState<CoverageAmount>("250k");
  const [termLength, setTermLength] = useState<TermLength>("20yr");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ zip, dob, gender });
    router.replace(`/life?${params.toString()}`);
  }

  // Silence unused var warning when API is disabled
  void [coverageAmount, termLength];

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

          <hr className="border-white/10" />
          <h2 className="text-white/60 font-semibold text-xs uppercase tracking-wider">
            Coverage
          </h2>

          <div>
            <label className="text-white/70 text-xs block mb-1">Coverage Amount</label>
            <select
              value={coverageAmount}
              onChange={(e) => setCoverageAmount(e.target.value as CoverageAmount)}
              className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#22c55e]"
            >
              {COVERAGE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o === "1M+" ? "$1M+" : `$${o}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-white/70 text-xs block mb-1">Term Length</label>
            <select
              value={termLength}
              onChange={(e) => setTermLength(e.target.value as TermLength)}
              className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#22c55e]"
            >
              {TERM_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
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
          Find Your Best Life Insurance Plan
        </h1>

        {/* Feature flag off → coming soon */}
        {!LIFE_API_ENABLED && <EmptyState type="coming-soon" />}
      </main>
    </div>
  );
}

export default function LifePage() {
  return (
    <Suspense>
      <LifeContent />
    </Suspense>
  );
}
