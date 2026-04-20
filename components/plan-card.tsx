import type { PlanBenefits } from "@/types/under65";
import { carrierLogo } from "@/lib/medicare/carrier-logos";

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
  Bronze:       "border-amber-400 text-amber-600",
  Silver:       "border-slate-400 text-slate-500",
  Gold:         "border-yellow-500 text-yellow-600",
  Platinum:     "border-sky-500 text-sky-600",
  Catastrophic: "border-red-400 text-red-500",
};

export default function PlanCard({
  planName, carrier, metalTier, planType, hsaEligible,
  monthlyPremium, estimatedSubsidy, deductible, outOfPocketMax,
  benefits, isFeatured,
}: Props) {
  const chips = [
    { label: "Specialist",    value: benefits?.specialist    ?? "—" },
    { label: "Emergency",     value: benefits?.emergencyRoom ?? "—" },
    { label: "Doctor Visits", value: benefits?.primaryCare   ?? "—" },
    { label: "Generic Rx",    value: benefits?.genericRx     ?? "—" },
  ];

  return (
    <div
      className="relative rounded-xl overflow-hidden flex flex-col transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
      style={{
        background: "#ffffff",
        border: isFeatured ? "2px solid rgba(34,197,94,0.8)" : "1px solid rgba(0,0,0,0.10)",
        boxShadow: isFeatured
          ? "0 4px 32px rgba(34,197,94,0.12), 0 2px 8px rgba(0,0,0,0.08)"
          : "0 2px 12px rgba(0,0,0,0.08)",
      }}
    >
      {isFeatured && <div className="h-1 w-full bg-gradient-to-r from-[#22c55e]/0 via-[#22c55e] to-[#22c55e]/0" />}

      {/* Header: carrier + badges */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0 flex items-start gap-3">
          <img
            src={carrierLogo(carrier)}
            alt={carrier}
            className="h-8 w-8 object-contain rounded-md bg-white p-0.5 border border-gray-200 shrink-0 mt-0.5"
          />
          <div className="min-w-0">
            <p className="text-gray-400 text-xs mb-0.5 truncate">{carrier}</p>
            <h3 className="text-gray-900 font-bold text-[15px] leading-snug">{planName}</h3>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-wrap shrink-0">
          {metalTier && (
            <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full tracking-wide uppercase ${TIER_BADGE[metalTier] ?? "border-gray-300 text-gray-500"}`}>
              {metalTier}
            </span>
          )}
          {planType && (
            <span className="text-[10px] font-semibold border border-gray-300 text-gray-500 px-2 py-0.5 rounded-full uppercase tracking-wide">
              {planType}
            </span>
          )}
          {hsaEligible && (
            <span className="text-[10px] font-semibold border border-gray-300 text-gray-500 px-2 py-0.5 rounded-full uppercase tracking-wide">
              HSA
            </span>
          )}
          {isFeatured && (
            <span className="text-[10px] font-bold border border-[#22c55e] text-[#22c55e] px-2 py-0.5 rounded-full uppercase tracking-wide">
              Best Value
            </span>
          )}
        </div>
      </div>

      {/* Premium hero — centered */}
      <div
        className="mx-5 mt-4 rounded-xl px-4 py-4 text-center"
        style={{ background: "#f5f3ff", border: "1px solid rgba(167,139,250,0.35)" }}
      >
        <div className="text-4xl font-black tracking-tight" style={{ color: "#22c55e", lineHeight: 1 }}>
          ${monthlyPremium}
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest mt-1.5 text-violet-500">
          Monthly Premium
        </div>
        {estimatedSubsidy > 0 && (
          <div className="text-[11px] text-[#22c55e] font-semibold mt-0.5">
            −${estimatedSubsidy}/mo subsidy applied
          </div>
        )}
      </div>

      {/* Stats stacked vertically */}
      <div className="px-5 mt-4 flex flex-col gap-2">
        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border" style={{ background: "#f9fafb", borderColor: "#f3f4f6" }}>
          <span className="text-[11px] font-bold uppercase tracking-wider text-violet-500">Deductible</span>
          <span className="text-[14px] font-extrabold text-gray-900">${deductible.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border" style={{ background: "#f9fafb", borderColor: "#f3f4f6" }}>
          <span className="text-[11px] font-bold uppercase tracking-wider text-violet-500">Out-of-Pocket Max</span>
          <span className="text-[14px] font-extrabold text-gray-900">${outOfPocketMax.toLocaleString()}</span>
        </div>
      </div>

      {/* Benefit chips — Soft Lavender */}
      <div className="flex gap-1.5 mt-4 flex-wrap px-5">
        {chips.map((c) => (
          <div key={c.label} className="flex flex-col px-2.5 py-1.5 rounded-lg" style={{ background: "#f5f3ff", border: "1px solid rgba(167,139,250,0.45)" }}>
            <span className="text-[9px] font-bold uppercase tracking-widest text-violet-400 leading-tight">{c.label}</span>
            <span className="text-[11.5px] font-bold leading-tight text-violet-900">{c.value}</span>
          </div>
        ))}
      </div>

      {/* Footer — pinned to bottom so 2-col cards align */}
      <div className="mt-auto px-5 py-4 flex gap-2" style={{ borderTop: "1px solid #eee", marginTop: "16px" }}>
        <button className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-all cursor-pointer">
          Plan Details
        </button>
        <button className="flex-1 px-4 py-2 rounded-lg text-sm font-bold bg-[#22c55e] text-white hover:bg-green-400 transition-all cursor-pointer shadow-[0_0_12px_rgba(34,197,94,0.25)]">
          Enroll Now
        </button>
      </div>
    </div>
  );
}
