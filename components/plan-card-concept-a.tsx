import type { PlanBenefits } from "@/types/under65";

interface Props {
  planName: string;
  carrier: string;
  metalTier: string;
  planType: string;
  hsaEligible?: boolean;
  monthlyPremium: number;
  estimatedSubsidy: number;
  deductible: number;
  outOfPocketMax: number;
  benefits?: PlanBenefits;
  isFeatured?: boolean;
}

const TIER_DOT: Record<string, string> = {
  Bronze: "bg-amber-500",
  Silver: "bg-slate-400",
  Gold: "bg-yellow-500",
  Platinum: "bg-sky-500",
  Catastrophic: "bg-red-500",
};

/*  ───────────────────────────────────────────────────
    Concept A — "Two-Column Hero"
    Inspired by healthcare.gov: big premium + deductible
    side-by-side, compact benefit rows on the right,
    clean footer with links + CTA.
    ─────────────────────────────────────────────────── */

export default function PlanCardConceptA({
  planName, carrier, metalTier, planType, hsaEligible,
  monthlyPremium, estimatedSubsidy, deductible, outOfPocketMax,
  benefits, isFeatured,
}: Props) {
  const prePremium = estimatedSubsidy > 0 ? monthlyPremium + estimatedSubsidy : 0;

  const rows = [
    ["Out-of-pocket max", `$${outOfPocketMax.toLocaleString()}`],
    ["Doctor visits", benefits?.primaryCare ?? "—"],
    ["Specialist visit", benefits?.specialist ?? "—"],
    ["Generic drugs", benefits?.genericRx ?? "—"],
    ["Emergency room", benefits?.emergencyRoom ?? "—"],
    ["Mental health", benefits?.mentalHealth ?? "—"],
  ];

  return (
    <div
      className={`rounded-xl overflow-hidden ${isFeatured ? "ring-2 ring-[#22c55e]/60" : ""}`}
      style={{
        background: "rgba(255,255,255,0.97)",
        boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
        border: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-start justify-between gap-4">
        <div>
          <p className="text-gray-400 text-xs font-medium tracking-wide">{carrier}</p>
          <h3 className="text-gray-900 font-bold text-[15px] leading-snug mt-0.5">{planName} – {planType}</h3>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`w-2 h-2 rounded-full ${TIER_DOT[metalTier] ?? "bg-gray-400"}`} />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{metalTier}</span>
            {hsaEligible && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">HSA</span>}
            {isFeatured && <span className="text-[10px] font-bold text-white bg-[#22c55e] px-2 py-0.5 rounded-full uppercase">Best Value</span>}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 flex gap-8">
        {/* Two hero numbers */}
        <div className="flex gap-8 shrink-0">
          <div>
            <div className="text-gray-400 text-[11px] font-medium uppercase tracking-wider mb-1">Monthly premium</div>
            <div className="text-[32px] font-extrabold leading-none tracking-tight text-[#22c55e]">
              <span className="text-[18px] align-top mr-0.5">$</span>{monthlyPremium.toFixed(2)}
            </div>
            {prePremium > 0 && (
              <div className="text-xs mt-1 text-emerald-600 font-medium">
                was <span className="line-through text-gray-400">${prePremium.toFixed(2)}</span>
              </div>
            )}
          </div>
          <div className="border-l border-gray-100 pl-8">
            <div className="text-gray-400 text-[11px] font-medium uppercase tracking-wider mb-1">Deductible</div>
            <div className="text-[32px] font-extrabold leading-none tracking-tight text-gray-900">
              <span className="text-[18px] align-top mr-0.5">$</span>{deductible.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Benefits list */}
        <div className="flex-1 min-w-0 grid grid-cols-2 gap-x-6 gap-y-0.5 self-center">
          {rows.map(([label, val]) => (
            <div key={label} className="flex justify-between py-[3px] border-b border-gray-50">
              <span className="text-gray-400 text-xs">{label}</span>
              <span className="text-gray-800 text-xs font-semibold text-right">{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between">
        <div className="flex gap-5">
          <span className="text-violet-600 text-sm font-medium cursor-pointer hover:text-violet-800">Benefits</span>
          <span className="text-violet-600 text-sm font-medium cursor-pointer hover:text-violet-800">Doctors</span>
          <span className="text-violet-600 text-sm font-medium cursor-pointer hover:text-violet-800">Drugs</span>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 cursor-pointer">Plan Details</button>
          <button className="px-5 py-1.5 text-sm font-semibold rounded-lg bg-[#22c55e] text-white hover:bg-green-400 cursor-pointer">Enroll Now</button>
        </div>
      </div>
    </div>
  );
}
