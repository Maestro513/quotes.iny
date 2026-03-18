import type { MedicarePlan, MedicarePlanType } from "@/types/medicare";

interface MedicareCardProps {
  plan: MedicarePlan;
  isFeatured?: boolean;
}

const TYPE_BADGE: Record<MedicarePlanType, string> = {
  MA:         "bg-blue-50 text-blue-700 border-blue-200",
  Supplement: "bg-violet-50 text-violet-700 border-violet-200",
  PartD:      "bg-teal-50 text-teal-700 border-teal-200",
};

const TYPE_LABEL: Record<MedicarePlanType, string> = {
  MA:         "Medicare Advantage",
  Supplement: "Supplement",
  PartD:      "Part D",
};

function StarRating({ rating }: { rating: number }) {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <svg key={`f${i}`} className="w-3.5 h-3.5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      {half && (
        <svg key="half" className="w-3.5 h-3.5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
          <defs>
            <linearGradient id="half-grad">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="#e5e7eb" />
            </linearGradient>
          </defs>
          <path fill="url(#half-grad)" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <svg key={`e${i}`} className="w-3.5 h-3.5 text-gray-200" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-gray-400 text-[10px] ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

function getStats(plan: MedicarePlan) {
  if (plan.type === "PartD") {
    return [
      { label: "Annual Deductible", value: plan.deductible > 0 ? `$${plan.deductible}` : "$0" },
      { label: "Tier 1 Drugs",      value: plan.benefits.rxCoverage },
      { label: "Tier 2 Drugs",      value: "$10 Copay" },
      { label: "Tier 3 Drugs",      value: "$47 Copay" },
      { label: "Pharmacies",        value: "60,000+" },
      { label: "Mail Order",        value: "Available" },
    ];
  }
  if (plan.type === "Supplement") {
    return [
      { label: "Part A Gaps",    value: "Covered" },
      { label: "Part B Gaps",    value: "Covered" },
      { label: "Deductible",     value: plan.deductible > 0 ? `$${plan.deductible}` : "Covered" },
      { label: "Foreign Travel", value: "80%" },
      { label: "Excess Charges", value: "Covered" },
      { label: "Network",        value: "Nationwide" },
    ];
  }
  // MA
  return [
    { label: "Primary Care",  value: plan.benefits.primaryCare },
    { label: "Specialist",    value: plan.benefits.specialist },
    { label: "Emergency",     value: plan.benefits.emergencyRoom },
    { label: "Urgent Care",   value: plan.benefits.urgentCare },
    { label: "Rx Coverage",   value: plan.benefits.rxCoverage },
    { label: "OOP Max",       value: plan.outOfPocketMax > 0 ? `$${plan.outOfPocketMax.toLocaleString()}` : "—" },
  ];
}

const EXTRAS = [
  { key: "dental",  label: "Dental" },
  { key: "vision",  label: "Vision" },
  { key: "hearing", label: "Hearing" },
] as const;

export default function MedicareCard({ plan, isFeatured }: MedicareCardProps) {
  const stats = getStats(plan);
  const isZeroPremium = plan.premium_monthly === 0;

  return (
    <div
      className="relative rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer hover:scale-[1.005]"
      style={{
        background: "rgba(255,255,255,0.94)",
        border: isFeatured ? "1.5px solid rgba(34,197,94,0.7)" : "1px solid rgba(255,255,255,0.6)",
        boxShadow: isFeatured
          ? "0 4px 32px rgba(34,197,94,0.16), 0 2px 8px rgba(0,0,0,0.12)"
          : "0 2px 16px rgba(0,0,0,0.14)",
      }}
    >
      {isFeatured && <div className="h-0.5 w-full bg-gradient-to-r from-[#22c55e]/0 via-[#22c55e] to-[#22c55e]/0" />}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center" style={{background:"rgba(139,92,246,0.10)", border:"1px solid rgba(139,92,246,0.20)"}}>
              <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                {isFeatured && <span className="text-[10px] font-bold bg-[#22c55e] text-white px-2 py-0.5 rounded-full uppercase tracking-wide">Top Rated</span>}
                <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${TYPE_BADGE[plan.type]}`}>{TYPE_LABEL[plan.type]}</span>
              </div>
              <h3 className="text-gray-900 font-bold text-sm leading-snug truncate">{plan.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-gray-400 text-xs">{plan.carrier}</p>
                {plan.starRating && (
                  <>
                    <span className="text-gray-200 text-xs">·</span>
                    <StarRating rating={plan.starRating} />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="text-right shrink-0">
            <div className={`text-3xl font-bold tracking-tight ${isZeroPremium ? "text-[#22c55e]" : isFeatured ? "text-[#22c55e]" : "text-gray-900"}`}>
              ${plan.premium_monthly}
              <span className="text-sm font-normal text-gray-400 ml-0.5">/mo</span>
            </div>
            {isZeroPremium && (
              <div className="text-emerald-600 text-xs font-semibold mt-0.5">$0 Premium</div>
            )}
          </div>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-6 gap-0 mt-4 rounded-xl overflow-hidden" style={{background:"rgba(218,202,239,0.22)", border:"1px solid rgba(180,150,220,0.25)"}}>
          {stats.map((s, i) => (
            <div key={s.label} className={`px-3 py-2.5 ${i < 5 ? "border-r" : ""}`} style={{borderColor:"rgba(180,150,220,0.20)"}}>
              <div className="text-[9px] uppercase tracking-wide text-violet-400 font-medium mb-0.5 whitespace-nowrap">{s.label}</div>
              <div className="text-gray-800 text-xs font-bold leading-tight">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Extras (Dental / Vision / Hearing) — MA only */}
        {plan.type === "MA" && (
          <div className="flex items-center gap-4 mt-3">
            {EXTRAS.map(({ key, label }) => {
              const val = plan.benefits[key];
              const included = val && val !== "Not Included";
              return (
                <div key={key} className="flex items-center gap-1">
                  {included ? (
                    <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span className={`text-xs font-medium ${included ? "text-gray-700" : "text-gray-300"}`}>{label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* CTAs */}
        <div className="flex items-center gap-3 mt-4">
          <button className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer ${isFeatured ? "bg-[#22c55e] text-white hover:bg-green-400 shadow-[0_0_12px_rgba(34,197,94,0.3)]" : "bg-[#22c55e]/10 border border-[#22c55e]/50 text-[#22c55e] hover:bg-[#22c55e] hover:text-white"}`}>
            Enroll Now
          </button>
          <button className="px-5 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all duration-150 cursor-pointer">
            Full Details
          </button>
        </div>
      </div>
    </div>
  );
}
