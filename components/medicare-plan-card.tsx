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

function FeatureCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div className={`rounded-lg border ${color} p-3 text-center min-w-0`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm font-bold text-gray-800 leading-tight">{value}</div>
    </div>
  );
}

export default function MedicarePlanCard({ plan, isFeatured }: MedicarePlanCardProps) {
  const { id, name, carrier, type, premium_monthly, deductible, outOfPocketMax, benefits, highlights } = plan;

  const fmt = (n: number) => n === 0 ? "$0" : `$${n.toLocaleString(undefined, { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

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
            <div className="text-[#22c55e] text-lg font-extrabold">$0</div>
            <div className="text-[#22c55e] text-[10px] font-semibold">Premium</div>
          </div>
        )}
      </div>

      {/* Costs + Coverage side by side */}
      <div className="px-5 py-4 flex flex-col lg:flex-row gap-6">
        {/* Left: Key costs */}
        <div className="shrink-0 lg:w-56">
          <div className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-3">Plan Costs</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 font-medium">Monthly Premium</span>
              <span className="text-xl font-extrabold text-[#22c55e]">{fmt(premium_monthly)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 font-medium">Deductible</span>
              <span className="text-lg font-bold text-gray-800">{fmt(deductible)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 font-medium">Max Out-of-Pocket</span>
              <span className="text-lg font-bold text-gray-800">{fmt(outOfPocketMax)}</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px bg-gray-200" />
        <div className="lg:hidden h-px bg-gray-200" />

        {/* Right: Coverage details */}
        <div className="flex-1 min-w-0">
          <div className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-3">Coverage Details</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
            <div className="flex items-center justify-between col-span-1">
              <span className="text-sm text-gray-500">Primary Care</span>
              <span className="text-sm font-bold text-gray-800 ml-2">{benefits.primaryCare}</span>
            </div>
            <div className="flex items-center justify-between col-span-1">
              <span className="text-sm text-gray-500">Specialist</span>
              <span className="text-sm font-bold text-gray-800 ml-2">{benefits.specialist}</span>
            </div>
            <div className="flex items-center justify-between col-span-1">
              <span className="text-sm text-gray-500">Emergency Room</span>
              <span className="text-sm font-bold text-gray-800 ml-2">{benefits.emergencyRoom}</span>
            </div>
            <div className="flex items-center justify-between col-span-1">
              <span className="text-sm text-gray-500">Urgent Care</span>
              <span className="text-sm font-bold text-gray-800 ml-2">{benefits.urgentCare}</span>
            </div>
            <div className="flex items-center justify-between col-span-1">
              <span className="text-sm text-gray-500">Rx (Tier 1)</span>
              <span className="text-sm font-bold text-gray-800 ml-2">{benefits.rxCoverage}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature cards: Dental, Vision, Hearing, OTC, Part B Giveback */}
      {(benefits.dental || benefits.vision || benefits.hearing || benefits.otcAllowance || benefits.partBGiveback) && (
        <div className="px-5 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {benefits.dental && (
              <FeatureCard icon="🦷" label="Dental" value={benefits.dental} color="bg-blue-50 border-blue-200" />
            )}
            {benefits.vision && (
              <FeatureCard icon="👁️" label="Vision" value={benefits.vision} color="bg-purple-50 border-purple-200" />
            )}
            {benefits.hearing && (
              <FeatureCard icon="👂" label="Hearing" value={benefits.hearing} color="bg-amber-50 border-amber-200" />
            )}
            {benefits.otcAllowance && (
              <FeatureCard icon="🛒" label="OTC Allowance" value={benefits.otcAllowance} color="bg-emerald-50 border-emerald-200" />
            )}
            {benefits.partBGiveback && (
              <FeatureCard icon="💰" label="Part B Giveback" value={benefits.partBGiveback} color="bg-rose-50 border-rose-200" />
            )}
          </div>
        </div>
      )}

      {/* Highlights */}
      {highlights.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            {highlights.map((h) => (
              <span key={h} className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-violet-50 border border-violet-100 rounded-full px-3 py-1">
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
