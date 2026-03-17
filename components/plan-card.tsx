import type { PlanBenefits } from "@/types/under65";

interface Cta {
  label: string;
  href: string;
}

interface PlanCardProps {
  planName: string;
  carrier: string;
  monthlyPremium: number;
  isFeatured: boolean;
  badges: string[];
  details: string[];
  benefits?: PlanBenefits;
  primaryCta: Cta;
  secondaryCta?: Cta;
}

const TIER_COLORS: Record<string, string> = {
  Bronze: "bg-amber-700/30 text-amber-300 border-amber-600/40",
  Silver: "bg-slate-400/20 text-slate-300 border-slate-400/40",
  Gold: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  Platinum: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  MA: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  Supplement: "bg-violet-500/20 text-violet-300 border-violet-500/40",
  PartD: "bg-teal-500/20 text-teal-300 border-teal-500/40",
};

function badgeClass(badge: string) {
  return (
    TIER_COLORS[badge] ??
    "bg-white/10 text-white/60 border-white/20"
  );
}

const BENEFIT_LABELS: Record<keyof PlanBenefits, string> = {
  primaryCare: "Primary Care",
  specialist: "Specialist",
  emergencyRoom: "Emergency Room",
  urgentCare: "Urgent Care",
  genericRx: "Generic Rx",
  mentalHealth: "Mental Health",
};

export default function PlanCard({
  planName,
  carrier,
  monthlyPremium,
  isFeatured,
  badges,
  details,
  benefits,
  primaryCta,
  secondaryCta,
}: PlanCardProps) {
  return (
    <div
      className={`relative rounded-xl mb-4 overflow-hidden transition-all duration-200 cursor-pointer
        backdrop-blur-sm
        ${isFeatured
          ? "shadow-[0_0_24px_rgba(34,197,94,0.15)] hover:shadow-[0_0_32px_rgba(34,197,94,0.25)]"
          : ""
        }`}
        style={{
          background: isFeatured
            ? "rgba(44,42,52,0.96)"
            : "rgba(38,36,46,0.92)",
          border: isFeatured
            ? "1px solid rgba(34,197,94,0.7)"
            : "1px solid rgba(255,255,255,0.12)",
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
            <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
              </div>
              <h3 className="text-white font-semibold text-sm leading-snug truncate">{planName}</h3>
              <p className="text-white/50 text-xs mt-0.5">{carrier}</p>
            </div>
          </div>

          {/* Right: price */}
          <div className="text-right shrink-0">
            <div className={`text-2xl font-bold tracking-tight ${isFeatured ? "text-[#22c55e]" : "text-white"}`}>
              ${monthlyPremium}
            </div>
            <div className="text-white/40 text-xs">/mo</div>
          </div>
        </div>

        {/* Details grid */}
        {details.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 p-3 rounded-lg" style={{background:"rgba(0,0,0,0.25)", border:"1px solid rgba(255,255,255,0.08)"}}>
            {details.map((d) => {
              const [label, value] = d.includes(":") ? d.split(":") : [null, d];
              return (
                <div key={d}>
                  {label ? (
                    <>
                      <div className="text-white/40 text-[10px] uppercase tracking-wide mb-0.5">{label.trim()}</div>
                      <div className="text-white/80 text-xs font-medium">{value?.trim()}</div>
                    </>
                  ) : (
                    <div className="text-white/60 text-xs">{d}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Benefits grid */}
        {benefits && (
          <div className="mt-3">
            <div className="text-white/30 text-[10px] uppercase tracking-wider mb-2">Coverage Details</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2">
              {(Object.keys(BENEFIT_LABELS) as (keyof PlanBenefits)[]).map((key) => (
                <div key={key} className="flex flex-col">
                  <span className="text-white/35 text-[10px] uppercase tracking-wide leading-none mb-0.5">{BENEFIT_LABELS[key]}</span>
                  <span className="text-white/75 text-xs font-medium leading-tight">{benefits[key]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

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
              className="px-5 py-2 rounded-lg text-sm font-medium border border-white/20 text-white/60 hover:border-white/50 hover:text-white transition-all duration-150 cursor-pointer"
            >
              {secondaryCta.label}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
