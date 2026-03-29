import type { MedicarePlan, MedicarePlanType } from "@/types/medicare";

interface MedicarePlanCardProps {
  plan: MedicarePlan;
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

function StatBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="text-center px-3">
      <div className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-lg font-bold leading-tight ${accent ? "text-[#22c55e]" : "text-gray-800"}`}>{value}</div>
    </div>
  );
}

function BenefitRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="text-sm font-semibold text-gray-700">{label}</span>
      </div>
      <span className="text-sm font-bold text-gray-900">{value}</span>
    </div>
  );
}

export default function MedicarePlanCard({ plan, isFeatured }: MedicarePlanCardProps) {
  const { id, name, carrier, type, premium_monthly, deductible, outOfPocketMax, benefits, highlights } = plan;

  const premium = premium_monthly === 0 ? "$0" : `$${premium_monthly.toFixed(2)}`;
  const deductibleStr = deductible === 0 ? "$0" : `$${deductible.toLocaleString()}`;
  const moopStr = outOfPocketMax === 0 ? "$0" : `$${outOfPocketMax.toLocaleString()}`;

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
        <div className="flex-1 min-w-0">
          <p className="text-gray-400 text-xs font-medium tracking-wide">{carrier}</p>
          <h3 className="text-gray-900 font-bold text-base leading-snug mt-0.5">{name}</h3>
          <p className="text-gray-400 text-[11px] mt-0.5 font-mono">{id}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`w-2 h-2 rounded-full ${TYPE_DOT[type]}`} />
            <span className={`text-[11px] font-semibold border px-2 py-0.5 rounded-full ${TYPE_BADGE[type]}`}>
              {TYPE_LABEL[type]}
            </span>
            {isFeatured && <span className="text-[10px] font-bold text-white bg-[#22c55e] px-2 py-0.5 rounded-full uppercase">Best Value</span>}
          </div>
        </div>
        {premium_monthly === 0 && (
          <div className="bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-lg px-3 py-1.5 text-center shrink-0">
            <div className="text-[#22c55e] text-xs font-bold uppercase">$0</div>
            <div className="text-[#22c55e] text-[10px] font-medium">Premium</div>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="px-5 py-4 flex items-center border-b border-gray-100">
        <div className="flex items-center divide-x divide-gray-200 w-full">
          <StatBox label="Monthly Premium" value={premium} accent />
          <StatBox label="Deductible" value={deductibleStr} />
          <StatBox label="Max Out-of-Pocket" value={moopStr} />
        </div>
      </div>

      {/* Benefits */}
      <div className="px-5 py-3">
        <div className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-1">Coverage Details</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <BenefitRow icon="🩺" label="Primary Care" value={benefits.primaryCare} />
          <BenefitRow icon="👨‍⚕️" label="Specialist" value={benefits.specialist} />
          <BenefitRow icon="🚑" label="Emergency Room" value={benefits.emergencyRoom} />
          <BenefitRow icon="🏥" label="Urgent Care" value={benefits.urgentCare} />
          <BenefitRow icon="💊" label="Rx Coverage" value={benefits.rxCoverage} />
          {benefits.dental && <BenefitRow icon="🦷" label="Dental" value={benefits.dental} />}
          {benefits.vision && <BenefitRow icon="👁️" label="Vision" value={benefits.vision} />}
          {benefits.hearing && <BenefitRow icon="👂" label="Hearing" value={benefits.hearing} />}
        </div>
      </div>

      {/* Highlights */}
      {highlights.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-100">
          <div className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-2">Plan Highlights</div>
          <div className="flex flex-wrap gap-2">
            {highlights.map((h) => (
              <span key={h} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-violet-50 border border-violet-100 rounded-full px-3 py-1">
                <svg className="w-3 h-3 text-[#22c55e] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {h}
              </span>
            ))}
          </div>
        </div>
      )}

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
