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

const TIER_COLOR: Record<string, string> = {
  Bronze: "#b45309",
  Silver: "#64748b",
  Gold: "#ca8a04",
  Platinum: "#0284c7",
  Catastrophic: "#dc2626",
};

/*  ───────────────────────────────────────────────────
    Concept B — "Compact Single Row"
    Everything on one level: plan info | key stats | price + CTA.
    Ultra-dense — more plans visible per screen.
    ─────────────────────────────────────────────────── */

export default function PlanCardConceptB({
  planName, carrier, metalTier, planType, hsaEligible,
  monthlyPremium, estimatedSubsidy, deductible, outOfPocketMax,
  benefits, isFeatured,
}: Props) {
  const prePremium = estimatedSubsidy > 0 ? monthlyPremium + estimatedSubsidy : 0;

  return (
    <div
      className={`rounded-xl overflow-hidden flex items-stretch ${isFeatured ? "ring-2 ring-[#22c55e]/60" : ""}`}
      style={{
        background: "rgba(255,255,255,0.97)",
        boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
        border: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      {/* Tier accent bar */}
      <div className="w-1.5 shrink-0" style={{ background: TIER_COLOR[metalTier] ?? "#9ca3af" }} />

      {/* Plan info */}
      <div className="px-4 py-3 min-w-[220px] border-r border-gray-100">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: TIER_COLOR[metalTier] ?? "#6b7280" }}>{metalTier}</span>
          <span className="text-gray-300">·</span>
          <span className="text-[10px] text-gray-400 font-medium">{planType}</span>
          {hsaEligible && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-[10px] font-bold text-emerald-600">HSA</span>
            </>
          )}
          {isFeatured && (
            <span className="text-[9px] font-bold text-white bg-[#22c55e] px-1.5 py-0.5 rounded-full uppercase ml-1">Best Value</span>
          )}
        </div>
        <h3 className="text-gray-900 font-bold text-sm leading-snug">{planName}</h3>
        <p className="text-gray-400 text-xs">{carrier}</p>
      </div>

      {/* Key stats */}
      <div className="flex items-center gap-0 flex-1">
        {[
          { label: "Deductible", val: `$${deductible.toLocaleString()}` },
          { label: "OOP Max", val: `$${outOfPocketMax.toLocaleString()}` },
          { label: "Primary Care", val: benefits?.primaryCare ?? "—" },
          { label: "Specialist", val: benefits?.specialist ?? "—" },
          { label: "ER", val: benefits?.emergencyRoom ?? "—" },
          { label: "Rx", val: benefits?.genericRx ?? "—" },
        ].map((s, i) => (
          <div key={s.label} className={`px-3 py-3 flex-1 ${i < 5 ? "border-r border-gray-100" : ""}`}>
            <div className="text-[9px] uppercase tracking-wider text-gray-400 font-medium mb-0.5 whitespace-nowrap">{s.label}</div>
            <div className="text-gray-800 text-xs font-bold leading-tight whitespace-nowrap">{s.val}</div>
          </div>
        ))}
      </div>

      {/* Price + CTA */}
      <div className="px-5 py-3 flex flex-col items-end justify-center shrink-0 min-w-[140px] border-l border-gray-100">
        <div className={`text-2xl font-extrabold tracking-tight ${isFeatured ? "text-[#22c55e]" : "text-gray-900"}`}>
          ${monthlyPremium}<span className="text-xs font-normal text-gray-400">/mo</span>
        </div>
        {prePremium > 0 && (
          <div className="text-[11px] text-emerald-600 font-medium">
            was <span className="line-through text-gray-400">${prePremium.toFixed(0)}</span>
          </div>
        )}
        <button className="mt-2 px-4 py-1 text-xs font-semibold rounded-lg bg-[#22c55e] text-white hover:bg-green-400 cursor-pointer">
          Enroll Now
        </button>
      </div>
    </div>
  );
}
