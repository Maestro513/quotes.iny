import type { MedicarePlan } from "@/types/medicare";
import type { TierBadge } from "@/lib/medicare/tier-badges";

interface MedicarePlanCardProps {
  plan: MedicarePlan;
  tierBadges?: TierBadge[];
  isComparing?: boolean;
  compareDisabled?: boolean;
  onToggleCompare?: (plan: MedicarePlan) => void;
  /** Faded divider between rating and premium. Defaults to true. */
  showRatingDivider?: boolean;
}

const CARRIER_LOGO: Record<string, { name: string; color: string }> = {
  "UnitedHealthcare": { name: "UnitedHealthcare", color: "#002677" },
  "Humana": { name: "Humana", color: "#5a8c2b" },
  "Aetna": { name: "Aetna", color: "#7D2A85" },
  "Wellcare": { name: "Wellcare", color: "#006298" },
  "Devoted Health": { name: "Devoted Health", color: "#0b1c44" },
  "Elevance Health": { name: "Elevance", color: "#1F3F8B" },
  "Anthem": { name: "Anthem", color: "#1F3F8B" },
  "Cigna": { name: "Cigna", color: "#0033A0" },
  "Blue Cross Blue Shield": { name: "Blue Cross Blue Shield", color: "#0066B3" },
  "Kaiser Permanente": { name: "Kaiser Permanente", color: "#006BA6" },
  "CVS / SilverScript": { name: "SilverScript", color: "#CC0000" },
};

function parseDollar(raw: string | undefined): number | null {
  if (!raw) return null;
  const m = raw.match(/\$?([0-9][0-9,]*\.?\d*)/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  return isFinite(n) ? n : null;
}

function fmtDollar(n: number): string {
  return n === 0 ? "$0" : `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function CarrierLogo({ carrier }: { carrier: string }) {
  const meta = CARRIER_LOGO[carrier] ?? { name: carrier, color: "#1f1330" };
  return (
    <div className="h-[30px] flex justify-center items-center mb-2">
      <span style={{ color: meta.color }} className="text-[18px] font-bold tracking-tight">
        {meta.name}
      </span>
    </div>
  );
}

function StarRating({ rating }: { rating?: number }) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const stars = "★".repeat(full) + (half ? "⯨" : "") + "☆".repeat(5 - full - (half ? 1 : 0));
  return (
    <div className="flex items-center justify-center gap-1.5 text-[13px] text-[#4a4458] mt-1.5">
      <span className="text-[#f5b400] tracking-[1px] text-[14px]">{stars}</span>
      <span>{rating.toFixed(1)} CMS rating</span>
    </div>
  );
}

function GivebackPill({ amount }: { amount: number }) {
  const yearly = amount * 12;
  return (
    <div
      className="mt-2.5 mx-auto flex items-center justify-center gap-1.5 bg-[#e6f6ec] text-[#178f3d] border border-[#c7ebd2] rounded-lg px-3 py-2 text-[12.5px] font-medium w-fit max-w-full text-center leading-snug"
      title={`Reduces your Part B premium by $${amount}/mo`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" />
      </svg>
      Part B giveback: <b className="font-bold text-[13px]">${amount}/mo</b>
      <span className="text-[#178f3d] bg-white px-1.5 py-px rounded border border-[#c7ebd2] font-bold text-[11px]">
        ${yearly.toLocaleString()}/yr
      </span>
    </div>
  );
}

type BenefitCell = {
  name: string;
  value: string;
  bold: string;
  icon: React.ReactNode;
  tip?: string;
};

function BenefitCell({ cell }: { cell: BenefitCell }) {
  return (
    <div
      className="text-center text-[12px] text-[#2c2640] leading-snug px-0.5 py-1 rounded-lg hover:bg-[#faf7fd] transition-colors"
      title={cell.tip}
    >
      <div
        className="w-[34px] h-[34px] rounded-full inline-flex items-center justify-center text-white mb-1.5 bg-[#6a2fa0]"
        style={{ boxShadow: "0 2px 6px rgba(106, 47, 160, 0.28)" }}
        aria-hidden="true"
      >
        {cell.icon}
      </div>
      <div className="font-semibold text-[#1f1330]">{cell.name}</div>
      <div className="text-[#2c2640]">
        <b className="font-bold">{cell.bold}</b>
        {cell.value && <><br />{cell.value}</>}
      </div>
    </div>
  );
}

function buildBenefitCells(plan: MedicarePlan): BenefitCell[] {
  const b = plan.benefits;
  const visionAmt = parseDollar(b.vision);
  const dentalAmt = parseDollar(b.dental);
  const hearingAmt = parseDollar(b.hearing);
  const rxRaw = b.rxCoverage ?? "";
  const rxAmt = parseDollar(rxRaw);

  return [
    {
      name: "Vision",
      bold: visionAmt !== null ? fmtDollar(visionAmt) : (b.vision ?? "—"),
      value: visionAmt !== null ? "allowance" : "",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
      tip: visionAmt !== null ? `${fmtDollar(visionAmt)} annual vision allowance` : "Vision benefits included",
    },
    {
      name: "Dental",
      bold: dentalAmt !== null ? fmtDollar(dentalAmt) : (b.dental ?? "—"),
      value: dentalAmt !== null ? "allowance" : "",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5.5C9 2 4 3 4 8c0 4 2 6 3 11 .3 1.5 2 1.5 2 0 0-3 1-5 3-5s3 2 3 5c0 1.5 1.7 1.5 2 0 1-5 3-7 3-11 0-5-5-6-8-2.5z" />
        </svg>
      ),
      tip: dentalAmt !== null ? `${fmtDollar(dentalAmt)} annual dental allowance` : "Dental benefits included",
    },
    {
      name: "Hearing",
      bold: hearingAmt !== null ? fmtDollar(hearingAmt) : (b.hearing ?? "—"),
      value: hearingAmt !== null ? (b.hearing?.toLowerCase().includes("copay") ? "copay" : "allowance") : "",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9a6 6 0 0 1 12 0c0 4-3 5-3 8a3 3 0 0 1-6 0" />
          <path d="M6 9a3 3 0 0 0 0 6" />
        </svg>
      ),
      tip: hearingAmt !== null ? `${fmtDollar(hearingAmt)} hearing benefit` : "Hearing benefits included",
    },
    {
      name: "Rx Drugs",
      bold: rxAmt !== null ? fmtDollar(rxAmt) : (rxRaw || "—"),
      value: rxAmt !== null ? "copay" : (rxRaw ? "" : ""),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="8" width="18" height="8" rx="4" />
          <path d="M12 8v8" />
        </svg>
      ),
      tip: "Tier 1 prescription drug coverage",
    },
  ];
}

export default function MedicarePlanCard({ plan, tierBadges, isComparing, compareDisabled, onToggleCompare, showRatingDivider = true }: MedicarePlanCardProps) {
  const { id, name, carrier, premium_monthly, deductible, outOfPocketMax, starRating, benefits } = plan;
  const givebackAmt = parseDollar(benefits.partBGiveback);
  const primaryCopay = parseDollar(benefits.primaryCare);
  const specialistCopay = parseDollar(benefits.specialist);
  const benefitCells = buildBenefitCells(plan);

  return (
    <article
      className="relative bg-white rounded-[14px] px-[22px] pt-5 pb-[18px] flex flex-col transition-[transform,box-shadow] duration-[180ms] ease-[ease] hover:-translate-y-[3px]"
      style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.22), 0 2px 4px rgba(0,0,0,0.08)" }}
    >
      {/* Tier badges row (relative-tier only — no editorial labels) */}
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[22px]">
        {tierBadges?.map((badge) => {
          const isStrong = badge.tier === "strong";
          return (
            <span
              key={`${badge.category}-${badge.tier}`}
              className={`text-[11px] font-semibold tracking-[0.01em] rounded-md px-2 py-0.5 border ${
                isStrong
                  ? "bg-[#e6f6ec] text-[#178f3d] border-[#c7ebd2]"
                  : "bg-[#f4eef9] text-[#6a2fa0] border-[#e2d3f0]"
              }`}
            >
              {badge.label}
            </span>
          );
        })}
      </div>

      <CarrierLogo carrier={carrier} />

      <div className="text-center font-semibold text-[17px] text-[#1f1330] leading-[1.25] min-h-[44px] flex flex-col justify-center">
        <span>{name}</span>
        <span className="font-mono text-[13px] text-[#6a6378]">{id}</span>
      </div>

      <StarRating rating={starRating} />

      {showRatingDivider ? (
        <div className="my-3.5 h-px bg-gradient-to-r from-transparent via-[#ece8f1] to-transparent" aria-hidden="true" />
      ) : null}

      {/* Premium block */}
      <div className={`text-center relative ${showRatingDivider ? "" : "mt-2.5"}`}>
        <div className="text-[#1fa84a] text-[60px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">
          {fmtDollar(premium_monthly)}
        </div>
        <div className="mt-1.5 text-[14px] text-[#1f1330] font-medium">Monthly Premium</div>
        <div className="text-[12px] text-[#6a6378]">plus your Part B premium</div>
      </div>

      {givebackAmt !== null && givebackAmt > 0 && <GivebackPill amount={givebackAmt} />}

      {/* Stats grid 2x2 */}
      <div className="grid grid-cols-2 border-t border-b border-[#ece8f1] mt-3.5 text-[13px]">
        <div className="px-1.5 py-2.5 text-center flex flex-col gap-0.5 text-[#2c2640]">
          <span className="text-[#6a6378] text-[12px]">Deductible</span>
          <span className="font-semibold text-[14px] text-[#1f1330]">{fmtDollar(deductible)}</span>
        </div>
        <div className="px-1.5 py-2.5 text-center flex flex-col gap-0.5 text-[#2c2640] border-l border-[#ece8f1]">
          <span className="text-[#6a6378] text-[12px]">MOOP</span>
          <span className="font-semibold text-[14px] text-[#1f1330]">{fmtDollar(outOfPocketMax)}</span>
        </div>
        <div className="px-1.5 py-2.5 text-center flex flex-col gap-0.5 text-[#2c2640] border-t border-[#f3f0f7]">
          <span className="text-[#6a6378] text-[12px]">Primary Copay</span>
          <span className="font-semibold text-[14px] text-[#1f1330]">
            {primaryCopay !== null ? fmtDollar(primaryCopay) : (benefits.primaryCare || "—")}
          </span>
        </div>
        <div className="px-1.5 py-2.5 text-center flex flex-col gap-0.5 text-[#2c2640] border-l border-[#ece8f1] border-t border-t-[#f3f0f7]">
          <span className="text-[#6a6378] text-[12px]">Specialist Copay</span>
          <span className="font-semibold text-[14px] text-[#1f1330]">
            {specialistCopay !== null ? fmtDollar(specialistCopay) : (benefits.specialist || "—")}
          </span>
        </div>
      </div>

      <div className="text-[11px] font-bold text-[#6a6378] tracking-[0.08em] uppercase mt-4 mb-2 text-center">
        Extra benefits included
      </div>

      <div className="grid grid-cols-4 gap-1.5 mb-3.5">
        {benefitCells.map((cell) => (
          <BenefitCell key={cell.name} cell={cell} />
        ))}
      </div>

      <div className="mt-1 mb-3.5 bg-[#faf7fd] border border-[#ede4f5] rounded-lg px-2.5 py-2 flex items-center gap-2 text-[12px]">
        <span className="w-[22px] h-[22px] rounded-full bg-white text-[#6a2fa0] grid place-items-center flex-shrink-0 border border-[#ede4f5]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
        </span>
        <span className="text-[#4a4458] flex-1 leading-snug">
          Is your doctor in-network? <a href="#" className="text-[#6a2fa0] font-semibold no-underline hover:underline">Check now</a>
        </span>
      </div>

      <div className="flex items-center gap-3 mt-auto">
        <a
          href={`/medicare/${id}`}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-[#1fa84a] hover:bg-[#178f3d] text-white text-[14px] font-semibold rounded-lg px-4 py-3 transition-colors duration-[120ms] active:scale-[0.98]"
        >
          View Plan
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="M13 5l7 7-7 7" />
          </svg>
        </a>
        <label className="inline-flex items-center gap-1.5 text-[13px] text-[#2c2640] cursor-pointer select-none px-2 py-1.5 rounded-md hover:bg-[#faf7fd] transition-colors">
          <input
            type="checkbox"
            checked={!!isComparing}
            disabled={!!compareDisabled}
            onChange={() => onToggleCompare?.(plan)}
            className="w-3.5 h-3.5 cursor-pointer disabled:cursor-not-allowed"
            style={{ accentColor: "#6a2fa0" }}
          />
          Compare
        </label>
      </div>

      <div className="mt-2 text-center text-[11px] text-[#8a8398] tracking-[0.02em]">
        Enroll by <b className="text-[#b14c8a] font-semibold">Dec 7, 2026</b> for Jan 1 coverage
      </div>
    </article>
  );
}
