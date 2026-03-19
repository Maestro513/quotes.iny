import type { MedicarePlanType } from "@/types/medicare";

interface MedicarePlanCardProps {
  planNumber: string;
  planName: string;
  carrier: string;
  planType: MedicarePlanType;
  monthlyPremium: number;
  highlights: string[];
  isFeatured?: boolean;
}

const TYPE_LABEL: Record<MedicarePlanType, string> = {
  MA: "Medicare Advantage",
  Supplement: "Medigap Supplement",
  PartD: "Part D Prescription",
};

const TYPE_DOT: Record<MedicarePlanType, string> = {
  MA: "bg-violet-500",
  Supplement: "bg-sky-500",
  PartD: "bg-amber-500",
};

const TYPE_BADGE: Record<MedicarePlanType, string> = {
  MA: "text-violet-700 bg-violet-50 border-violet-200",
  Supplement: "text-sky-700 bg-sky-50 border-sky-200",
  PartD: "text-amber-700 bg-amber-50 border-amber-200",
};

export default function MedicarePlanCard({
  planNumber, planName, carrier, planType, monthlyPremium, highlights, isFeatured,
}: MedicarePlanCardProps) {
  return (
    <div
      className={`rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg ${isFeatured ? "ring-2 ring-[#22c55e]/60" : ""}`}
      style={{
        background: "rgba(255,255,255,0.97)",
        boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
        border: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-start justify-between gap-4">
        <div>
          <p className="text-gray-400 text-xs font-medium tracking-wide">{carrier}</p>
          <h3 className="text-gray-900 font-bold text-[15px] leading-snug mt-0.5">{planName}</h3>
          <p className="text-gray-400 text-[11px] mt-0.5 font-mono">{planNumber}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`w-2 h-2 rounded-full ${TYPE_DOT[planType]}`} />
            <span className={`text-[11px] font-semibold border px-2 py-0.5 rounded-full ${TYPE_BADGE[planType]}`}>
              {TYPE_LABEL[planType]}
            </span>
            {isFeatured && <span className="text-[10px] font-bold text-white bg-[#22c55e] px-2 py-0.5 rounded-full uppercase">Best Value</span>}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 flex gap-8">
        {/* Premium */}
        <div className="shrink-0">
          <div className="text-gray-400 text-[11px] font-medium uppercase tracking-wider mb-1">Monthly premium</div>
          <div className="text-[32px] font-extrabold leading-none tracking-tight text-[#22c55e]">
            <span className="text-[18px] align-top mr-0.5">$</span>{monthlyPremium.toFixed(2)}
          </div>
        </div>

        {/* Highlights */}
        {highlights.length > 0 && (
          <div className="flex-1 min-w-0 self-center">
            <div className="text-gray-400 text-[11px] font-medium uppercase tracking-wider mb-2">Plan highlights</div>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1">
              {highlights.map((h) => (
                <li key={h} className="flex items-start gap-1.5 text-xs text-gray-700">
                  <svg className="w-3.5 h-3.5 text-[#22c55e] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between">
        <div className="flex gap-5">
          <span className="text-violet-600 text-sm font-medium cursor-pointer hover:text-violet-800">Benefits</span>
          <span className="text-violet-600 text-sm font-medium cursor-pointer hover:text-violet-800">Coverage</span>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 cursor-pointer">Plan Details</button>
          <button className="px-5 py-1.5 text-sm font-semibold rounded-lg bg-[#22c55e] text-white hover:bg-green-400 cursor-pointer">Enroll Now</button>
        </div>
      </div>
    </div>
  );
}
