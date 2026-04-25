"use client";

/**
 * MedicarePlanCardE — drop-in replacement for components/medicare-plan-card.tsx
 *
 * Implements the "Iteration E — Stamp × Inline" card design approved in the
 * design exploration. Same Props as MedicarePlanCard, same behaviors (Save
 * heart, "Speak to a licensed advisor" tel CTA, drug-estimate purple perk
 * row, Link to /medicare/[planId]). Markup uses .pc-e-* classes so it can
 * coexist with the current .pc-* card while you A/B them.
 *
 * To install:
 *   1. Place this file at components/medicare-plan-card-e.tsx
 *   2. Append the contents of medicare.css.append.css to app/medicare/medicare.css
 *   3. In app/medicare/page.tsx, swap:
 *        import MedicarePlanCard from "@/components/medicare-plan-card";
 *      for:
 *        import MedicarePlanCard from "@/components/medicare-plan-card-e";
 *      (no other changes needed — the props are identical)
 */

import Link from "next/link";
import { useState } from "react";
import type { MedicarePlan, DrugEstimate } from "@/types/medicare";
import { carrierLogo } from "@/lib/medicare/carrier-logos";

interface Props {
  plan: MedicarePlan;
  drugEstimate?: DrugEstimate;
}

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const HeartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const STAR_PATH = "M12 .6l3.7 7.6 8.3 1.2-6 5.8 1.4 8.2L12 19.8 4.6 23.9 6 15.6 0 9.8l8.3-1.6z";

function fmtUSD(n: number): string {
  if (!n) return "$0";
  return `$${n.toLocaleString()}`;
}

function shortPlanId(id: string): string {
  const parts = id.split("-");
  return parts.length >= 3 ? `${parts[0]}-${parts[1]}` : id;
}

function StarsRow({ rating }: { rating: number }) {
  const gid = `pce-half-${rating.toFixed(1).replace(".", "-")}`;
  return (
    <span className="pc-e-stars" aria-label={`${rating} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((pos) => {
        if (rating >= pos) {
          return <svg key={pos} viewBox="0 0 24 24" aria-hidden="true"><path d={STAR_PATH} /></svg>;
        }
        if (rating >= pos - 0.5) {
          return (
            <svg key={pos} viewBox="0 0 24 24" aria-hidden="true">
              <defs>
                <linearGradient id={gid}>
                  <stop offset="50%" stopColor="#e9b308" />
                  <stop offset="50%" stopColor="#e4e0ea" />
                </linearGradient>
              </defs>
              <path fill={`url(#${gid})`} d={STAR_PATH} />
            </svg>
          );
        }
        return <svg key={pos} viewBox="0 0 24 24" className="off" aria-hidden="true"><path d={STAR_PATH} /></svg>;
      })}
    </span>
  );
}

function Chip({ label, present }: { label: string; present: boolean }) {
  return <span className={`pc-e-chip${present ? "" : " off"}`}>{label}</span>;
}

export default function MedicarePlanCardE({ plan, drugEstimate }: Props) {
  const [saved, setSaved] = useState(false);
  const {
    id,
    name,
    carrier,
    networkType,
    benefits,
    premium_monthly,
    deductible,
    outOfPocketMax,
    starRatingOverall,
    partBGivebackAmount,
    otcAllowanceAmount,
    county,
  } = plan;

  // Same perk-priority rule as the current card — Part B giveback wins, OTC
  // is the fallback. Recolored purple in the design (was green).
  let perk: { amount: string; unit: string; label: string } | null = null;
  if ((partBGivebackAmount ?? 0) > 0 && benefits.partBGiveback) {
    perk = {
      amount: `$${partBGivebackAmount}`,
      unit: "/mo",
      label: "Part B premium paid back",
    };
  } else if ((otcAllowanceAmount ?? 0) > 0 && benefits.otcAllowance) {
    perk = {
      amount: `$${otcAllowanceAmount}`,
      unit: "/mo",
      label: "OTC allowance for groceries & health",
    };
  }

  // "Benefits at a glance" list — up to 3 lines, in priority order. Mirrors
  // the design exploration's prioritization (Vision → OTC → Part B credit
  // → Hearing → Dental).
  type GlanceLine = { icon: string; label: string; value: string };
  const glanceLines: GlanceLine[] = [];
  if (benefits.vision) glanceLines.push({ icon: "○", label: "Vision", value: benefits.vision });
  if ((otcAllowanceAmount ?? 0) > 0) glanceLines.push({ icon: "□", label: "OTC", value: `$${otcAllowanceAmount} allowance per month` });
  if ((partBGivebackAmount ?? 0) > 0) glanceLines.push({ icon: "$", label: "Part B credit", value: `Up to $${partBGivebackAmount} every month` });
  if (benefits.hearing) glanceLines.push({ icon: "♪", label: "Hearing", value: benefits.hearing });
  if (benefits.dental) glanceLines.push({ icon: "+", label: "Dental", value: benefits.dental });
  const visibleGlance = glanceLines.slice(0, 3);

  const hasRx = Boolean(benefits.rxCoverage && benefits.rxCoverage !== "—");

  return (
    <article className="pc-e">
      {/* HEADER — carrier logo + name, premium seal (always green), heart */}
      <header className="pc-e-head">
        <span className="pc-e-carrier">
          <img src={carrierLogo(carrier)} alt={carrier} className="pc-e-carrier-logo" />
          <span className="pc-e-carrier-meta">
            <span className="pc-e-carrier-name">{carrier}</span>
            <span className="pc-e-id">{shortPlanId(id)} · {networkType ?? "Plan"}</span>
          </span>
        </span>

        <span className="pc-e-head-right">
          <span className="pc-e-seal" aria-label={`Premium ${fmtUSD(premium_monthly)} per month`}>
            <span className="pc-e-seal-label">Premium</span>
            <span className="pc-e-seal-amt">{fmtUSD(premium_monthly)}</span>
            <span className="pc-e-seal-unit">/month</span>
          </span>
          <button
            type="button"
            className={`pc-e-heart${saved ? " saved" : ""}`}
            onClick={() => setSaved((s) => !s)}
            aria-label={saved ? "Remove from saved" : "Save plan"}
            aria-pressed={saved}
          >
            <HeartIcon />
          </button>
        </span>
      </header>

      <h3 className="pc-e-title">{name}</h3>

      <div className="pc-e-meta">
        {starRatingOverall != null && (
          <>
            <StarsRow rating={starRatingOverall} />
            <span className="pc-e-meta-v">{starRatingOverall.toFixed(1)} stars</span>
            <span className="pc-e-meta-dot" aria-hidden="true" />
          </>
        )}
        <span>{county} County · 2026</span>
      </div>

      {/* PERFORATION — ticket-stub divider */}
      <div className="pc-e-perf" aria-hidden="true">
        <span className="pc-e-perf-notch left" />
        <span className="pc-e-perf-line" />
        <span className="pc-e-perf-notch right" />
      </div>

      {/* COSTS — 2x2 */}
      <div className="pc-e-costs">
        <div className="pc-e-cost">
          <div className="pc-e-cost-k">Primary doctor</div>
          <div className="pc-e-cost-v">{benefits.primaryCare || "—"}</div>
        </div>
        <div className="pc-e-cost">
          <div className="pc-e-cost-k">Specialist</div>
          <div className="pc-e-cost-v">{benefits.specialist || "—"}</div>
        </div>
        <div className="pc-e-cost">
          <div className="pc-e-cost-k">ER visit</div>
          <div className="pc-e-cost-v">{benefits.emergencyRoom || "—"}</div>
        </div>
        <div className="pc-e-cost">
          <div className="pc-e-cost-k">In-network max</div>
          <div className="pc-e-cost-v">{fmtUSD(outOfPocketMax)}</div>
        </div>
      </div>

      {/* PERK STRIP — purple */}
      {perk && (
        <div className="pc-e-perk">
          <span className="pc-e-perk-amt-row">
            <span className="pc-e-perk-amt">{perk.amount}</span>
            <span className="pc-e-perk-unit">{perk.unit}</span>
          </span>
          <span className="pc-e-perk-label">{perk.label}</span>
        </div>
      )}

      {drugEstimate && drugEstimate.annualCost > 0 && (
        <div className="pc-e-perk pc-e-perk-rx">
          <span className="pc-e-perk-amt-row">
            <span className="pc-e-perk-amt">{fmtUSD(drugEstimate.annualCost)}</span>
            <span className="pc-e-perk-unit">/yr</span>
          </span>
          <span className="pc-e-perk-label">
            est. annual Rx cost
            {drugEstimate.uncoveredDrugs.length > 0 && ` · ${drugEstimate.uncoveredDrugs.length} not covered`}
          </span>
        </div>
      )}

      {/* BENEFITS AT A GLANCE */}
      <div className="pc-e-glance">
        <div className="pc-e-glance-title">Benefits at a glance</div>
        <ul className="pc-e-glance-list">
          {visibleGlance.map((line, i) => (
            <li key={i} className="pc-e-glance-li">
              <span className="pc-e-glance-icon" aria-hidden="true">{line.icon}</span>
              <span className="pc-e-glance-k">{line.label}:</span>
              <span className="pc-e-glance-v">{line.value}</span>
            </li>
          ))}
        </ul>

        <div className="pc-e-chips">
          <Chip label="Rx" present={hasRx} />
          <Chip label="Dental" present={Boolean(benefits.dental)} />
          <Chip label="Vision" present={Boolean(benefits.vision)} />
          <Chip label="Hearing" present={Boolean(benefits.hearing)} />
        </div>
      </div>

      {/* CTA */}
      <a href="tel:18444676968" className="pc-e-cta">
        <PhoneIcon />
        Speak to a licensed advisor
      </a>

      {/* IN-NETWORK ACTIONS FOOTER */}
      <div className="pc-e-footer">
        <div className="pc-e-footer-title">See what's in-network with this plan</div>
        <ul className="pc-e-action-list">
          <li className="pc-e-action-li"><span className="pc-e-action-dot"><PlusIcon /></span> Add prescription drugs</li>
        </ul>

        <div className="pc-e-footer-actions">
          <Link href={`/medicare/${id}`} className="pc-e-full-details">
            Full Details ›
          </Link>
        </div>
      </div>
    </article>
  );
}
