"use client";

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

const BagIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const DollarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const STAR_PATH = "M12 .6l3.7 7.6 8.3 1.2-6 5.8 1.4 8.2L12 19.8 4.6 23.9 6 15.6 0 9.8l8.3-1.6z";

function fmtUSD(n: number): string {
  if (!n) return "$0";
  return `$${n.toLocaleString()}`;
}

/** Strip a trailing 3rd segment so plan IDs display in Zoho-compatible 2-seg form. */
function shortPlanId(id: string): string {
  const parts = id.split("-");
  return parts.length >= 3 ? `${parts[0]}-${parts[1]}` : id;
}

function StarsRow({ rating }: { rating: number }) {
  // Gradient id only needs to be unique relative to other half-star gradients
  // on the page. Ratings in 0.5 increments, so any rating shares the same
  // half-fill rendering — reuse one id per rating bucket.
  const gid = `pc-half-${rating.toFixed(1).replace(".", "-")}`;
  return (
    <span className="pc-stars" aria-label={`${rating} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((pos) => {
        if (rating >= pos) {
          return (
            <svg key={pos} viewBox="0 0 24 24" aria-hidden="true">
              <path d={STAR_PATH} />
            </svg>
          );
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
        return (
          <svg key={pos} viewBox="0 0 24 24" className="off" aria-hidden="true">
            <path d={STAR_PATH} />
          </svg>
        );
      })}
    </span>
  );
}

function Chip({ label, present }: { label: string; present: boolean }) {
  return <span className={`pc-chip${present ? "" : " off"}`}>{label}</span>;
}

export default function MedicarePlanCard({ plan, drugEstimate }: Props) {
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
  } = plan;

  const isZero = premium_monthly === 0;

  // Perk line priority: Part B giveback (agent's highest-converting talking
  // point) > OTC allowance > nothing. Amount comes from the parsed numeric
  // fields so we always have a real dollar figure to show.
  let perk: { text: string; amount: string; icon: "dollar" | "bag" } | null = null;
  if ((partBGivebackAmount ?? 0) > 0 && benefits.partBGiveback) {
    perk = {
      amount: `$${partBGivebackAmount}`,
      text: "/month Part B premium paid back to you",
      icon: "dollar",
    };
  } else if ((otcAllowanceAmount ?? 0) > 0 && benefits.otcAllowance) {
    perk = {
      amount: `$${otcAllowanceAmount}`,
      text: "/month OTC allowance for groceries & health items",
      icon: "bag",
    };
  }

  const hasRx = Boolean(benefits.rxCoverage && benefits.rxCoverage !== "—");

  return (
    <article className={`pc${isZero ? " is-zero" : ""}`}>
      <header className="pc-head">
        <span className="pc-carrier">
          <img
            src={carrierLogo(carrier)}
            alt={carrier}
            className="pc-carrier-logo"
          />
          <span className="pc-carrier-name">{carrier}</span>
        </span>
        <button
          type="button"
          className={`pc-heart${saved ? " saved" : ""}`}
          onClick={() => setSaved((s) => !s)}
          aria-label={saved ? "Remove from saved" : "Save plan"}
          aria-pressed={saved}
        >
          <HeartIcon />
        </button>
      </header>

      <h3 className="pc-title">{name}</h3>

      <div className="pc-meta">
        <span className="pc-id">{shortPlanId(id)}</span>
        <span className="pc-sep" aria-hidden="true" />
        {starRatingOverall != null && (
          <span className="pc-rating">
            <StarsRow rating={starRatingOverall} />
            <span className="pc-rating-val">{starRatingOverall.toFixed(1)}</span>
          </span>
        )}
      </div>

      <div className="pc-premium">
        <div className="pc-premium-left">
          <span className="pc-premium-label">Monthly premium</span>
          <span className="pc-premium-amt">{fmtUSD(premium_monthly)}</span>
          <span className="pc-premium-note">plus your Part B premium</span>
        </div>
        <span className="pc-premium-tag">
          {isZero ? "$0 plan" : networkType || "Plan"}
        </span>
      </div>

      <div className="pc-costs">
        <div className="pc-cost">
          <div className="pc-cost-k">Primary doctor</div>
          <div className="pc-cost-v">{benefits.primaryCare || "—"}</div>
        </div>
        <div className="pc-cost">
          <div className="pc-cost-k">Specialist</div>
          <div className="pc-cost-v">{benefits.specialist || "—"}</div>
        </div>
        <div className="pc-cost">
          <div className="pc-cost-k">In-network max</div>
          <div className="pc-cost-v">{fmtUSD(outOfPocketMax)}</div>
        </div>
        <div className="pc-cost">
          <div className="pc-cost-k">Drug deductible</div>
          <div className="pc-cost-v">{fmtUSD(deductible)}</div>
        </div>
      </div>

      {perk && (
        <div className="pc-perk">
          {perk.icon === "dollar" ? <DollarIcon /> : <BagIcon />}
          <span>
            <strong>{perk.amount}</strong>
            {perk.text}
          </span>
        </div>
      )}

      {drugEstimate && drugEstimate.annualCost > 0 && (
        <div className="pc-perk purple">
          <BagIcon />
          <span>
            <strong>{fmtUSD(drugEstimate.annualCost)}</strong>
            &nbsp;est. annual Rx cost
            {drugEstimate.uncoveredDrugs.length > 0 &&
              ` · ${drugEstimate.uncoveredDrugs.length} not covered`}
          </span>
        </div>
      )}

      <div className="pc-chips">
        <Chip label="Rx" present={hasRx} />
        <Chip label="Dental" present={Boolean(benefits.dental)} />
        <Chip label="Vision" present={Boolean(benefits.vision)} />
        <Chip label="Hearing" present={Boolean(benefits.hearing)} />
        {otcAllowanceAmount && otcAllowanceAmount > 0 ? (
          <span className="pc-chip">OTC ${otcAllowanceAmount}</span>
        ) : (
          <Chip label="OTC" present={false} />
        )}
        <Chip
          label="Giveback"
          present={(partBGivebackAmount ?? 0) > 0 && Boolean(benefits.partBGiveback)}
        />
      </div>

      <a href="tel:18444676968" className="pc-cta">
        <PhoneIcon />
        Speak to a licensed advisor
      </a>
      <Link href={`/medicare/${id}`} className="pc-link">
        View full benefits &rsaquo;
      </Link>
    </article>
  );
}
