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
  primaryCta: Cta;
  secondaryCta?: Cta;
}

export default function PlanCard({
  planName,
  carrier,
  monthlyPremium,
  isFeatured,
  badges,
  details,
  primaryCta,
  secondaryCta,
}: PlanCardProps) {
  return (
    <div
      className={`rounded-lg p-5 mb-3 ${
        isFeatured
          ? "border border-[#22c55e] bg-[rgba(34,197,94,0.06)]"
          : "border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.07)]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {isFeatured && (
              <span className="text-xs font-bold bg-[#22c55e] text-white px-2 py-0.5 rounded-full">
                Best Value
              </span>
            )}
            {badges.map((b) => (
              <span
                key={b}
                className="text-xs text-white/60 border border-white/20 px-2 py-0.5 rounded-full"
              >
                {b}
              </span>
            ))}
          </div>
          <h3 className="text-white font-semibold text-sm leading-snug">{planName}</h3>
          <p className="text-white/60 text-xs mt-0.5">{carrier}</p>
        </div>

        <div className="text-right shrink-0">
          <span
            className={`text-xl font-bold ${isFeatured ? "text-[#22c55e]" : "text-white"}`}
          >
            ${monthlyPremium}
            <span className="text-sm font-normal">/mo</span>
          </span>
        </div>
      </div>

      {details.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
          {details.map((d) => (
            <span key={d} className="text-white/60 text-xs">
              {d}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 mt-4">
        <a
          href={primaryCta.href}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
            isFeatured
              ? "bg-[#22c55e] text-white hover:bg-green-500"
              : "border border-[#22c55e] text-[#22c55e] hover:bg-[#22c55e] hover:text-white"
          }`}
        >
          {primaryCta.label}
        </a>
        {secondaryCta && (
          <a
            href={secondaryCta.href}
            className="px-4 py-2 rounded-md text-sm font-medium border border-white/30 text-white/70 hover:border-white/60 hover:text-white transition-colors"
          >
            {secondaryCta.label}
          </a>
        )}
      </div>
    </div>
  );
}
