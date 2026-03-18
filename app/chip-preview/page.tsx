import { mockUnder65Plans } from "@/lib/under65/mock";

const plan = mockUnder65Plans[0];

const chips = [
  { label: "Specialist",    value: plan.benefits.specialist },
  { label: "Emergency",     value: plan.benefits.emergencyRoom },
  { label: "Doctor Visits", value: plan.benefits.primaryCare },
  { label: "Generic Drugs", value: plan.benefits.genericRx },
];

const TIER_BADGE: Record<string, string> = {
  Bronze: "border-amber-400 text-amber-600",
  Silver: "border-slate-400 text-slate-500",
  Gold:   "border-yellow-500 text-yellow-600",
};

function CardShell({ children, theme }: { children: React.ReactNode; theme: string }) {
  return (
    <div className="mb-4">
      <p className="text-white/50 text-xs uppercase tracking-widest mb-2 font-semibold">{theme}</p>
      <div className="rounded-xl overflow-hidden bg-white" style={{border:"1px solid rgba(0,0,0,0.10)", boxShadow:"0 2px 12px rgba(0,0,0,0.08)"}}>
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-gray-400 text-xs mb-0.5">{plan.carrier}</p>
              <h3 className="text-gray-900 font-bold text-base leading-snug">{plan.name}</h3>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
              <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full uppercase tracking-wide ${TIER_BADGE[plan.metalTier]}`}>{plan.metalTier}</span>
              <span className="text-[10px] font-semibold border border-gray-300 text-gray-500 px-2 py-0.5 rounded-full uppercase tracking-wide">{plan.planType}</span>
              <span className="text-[10px] font-bold border border-[#22c55e] text-[#22c55e] px-2 py-0.5 rounded-full uppercase tracking-wide">Best Value</span>
            </div>
          </div>
          {/* Stats */}
          <div className="flex items-end gap-8 mt-4 pb-4 border-b" style={{borderColor:"rgba(218,202,239,0.35)"}}>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5 text-violet-500">Monthly Premium</div>
              <div className="text-4xl font-black text-gray-900 tracking-tight">${plan.netPremium}</div>
              <div className="text-emerald-500 text-xs font-semibold mt-0.5">−${plan.estimatedSubsidy}/mo subsidy</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5 text-violet-500">Deductible</div>
              <div className="text-4xl font-black text-gray-900 tracking-tight">${plan.deductible.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5 text-violet-500">Out-of-Pocket Max</div>
              <div className="text-2xl font-bold text-gray-700 tracking-tight">${plan.outOfPocketMax.toLocaleString()}</div>
            </div>
          </div>
          {/* Chips */}
          {children}
          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t" style={{borderColor:"rgba(218,202,239,0.35)"}}>
            <div className="flex items-center gap-4">
              <button className="text-[#22c55e] text-sm font-medium cursor-pointer">Benefits</button>
              <button className="text-[#22c55e] text-sm font-medium cursor-pointer">Doctors</button>
              <button className="text-[#22c55e] text-sm font-medium cursor-pointer">Drugs</button>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-600 cursor-pointer">Plan Details</button>
              <button className="px-5 py-2 rounded-lg text-sm font-bold bg-[#22c55e] text-white cursor-pointer shadow-[0_0_12px_rgba(34,197,94,0.25)]">Enroll Now</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChipPreview() {
  return (
    <div className="min-h-screen px-6 py-10 max-w-4xl mx-auto">
      <h1 className="text-white text-2xl font-black tracking-tight mb-8">Chip Color Themes</h1>

      {/* Theme A — Soft Lavender */}
      <CardShell theme="A — Soft Lavender">
        <div className="flex gap-2 mt-4 flex-wrap">
          {chips.map((c) => (
            <div key={c.label} className="flex flex-col px-3 py-2.5 rounded-lg" style={{background:"#f5f3ff", border:"1px solid rgba(167,139,250,0.45)"}}>
              <span className="text-[9px] font-bold uppercase tracking-widest mb-0.5 whitespace-nowrap text-violet-400">{c.label}</span>
              <span className="text-xs font-bold leading-tight text-violet-900">{c.value}</span>
            </div>
          ))}
        </div>
      </CardShell>

      {/* Theme B — Green Mint */}
      <CardShell theme="B — Green Mint">
        <div className="flex gap-2 mt-4 flex-wrap">
          {chips.map((c) => (
            <div key={c.label} className="flex flex-col px-3 py-2.5 rounded-lg" style={{background:"#f0fdf4", border:"1px solid rgba(34,197,94,0.35)"}}>
              <span className="text-[9px] font-bold uppercase tracking-widest mb-0.5 whitespace-nowrap text-emerald-500">{c.label}</span>
              <span className="text-xs font-bold leading-tight text-emerald-900">{c.value}</span>
            </div>
          ))}
        </div>
      </CardShell>

      {/* Theme C — Slate Blue */}
      <CardShell theme="C — Slate Blue">
        <div className="flex gap-2 mt-4 flex-wrap">
          {chips.map((c) => (
            <div key={c.label} className="flex flex-col px-3 py-2.5 rounded-lg" style={{background:"#eff6ff", border:"1px solid rgba(99,102,241,0.30)"}}>
              <span className="text-[9px] font-bold uppercase tracking-widest mb-0.5 whitespace-nowrap text-indigo-400">{c.label}</span>
              <span className="text-xs font-bold leading-tight text-indigo-900">{c.value}</span>
            </div>
          ))}
        </div>
      </CardShell>
    </div>
  );
}
