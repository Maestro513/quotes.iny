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
      className="relative rounded-[18px] overflow-hidden flex flex-col transition-[transform,box-shadow,border-color] duration-200 cursor-pointer hover:-translate-y-0.5"
      style={{
        background: "#ffffff",
        border: isFeatured ? "1.5px solid #22c55e" : "1px solid rgba(15,2,32,0.08)",
        boxShadow: isFeatured
          ? "0 2px 4px rgba(34,197,94,0.1), 0 10px 32px rgba(34,197,94,0.15)"
          : "0 1px 2px rgba(15,2,32,0.04), 0 8px 24px rgba(15,2,32,0.06)",
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
            <p className="text-gray-500 text-[11px] mb-0.5 truncate font-medium">{carrier}</p>
            <h3 className="text-[#1a1229] font-semibold text-[16.5px] leading-[1.35] tracking-tight">{planName}</h3>
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

      {/* Premium hero — centered, subtle gradient surface */}
      <div
        className="mx-5 mt-4 rounded-[14px] px-5 py-[18px] text-center"
        style={{
          background: "linear-gradient(180deg,#faf7ff 0%,#f3f0fa 100%)",
          border: "1px solid rgba(124,58,237,0.10)",
        }}
      >
        <div className="text-[40px] font-bold tabular-nums" style={{ color: "#22c55e", lineHeight: 1, letterSpacing: "-0.03em" }}>
          ${monthlyPremium}
        </div>
        <div className="text-[10.5px] font-semibold uppercase mt-2 text-[#8b7e9c]" style={{ letterSpacing: "0.1em" }}>
          Monthly Premium
        </div>
        {estimatedSubsidy > 0 && (
          <div className="text-[11.5px] text-[#16a34a] font-semibold mt-1 tabular-nums">
            −${estimatedSubsidy}/mo subsidy applied
          </div>
        )}
      </div>

      {/* Stats stacked vertically — tabular nums for alignment */}
      <div className="px-5 mt-4 flex flex-col gap-1.5">
        <div className="flex items-center justify-between px-[14px] py-2.5 rounded-[10px] border" style={{ background: "#fafafa", borderColor: "rgba(15,2,32,0.04)" }}>
          <span className="text-[11px] font-medium text-[#6b5f7a]">Deductible</span>
          <span className="text-[14px] font-bold text-[#1a1229] tabular-nums">${deductible.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between px-[14px] py-2.5 rounded-[10px] border" style={{ background: "#fafafa", borderColor: "rgba(15,2,32,0.04)" }}>
          <span className="text-[11px] font-medium text-[#6b5f7a]">Out-of-Pocket Max</span>
          <span className="text-[14px] font-bold text-[#1a1229] tabular-nums">${outOfPocketMax.toLocaleString()}</span>
        </div>
      </div>

      {/* Benefit chips — refined lavender */}
      <div className="flex gap-1.5 mt-[14px] flex-wrap px-5">
        {chips.map((c) => (
          <div key={c.label} className="flex flex-col px-[11px] py-[7px] rounded-[10px] min-w-[72px]" style={{ background: "#faf7ff", border: "1px solid rgba(167,139,250,0.35)" }}>
            <span className="text-[9px] font-bold uppercase text-[#8b5cf6] leading-tight" style={{ letterSpacing: "0.06em" }}>{c.label}</span>
            <span className="text-[12px] font-bold leading-tight text-[#4c1d95] tabular-nums mt-0.5">{c.value}</span>
          </div>
        ))}
      </div>

      {/* Footer — pinned to bottom so 2-col cards align */}
      <div className="mt-auto px-5 py-[16px] flex gap-2">
        <button className="flex-1 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold bg-white border border-[#d6cde3] text-[#4c2f6a] hover:border-[#8a35a7] hover:bg-[#faf7ff] hover:text-[#4c1d95] transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
          Plan Details
        </button>
        <button className="flex-1 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold bg-[#22c55e] text-white border border-[#22c55e] hover:bg-[#16a34a] hover:border-[#16a34a] hover:-translate-y-0.5 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300" style={{ boxShadow: "0 1px 2px rgba(34,197,94,0.15), 0 4px 12px rgba(34,197,94,0.2)" }}>
          Enroll Now
        </button>
      </div>
    </div>
  );
}
