import type { PlanBenefits } from "@/types/under65";

/**
 * V3 — Compact Data Row
 * Dense horizontal row. Single-line header + full-width lavender stat bar.
 * Enroll button sits on the far right of the header row.
 */

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

const TIER_BADGE: Record<string, string> = {
  Bronze:      "bg-amber-50 text-amber-700 border-amber-200",
  Silver:      "bg-slate-100 text-slate-600 border-slate-300",
  Gold:        "bg-yellow-50 text-yellow-700 border-yellow-200",
  Platinum:    "bg-sky-50 text-sky-700 border-sky-200",
  Catastrophic:"bg-red-50 text-red-700 border-red-200",
};

export default function PlanCardV3({
  planName, carrier, metalTier, planType, hsaEligible,
  monthlyPremium, estimatedSubsidy, deductible, outOfPocketMax,
  benefits, isFeatured,
}: Props) {
  const stats = [
    { label: "Deductible",   value: `$${deductible.toLocaleString()}` },
    { label: "MOOP",         value: `$${outOfPocketMax.toLocaleString()}` },
    { label: "Primary Care", value: benefits?.primaryCare   ?? "—" },
    { label: "Specialist",   value: benefits?.specialist    ?? "—" },
    { label: "Emergency",    value: benefits?.emergencyRoom ?? "—" },
    { label: "Urgent Care",  value: benefits?.urgentCare    ?? "—" },
  ];

  return (
    <div
      className="relative rounded-xl overflow-hidden transition-all duration-200 cursor-pointer group"
      style={{
        background: "rgba(255,255,255,0.94)",
        border: isFeatured ? "1.5px solid rgba(34,197,94,0.65)" : "1px solid rgba(255,255,255,0.55)",
        boxShadow: isFeatured
          ? "0 4px 24px rgba(34,197,94,0.14), 0 1px 6px rgba(0,0,0,0.10)"
          : "0 1px 8px rgba(0,0,0,0.12)",
      }}
    >
      {isFeatured && <div className="h-0.5 w-full bg-gradient-to-r from-[#22c55e]/0 via-[#22c55e] to-[#22c55e]/0" />}

      {/* ── Header row ── */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Icon */}
        <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center" style={{background:"rgba(139,92,246,0.10)", border:"1px solid rgba(139,92,246,0.18)"}}>
          <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>

        {/* Name + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isFeatured && <span className="text-[9px] font-bold bg-[#22c55e] text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">Best Value</span>}
            <span className="text-gray-900 font-bold text-sm truncate">{planName}</span>
            <span className={`text-[9px] font-semibold border px-1.5 py-0.5 rounded-full ${TIER_BADGE[metalTier] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>{metalTier}</span>
            <span className="text-[9px] font-medium border px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-500 border-gray-200">{planType}</span>
            {hsaEligible && <span className="text-[9px] font-semibold border px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border-emerald-200">HSA</span>}
            <span className="text-gray-400 text-xs hidden sm:inline">{carrier}</span>
          </div>
        </div>

        {/* Price */}
        <div className="text-right shrink-0 mr-3">
          <div className={`text-xl font-black tracking-tight ${isFeatured ? "text-[#22c55e]" : "text-gray-900"}`}>
            ${monthlyPremium}<span className="text-xs font-normal text-gray-400">/mo</span>
          </div>
          {estimatedSubsidy > 0 && (
            <div className="text-emerald-600 text-[10px] font-semibold">−${estimatedSubsidy} subsidy</div>
          )}
        </div>

        {/* Enroll button */}
        <button className={`shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${isFeatured ? "bg-[#22c55e] text-white hover:bg-green-400 shadow-[0_0_10px_rgba(34,197,94,0.25)]" : "bg-[#22c55e]/10 border border-[#22c55e]/50 text-[#22c55e] hover:bg-[#22c55e] hover:text-white"}`}>
          Enroll
        </button>
      </div>

      {/* ── Stat bar ── */}
      <div className="grid grid-cols-6" style={{background:"rgba(218,202,239,0.20)", borderTop:"1px solid rgba(180,150,220,0.22)"}}>
        {stats.map((s, i) => (
          <div key={s.label} className={`px-3 py-2 ${i < 5 ? "border-r" : ""}`} style={{borderColor:"rgba(180,150,220,0.18)"}}>
            <div className="text-[9px] uppercase tracking-wide text-violet-400 font-medium mb-0.5 whitespace-nowrap">{s.label}</div>
            <div className="text-gray-800 text-[11px] font-bold leading-tight">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
