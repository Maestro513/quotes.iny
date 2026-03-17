import type { PlanBenefits } from "@/types/under65";

interface Cta {
  label: string;
  href: string;
}

interface PlanCardProps {
  planName: string;
  carrier: string;
  monthlyPremium: number;
  estimatedSubsidy: number;
  isFeatured: boolean;
  badges: string[];
  hsaEligible?: boolean;
  deductible: number;
  outOfPocketMax: number;
  benefits?: PlanBenefits;
  primaryCta: Cta;
  secondaryCta?: Cta;
}

const TIER_COLORS: Record<string, string> = {
  Bronze: "bg-amber-100 text-amber-700 border-amber-300",
  Silver: "bg-slate-100 text-slate-600 border-slate-300",
  Gold: "bg-yellow-100 text-yellow-700 border-yellow-300",
  Platinum: "bg-sky-100 text-sky-700 border-sky-300",
  MA: "bg-blue-100 text-blue-700 border-blue-300",
  Supplement: "bg-violet-100 text-violet-700 border-violet-300",
  PartD: "bg-teal-100 text-teal-700 border-teal-300",
};

function badgeClass(badge: string) {
  return TIER_COLORS[badge] ?? "bg-gray-100 text-gray-500 border-gray-200";
}

export default function PlanCard({
  planName,
  carrier,
  monthlyPremium,
  estimatedSubsidy,
  isFeatured,
  badges,
  hsaEligible,
  deductible,
  outOfPocketMax,
  benefits,
  primaryCta,
  secondaryCta,
}: PlanCardProps) {
  return (
    <div
      className={`relative rounded-xl mb-4 overflow-hidden transition-all duration-200 cursor-pointer
        ${isFeatured
          ? "shadow-[0_4px_32px_rgba(34,197,94,0.18)] hover:shadow-[0_4px_40px_rgba(34,197,94,0.28)]"
          : "shadow-[0_2px_12px_rgba(0,0,0,0.18)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
        }`}
      style={{
        background: "rgba(255,255,255,0.93)",
        border: isFeatured
          ? "1px solid rgba(34,197,94,0.7)"
          : "1px solid rgba(255,255,255,0.55)",
      }}
    >
      {/* Featured top bar */}
      {isFeatured && (
        <div className="h-0.5 w-full bg-gradient-to-r from-[#22c55e]/0 via-[#22c55e] to-[#22c55e]/0" />
      )}

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          {/* Left: carrier icon + name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{background:"rgba(139,92,246,0.10)", border:"1px solid rgba(139,92,246,0.18)"}}>
              <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                {isFeatured && (
                  <span className="text-[10px] font-bold bg-[#22c55e] text-white px-2 py-0.5 rounded-full tracking-wide uppercase">
                    Best Value
                  </span>
                )}
                {badges.map((b) => (
                  <span
                    key={b}
                    className={`text-[10px] font-medium border px-2 py-0.5 rounded-full ${badgeClass(b)}`}
                  >
                    {b}
                  </span>
                ))}
                {hsaEligible && (
                  <span className="text-[10px] font-medium border px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border-emerald-200">
                    HSA
                  </span>
                )}
              </div>
              <h3 className="text-gray-900 font-semibold text-sm leading-snug truncate">{planName}</h3>
              <p className="text-gray-400 text-xs mt-0.5">{carrier}</p>
            </div>
          </div>

          {/* Right: price + subsidy */}
          <div className="text-right shrink-0">
            <div className={`text-2xl font-bold tracking-tight ${isFeatured ? "text-[#22c55e]" : "text-gray-900"}`}>
              ${monthlyPremium}
              <span className="text-sm font-normal text-gray-400 ml-0.5">/mo</span>
            </div>
            {estimatedSubsidy > 0 && (
              <div className="text-emerald-600 text-xs font-medium mt-0.5">
                −${estimatedSubsidy}/mo subsidy
              </div>
            )}
          </div>
        </div>

        {/* Info box: light purple */}
        <div className="grid grid-cols-3 gap-x-4 gap-y-3 mt-4 p-3 rounded-lg" style={{background:"rgba(218,202,239,0.22)", border:"1px solid rgba(180,150,220,0.28)"}}>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-violet-400 mb-0.5">Deductible</div>
            <div className="text-gray-800 text-xs font-semibold">${deductible.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-violet-400 mb-0.5">MOOP</div>
            <div className="text-gray-800 text-xs font-semibold">${outOfPocketMax.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-violet-400 mb-0.5">Primary Care</div>
            <div className="text-gray-800 text-xs font-semibold">{benefits?.primaryCare ?? "—"}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-violet-400 mb-0.5">Specialist</div>
            <div className="text-gray-800 text-xs font-semibold">{benefits?.specialist ?? "—"}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-violet-400 mb-0.5">Emergency</div>
            <div className="text-gray-800 text-xs font-semibold">{benefits?.emergencyRoom ?? "—"}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-violet-400 mb-0.5">Urgent Care</div>
            <div className="text-gray-800 text-xs font-semibold">{benefits?.urgentCare ?? "—"}</div>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-3 mt-4">
          <a
            href={primaryCta.href}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer
              ${isFeatured
                ? "bg-[#22c55e] text-white hover:bg-green-400 shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                : "bg-[#22c55e]/10 border border-[#22c55e]/50 text-[#22c55e] hover:bg-[#22c55e] hover:text-white hover:border-[#22c55e]"
              }`}
          >
            {primaryCta.label}
          </a>
          {secondaryCta && (
            <a
              href={secondaryCta.href}
              className="px-5 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all duration-150 cursor-pointer"
            >
              {secondaryCta.label}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
