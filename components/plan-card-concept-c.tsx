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

const TIER_GRADIENT: Record<string, string> = {
  Bronze:       "from-amber-500/10 to-amber-600/5",
  Silver:       "from-slate-400/10 to-slate-500/5",
  Gold:         "from-yellow-400/10 to-yellow-500/5",
  Platinum:     "from-sky-400/10 to-sky-500/5",
  Catastrophic: "from-red-400/10 to-red-500/5",
};

const TIER_TEXT: Record<string, string> = {
  Bronze: "text-amber-700",
  Silver: "text-slate-600",
  Gold: "text-yellow-700",
  Platinum: "text-sky-700",
  Catastrophic: "text-red-700",
};

/*  ───────────────────────────────────────────────────
    Concept C — "Modern Card with Pill Stats"
    Full-width card with tier gradient header accent,
    premium front and center, pill-shaped stat chips,
    and a clean action row.
    ─────────────────────────────────────────────────── */

export default function PlanCardConceptC({
  planName, carrier, metalTier, planType, hsaEligible,
  monthlyPremium, estimatedSubsidy, deductible, outOfPocketMax,
  benefits, isFeatured,
}: Props) {
  const prePremium = estimatedSubsidy > 0 ? monthlyPremium + estimatedSubsidy : 0;

  const pills = [
    { label: "Deductible", value: `$${deductible.toLocaleString()}` },
    { label: "OOP Max", value: `$${outOfPocketMax.toLocaleString()}` },
    { label: "Primary Care", value: benefits?.primaryCare ?? "—" },
    { label: "Specialist", value: benefits?.specialist ?? "—" },
    { label: "ER", value: benefits?.emergencyRoom ?? "—" },
    { label: "Rx", value: benefits?.genericRx ?? "—" },
    { label: "Mental Health", value: benefits?.mentalHealth ?? "—" },
  ];

  return (
    <div
      className={`rounded-2xl overflow-hidden ${isFeatured ? "ring-2 ring-[#22c55e]/50" : ""}`}
      style={{
        background: "rgba(255,255,255,0.97)",
        boxShadow: isFeatured
          ? "0 4px 20px rgba(34,197,94,0.1), 0 1px 4px rgba(0,0,0,0.06)"
          : "0 1px 8px rgba(0,0,0,0.07)",
        border: "1px solid rgba(0,0,0,0.05)",
      }}
    >
      {/* Tier gradient accent */}
      <div className={`h-1 bg-gradient-to-r ${TIER_GRADIENT[metalTier] ?? "from-gray-300/20 to-gray-400/10"}`} />

      <div className="p-5">
        {/* Top row: plan info + price */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${TIER_TEXT[metalTier] ?? "text-gray-500"}`}>{metalTier}</span>
              <span className="text-gray-300">|</span>
              <span className="text-[11px] text-gray-400 font-medium">{planType}</span>
              {hsaEligible && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-[11px] font-semibold text-emerald-600">HSA Eligible</span>
                </>
              )}
              {isFeatured && (
                <span className="text-[10px] font-bold bg-[#22c55e] text-white px-2 py-0.5 rounded-full uppercase tracking-wide ml-1">Best Value</span>
              )}
            </div>
            <h3 className="text-gray-900 font-bold text-base leading-tight">{planName}</h3>
            <p className="text-gray-400 text-sm mt-0.5">{carrier}</p>
          </div>

          <div className="text-right shrink-0">
            <div className={`text-[34px] font-black leading-none tracking-tight ${isFeatured ? "text-[#22c55e]" : "text-gray-900"}`}>
              <span className="text-lg align-top">$</span>{monthlyPremium}
            </div>
            <div className="text-gray-400 text-xs font-medium mt-0.5">per month</div>
            {prePremium > 0 && (
              <div className="text-emerald-600 text-xs font-semibold mt-1">
                Save ${estimatedSubsidy}/mo <span className="line-through text-gray-400 font-normal">${prePremium}</span>
              </div>
            )}
          </div>
        </div>

        {/* Pill stats */}
        <div className="flex flex-wrap gap-2 mb-4">
          {pills.map((p) => (
            <div
              key={p.label}
              className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5"
            >
              <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">{p.label}</span>
              <span className="text-xs text-gray-800 font-bold">{p.value}</span>
            </div>
          ))}
        </div>

        {/* Action row */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex gap-4">
            <button className="text-violet-600 text-sm font-medium hover:text-violet-800 cursor-pointer">View Benefits</button>
            <button className="text-violet-600 text-sm font-medium hover:text-violet-800 cursor-pointer">Find Doctors</button>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 text-gray-500 hover:border-gray-300 cursor-pointer">Details</button>
            <button className={`px-6 py-2 text-sm font-bold rounded-xl cursor-pointer transition-all ${isFeatured ? "bg-[#22c55e] text-white shadow-[0_2px_12px_rgba(34,197,94,0.3)] hover:bg-green-400" : "bg-gray-900 text-white hover:bg-gray-700"}`}>
              Enroll Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
