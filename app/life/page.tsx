"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { parseParams } from "@/lib/params";
import type { CoverageAmount, TermLength } from "@/types/life";
import EmptyState from "@/components/empty-state";

const COVERAGE_OPTIONS: CoverageAmount[] = ["100k", "250k", "500k", "1M+"];
const TERM_OPTIONS: TermLength[] = ["10yr", "20yr", "30yr", "Whole Life"];

const LIFE_API_ENABLED = process.env.NEXT_PUBLIC_LIFE_API_ENABLED === "true";

const sidebarInput =
  "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/60 focus:bg-white/10 transition-colors";

const sidebarLabel = "text-white/50 text-[11px] uppercase tracking-wider block mb-1.5 font-medium";

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
            </div>
          </div>

          <div className="border-t border-white/[0.07] pt-4">
            <p className="text-white/70 font-semibold text-xs uppercase tracking-widest mb-3">Coverage</p>
            <div className="space-y-3">
              <div>
                <label className={sidebarLabel}>Coverage Amount</label>
                <select value={coverageAmount} onChange={(e) => setCoverageAmount(e.target.value as CoverageAmount)} className={sidebarInput}>
                  {COVERAGE_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o === "1M+" ? "$1M+" : `$${o}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={sidebarLabel}>Term Length</label>
                <select value={termLength} onChange={(e) => setTermLength(e.target.value as TermLength)} className={sidebarInput}>
                  {TERM_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
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
          <h1 className="text-white text-2xl font-bold tracking-tight">Find Your Best Life Insurance Plan</h1>
        </div>

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
