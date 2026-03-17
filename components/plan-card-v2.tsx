import type { PlanBenefits } from "@/types/under65";

/**
 * V2 — Bold Split Panel
 * Dark left panel (tier + price). White right panel (name + 2×3 benefit grid + CTAs).
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

const TIER_ACCENT: Record<string, { bg: string; text: string; glow: string }> = {
  Bronze:      { bg: "#78350f", text: "#fcd34d", glow: "rgba(245,158,11,0.3)" },
  Silver:      { bg: "#1e293b", text: "#94a3b8", glow: "rgba(148,163,184,0.2)" },
  Gold:        { bg: "#713f12", text: "#fde68a", glow: "rgba(234,179,8,0.35)" },
  Platinum:    { bg: "#0c4a6e", text: "#7dd3fc", glow: "rgba(56,189,248,0.3)" },
  Catastrophic:{ bg: "#450a0a", text: "#fca5a5", glow: "rgba(239,68,68,0.3)" },
};

const GRID = (d: number, m: number, b?: PlanBenefits) => [
  { label: "Deductible",   value: `$${d.toLocaleString()}` },
  { label: "MOOP",         value: `$${m.toLocaleString()}` },
  { label: "Primary Care", value: b?.primaryCare   ?? "—" },
  { label: "Specialist",   value: b?.specialist    ?? "—" },
  { label: "Emergency",    value: b?.emergencyRoom ?? "—" },
  { label: "Urgent Care",  value: b?.urgentCare    ?? "—" },
];

export default function PlanCardV2({
  planName, carrier, metalTier, planType, hsaEligible,
  monthlyPremium, estimatedSubsidy, deductible, outOfPocketMax,
  benefits, isFeatured,
}: Props) {
  const accent = TIER_ACCENT[metalTier] ?? TIER_ACCENT.Silver;
  const grid = GRID(deductible, outOfPocketMax, benefits);

  return (
    <div
      className="relative flex rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer"
      style={{
        border: isFeatured ? "1.5px solid rgba(34,197,94,0.65)" : "1px solid rgba(255,255,255,0.14)",
        boxShadow: isFeatured
          ? "0 4px 32px rgba(34,197,94,0.16), 0 2px 12px rgba(0,0,0,0.3)"
          : "0 2px 16px rgba(0,0,0,0.28)",
      }}
    >
      {/* ── Left dark panel ── */}
      <div
        className="flex flex-col items-center justify-center px-6 py-5 shrink-0 w-36 sm:w-44"
        style={{ background: accent.bg, boxShadow: `inset -1px 0 0 rgba(255,255,255,0.06)` }}
      >
        {isFeatured && (
          <span className="text-[9px] font-bold bg-[#22c55e] text-white px-2 py-0.5 rounded-full uppercase tracking-wide mb-3">Best Value</span>
        )}
        <div className="text-[10px] uppercase tracking-widest mb-1 font-semibold" style={{color: accent.text, opacity: 0.7}}>{metalTier}</div>
        <div className="text-4xl font-black text-white leading-none">${monthlyPremium}</div>
        <div className="text-white/40 text-xs mt-0.5">/mo</div>
        {estimatedSubsidy > 0 && (
          <div className="mt-2 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Save ${estimatedSubsidy}/mo
          </div>
        )}
        <div className="mt-3 text-white/40 text-[10px] text-center leading-tight">{carrier}</div>
      </div>

      {/* ── Right white panel ── */}
      <div className="flex-1 flex flex-col bg-white px-5 py-4 min-w-0">
        {/* Plan name + badges */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <h3 className="text-gray-900 font-bold text-sm leading-snug truncate">{planName}</h3>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="text-[10px] font-medium border px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border-gray-200">{planType}</span>
              {hsaEligible && <span className="text-[10px] font-semibold border px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border-emerald-200">HSA</span>}
            </div>
          </div>
        </div>

        {/* 2×3 benefit grid */}
        <div className="grid grid-cols-3 gap-px rounded-xl overflow-hidden flex-1" style={{background:"rgba(218,202,239,0.30)"}}>
          {grid.map((item) => (
            <div key={item.label} className="bg-white px-3 py-2.5 m-px rounded-lg" style={{background:"rgba(250,248,255,0.95)"}}>
              <div className="text-[9px] uppercase tracking-wide text-violet-400 font-medium mb-0.5">{item.label}</div>
              <div className="text-gray-800 text-xs font-bold leading-tight">{item.value}</div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-2.5 mt-4">
          <button className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer ${isFeatured ? "bg-[#22c55e] text-white hover:bg-green-400 shadow-[0_0_12px_rgba(34,197,94,0.3)]" : "bg-[#22c55e]/10 border border-[#22c55e]/50 text-[#22c55e] hover:bg-[#22c55e] hover:text-white"}`}>
            Enroll Now
          </button>
          <button className="px-5 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all duration-150 cursor-pointer">
            Learn More
          </button>
        </div>
      </div>
    </div>
  );
}
