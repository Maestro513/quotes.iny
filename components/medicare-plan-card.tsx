"use client";

import Link from "next/link";
import { useState } from "react";
import type { MedicarePlan, DrugEstimate } from "@/types/medicare";

interface Props {
  plan: MedicarePlan;
  drugEstimate?: DrugEstimate;
}

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const HeartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

function fmtUSD(n: number) {
  return n === 0 ? "$0" : `$${n.toLocaleString()}`;
}

function BenefitPill({ label, present, annotation }: { label: string; present: boolean; annotation?: string }) {
  if (!present) return <span className="bpill absent">{label}</span>;
  return (
    <span className="bpill">
      <CheckIcon />
      {annotation ? `${label} ${annotation}` : label}
    </span>
  );
}

export default function MedicarePlanCard({ plan, drugEstimate }: Props) {
  const [saved, setSaved] = useState(false);

  const { id, name, carrier, benefits, premium_monthly, deductible, outOfPocketMax, starRatingOverall, partBGivebackAmount, otcAllowanceAmount } = plan;

  const rating = starRatingOverall ? starRatingOverall.toFixed(1) : null;
  const hasGiveback = (partBGivebackAmount ?? 0) > 0 && benefits.partBGiveback;
  const hasOtc = (otcAllowanceAmount ?? 0) > 0 && benefits.otcAllowance;

  return (
    <article className="plan-card">
      <div className="card-top">
        <span className="card-carrier">{carrier}</span>
        <button
          className={`save-heart${saved ? " saved" : ""}`}
          onClick={() => setSaved((s) => !s)}
          aria-label={saved ? "Remove from saved" : "Save plan"}
          aria-pressed={saved}
        >
          <HeartIcon />
        </button>
      </div>

      <div className="card-body">
        <h3 className="plan-name">{name}</h3>

        {rating && (
          <div className="rating-block">
            <div className="rating-num">{rating}</div>
            <div className="rating-meta">
              CMS Stars
              <br />
              2026 Rating
            </div>
          </div>
        )}

        <div className="premium-hero">
          <span className="premium-amount">{fmtUSD(premium_monthly)}</span>
          <div className="premium-label">Monthly premium</div>
          <div className="premium-note">+ your Part B premium</div>
        </div>

        <div className="stat-row">
          <div className="stat-cell">
            <span className="k">Primary Doctor</span>
            <span className="v">{benefits.primaryCare}</span>
          </div>
          <div className="stat-cell">
            <span className="k">Specialist</span>
            <span className="v">{benefits.specialist}</span>
          </div>
          <div className="stat-cell">
            <span className="k">In-Network Max</span>
            <span className="v">{fmtUSD(outOfPocketMax)}</span>
          </div>
          <div className="stat-cell">
            <span className="k">Rx Deductible</span>
            <span className="v">{fmtUSD(deductible)}</span>
          </div>
        </div>

        {hasGiveback && (
          <div className="highlight">
            <strong>Part B giveback:</strong>&nbsp;{benefits.partBGiveback}
          </div>
        )}

        {drugEstimate && drugEstimate.annualCost > 0 && (
          <div className="highlight" style={{ borderLeftColor: "var(--bright-purple)", background: "rgba(80,11,126,.06)" }}>
            <strong style={{ color: "var(--bright-purple)" }}>Est. annual Rx cost:</strong>&nbsp;{fmtUSD(drugEstimate.annualCost)}
            {drugEstimate.uncoveredDrugs.length > 0 && ` · ${drugEstimate.uncoveredDrugs.length} not covered`}
          </div>
        )}

        <div className="benefit-pills">
          <BenefitPill label="Dental" present={Boolean(benefits.dental)} />
          <BenefitPill label="Vision" present={Boolean(benefits.vision)} />
          <BenefitPill label="Hearing" present={Boolean(benefits.hearing)} />
          <BenefitPill label="Rx" present={Boolean(benefits.rxCoverage && benefits.rxCoverage !== "—")} />
          {hasOtc && <BenefitPill label="OTC" present annotation={`$${otcAllowanceAmount}`} />}
        </div>

        <a href="tel:18444676968" className="enroll-btn">
          <PhoneIcon />
          Talk to a licensed agent
        </a>

        <div className="card-actions">
          <Link href={`/medicare/${id}`} className="card-secondary">View full details</Link>
          <button className="card-secondary" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            Check network
          </button>
        </div>
      </div>
    </article>
  );
}
