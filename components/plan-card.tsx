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
    { label: "Generic Drugs", value: benefits?.genericRx     ?? "—" },
  ];

  return (
    <div
      className="relative rounded-xl overflow-hidden transition-all duration-200 cursor-pointer hover:scale-[1.005]"
      style={{
        background: "#ffffff",
        border: isFeatured ? "2px solid rgba(34,197,94,0.8)" : "1px solid rgba(0,0,0,0.10)",
        boxShadow: isFeatured
          ? "0 4px 32px rgba(34,197,94,0.12), 0 2px 8px rgba(0,0,0,0.08)"
          : "0 2px 12px rgba(0,0,0,0.08)",
      }}
    >
      {isFeatured && <div className="h-1 w-full bg-gradient-to-r from-[#22c55e]/0 via-[#22c55e] to-[#22c55e]/0" />}

      <div className="p-5">
        {/* Carrier + name / badges */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-gray-400 text-xs mb-0.5">{carrier}</p>
            <h3 className="text-gray-900 font-bold text-base leading-snug">{planName}</h3>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap shrink-0 mt-0.5">
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

        {/* Big stats row */}
        <div className="flex items-end gap-8 mt-4 pb-4 border-b" style={{borderColor:"rgba(218,202,239,0.35)"}}>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5 text-violet-500">Monthly Premium</div>
            <div className="text-4xl font-black text-gray-900 tracking-tight">${monthlyPremium}</div>
            {estimatedSubsidy > 0 && (
              <div className="text-emerald-500 text-xs font-semibold mt-0.5">−${estimatedSubsidy}/mo subsidy</div>
            )}
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5 text-violet-500">Deductible</div>
            <div className="text-4xl font-black text-gray-900 tracking-tight">${deductible.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5 text-violet-500">Out-of-Pocket Max</div>
            <div className="text-2xl font-bold text-gray-700 tracking-tight">${outOfPocketMax.toLocaleString()}</div>
          </div>
        </div>

        {/* Benefit chips */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {chips.map((c) => (
            <div key={c.label} className="flex flex-col px-3 py-2.5 rounded-lg" style={{background:"#2d1654", border:"1px solid rgba(139,92,246,0.25)"}}>
              <span className="text-[9px] font-bold uppercase tracking-widest mb-0.5 whitespace-nowrap" style={{color:"rgba(218,202,239,0.6)"}}>{c.label}</span>
              <span className="text-xs font-bold leading-tight text-white">{c.value}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t" style={{borderColor:"rgba(218,202,239,0.35)"}}>
          <div className="flex items-center gap-4">
            <button className="text-[#22c55e] text-sm font-medium hover:underline cursor-pointer">Benefits</button>
            <button className="text-[#22c55e] text-sm font-medium hover:underline cursor-pointer">Doctors</button>
            <button className="text-[#22c55e] text-sm font-medium hover:underline cursor-pointer">Drugs</button>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-all duration-150 cursor-pointer">
              Plan Details
            </button>
            <button className="px-5 py-2 rounded-lg text-sm font-bold bg-[#22c55e] text-white hover:bg-green-400 transition-all duration-150 cursor-pointer shadow-[0_0_12px_rgba(34,197,94,0.25)]">
              Enroll Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
