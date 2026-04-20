import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { loadPlan, allPlanIdParams } from "@/lib/medicare/plan-loader";
import { carrierLogo } from "@/lib/medicare/carrier-logos";
import type { PlanDetail, PlanRow, PlanSection } from "@/types/plan-detail";
import PlanJsonLd from "./json-ld";
import "./plan-detail.css";

export const dynamicParams = true;
export const revalidate = 86400; // 1 day

export async function generateStaticParams() {
  return allPlanIdParams();
}

type Params = { params: Promise<{ planId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { planId } = await params;
  const plan = loadPlan(planId);
  if (!plan) return { title: "Plan not found | Insurance 'n You" };

  const fullId = plan.plan_id_full || planId;
  const premium = plan.monthly_premium || "$0";
  const planType = plan.plan_type || "Medicare Advantage";
  const title = `${plan.plan_name} (${fullId}) | Insurance 'n You`;
  const desc =
    `${premium}/month ${planType} plan from ${plan.carrier}. ` +
    `Coverage in ${plan.geographic_area || plan.states || "select counties"}. ` +
    `View benefits, drug tiers, and enroll with a licensed agent.`;

  const canonical = `https://www.insurancenyou.com/medicare/${fullId}`;
  return {
    title,
    description: desc,
    alternates: { canonical },
    openGraph: { title, description: desc, url: canonical, type: "website" },
    twitter: { card: "summary_large_image", title, description: desc },
  };
}

// ────────────────────── Rendering helpers ──────────────────────

const UNKNOWN = new Set([
  "",
  "not specified",
  "not covered",
  "unknown",
  "n/a",
  "none",
  "—",
  "-",
]);

function isKnown(v: string | null | undefined): boolean {
  return !UNKNOWN.has(String(v || "").trim().toLowerCase());
}

function formatPhoneOrUrl(value: string): React.ReactNode {
  const s = String(value || "").trim();
  const digits = s.replace(/[^0-9]/g, "");
  if (/^\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}$/.test(s.replace(/\s/g, "")) && digits.length === 10) {
    return <a href={`tel:1${digits}`}>{s}</a>;
  }
  if (/^(https?:\/\/|www\.)/i.test(s) || /\.(com|org|net|gov|io|co)/i.test(s)) {
    const href = s.startsWith("http") ? s : `https://${s}`;
    return <a href={href} target="_blank" rel="noopener">{s}</a>;
  }
  return s;
}

function StarRow({ rating }: { rating: number }) {
  const filled = Math.floor(rating);
  const half = rating - filled >= 0.25 && rating - filled < 0.75;
  const empty = 5 - filled - (half ? 1 : 0);
  const hid = `hg-${rating.toString().replace(".", "-")}`;
  return (
    <div className="star-row">
      {Array.from({ length: filled }).map((_, i) => (
        <svg key={`f${i}`} className="star" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 .587l3.668 7.568L24 9.75l-6 5.848 1.416 8.252L12 19.771l-7.416 4.079L6 15.598 0 9.75l8.332-1.595z" />
        </svg>
      ))}
      {half && (
        <svg className="star" viewBox="0 0 24 24">
          <defs>
            <linearGradient id={hid}>
              <stop offset="50%" stopColor="#facc15" />
              <stop offset="50%" stopColor="#e4e4e7" />
            </linearGradient>
          </defs>
          <path
            fill={`url(#${hid})`}
            d="M12 .587l3.668 7.568L24 9.75l-6 5.848 1.416 8.252L12 19.771l-7.416 4.079L6 15.598 0 9.75l8.332-1.595z"
          />
        </svg>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <svg
          key={`e${i}`}
          className="star"
          style={{ color: "#e4e4e7" }}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 .587l3.668 7.568L24 9.75l-6 5.848 1.416 8.252L12 19.771l-7.416 4.079L6 15.598 0 9.75l8.332-1.595z" />
        </svg>
      ))}
    </div>
  );
}

// Lucide-derived icon library
const IC = {
  stethoscope: <path d="M11 2v2M5 2v2M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1M8 15a6 6 0 0 0 12 0v-3" />,
  heart: <><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" /></>,
  ambulance: <><path d="M10 10H6" /><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><path d="M8 8v4M9 18h6" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></>,
  zap: <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />,
  hospital: <><path d="M12 6v4M14 14h-4M14 18h-4M14 8h-4M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h2M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18" /></>,
  bag: <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18M16 10a4 4 0 0 1-8 0" /></>,
  tooth: <path d="M12 5.5c-1.5-2-4-2-5.5-1.5C5 4.5 4 5.5 4 7.5c0 1.5.5 2.5 1 4l1 4c.5 1.5 1 3 2 3 .5 0 1-.5 1.5-2L10 14c.3-.8.7-1 1-1h2c.3 0 .7.2 1 1l.5 2.5c.5 1.5 1 2 1.5 2 1 0 1.5-1.5 2-3l1-4c.5-1.5 1-2.5 1-4 0-2-1-3-2.5-3.5-1.5-.5-4-.5-5.5 1.5z" />,
  eye: <><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></>,
  ear: <><path d="M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0" /><path d="M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 1 0 4" /></>,
  phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />,
  pill: <><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" /><path d="m8.5 8.5 7 7" /></>,
  gift: <><path d="M15 11h.01M11 15h.01M16 16h.01" /><path d="m2 16 20 6-6-20A20 20 0 0 0 2 16" /><path d="M5.71 17.11a17.04 17.04 0 0 1 11.4-11.4" /></>,
  calendar: <><path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></>,
  home: <><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" /><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
  clock: <><path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0" /><path d="M12 3v9l4.5 4.5" /></>,
  box: <><path d="M12 2v8" /><path d="m16 6-4 4-4-4" /><rect width="20" height="8" x="2" y="14" rx="2" /></>,
  globe: <><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4" /><path d="M9 13v.01M15 13v.01" /></>,
  doc: <><path d="M3 3h18v18H3z" /><path d="M7 7h10M7 12h10M7 17h7" /></>,
  pin: <><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></>,
  generic: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4" /><circle cx="12" cy="16" r=".5" fill="currentColor" /></>,
} as const;

function Icon({ name, size = 20 }: { name: keyof typeof IC; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {IC[name]}
    </svg>
  );
}

function iconFor(label: string): keyof typeof IC {
  const k = (label || "").toLowerCase();
  if (/pcp|primary care|doctor/.test(k)) return "stethoscope";
  if (/specialist/.test(k)) return "heart";
  if (/emergency|er\b|ambulance/.test(k)) return "ambulance";
  if (/urgent/.test(k)) return "zap";
  if (/inpatient|hospital/.test(k)) return "hospital";
  if (/otc|over.?the.?counter|allowance/.test(k)) return "bag";
  if (/dental|tooth/.test(k)) return "tooth";
  if (/vision|eye|eyewear/.test(k)) return "eye";
  if (/hearing|aid/.test(k)) return "ear";
  if (/phone|tty|member|prospective|contact/.test(k)) return "phone";
  if (/pharmacy/.test(k)) return "globe";
  if (/formulary|directory|website/.test(k)) return "doc";
  if (/drug|tier|rx|prescription/.test(k)) return "pill";
  if (/meal|transport|fitness|in.?home|bathroom|flex|ssbci|companion/.test(k)) return "gift";
  if (/snf|nursing|skilled/.test(k)) return "calendar";
  if (/home health/.test(k)) return "home";
  if (/dialysis|cardiac rehab/.test(k)) return "clock";
  if (/dme|equipment|diagnostic|imaging|lab/.test(k)) return "box";
  return "generic";
}

function dedupeResourceRows(rows: PlanRow[]): { label: string; value: string; alsoLabels: string[] }[] {
  const groups = new Map<string, { value: string; labels: string[] }>();
  for (const r of rows) {
    const key = (r.value || "").trim().toLowerCase();
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, { value: r.value, labels: [] });
    groups.get(key)!.labels.push(r.label);
  }
  return Array.from(groups.values()).map((g) => {
    const primary =
      g.labels.length === 1
        ? g.labels[0]
        : g.labels.find((l) => /website/i.test(l)) ||
          g.labels.find((l) => /member phone$/i.test(l) && !/local/i.test(l)) ||
          g.labels[0];
    return { label: primary, value: g.value, alsoLabels: g.labels.filter((l) => l !== primary) };
  });
}

const PROTECTED_SECTIONS = new Set([
  "Key Benefits",
  "Dental",
  "Vision",
  "Hearing",
  "Supplemental Benefits",
  "Prescription Drugs",
  "Plan Resources",
]);

function getSection(plan: PlanDetail, title: string): PlanSection | undefined {
  return plan.sections.find((s) => s.title === title);
}

// ────────────────────── Page Component ──────────────────────

export default async function PlanDetailPage({ params }: Params) {
  const { planId } = await params;
  const plan = loadPlan(planId);
  if (!plan) notFound();

  const fullId = plan.plan_id_full || planId;
  const premiumNum = parseFloat(String(plan.monthly_premium || "0").replace(/[^0-9.]/g, "")) || 0;
  const county = plan.counties_count === "1" ? "county" : "counties";

  const keyBenefits = getSection(plan, "Key Benefits");
  const dental = getSection(plan, "Dental");
  const vision = getSection(plan, "Vision");
  const hearing = getSection(plan, "Hearing");
  const supplemental = getSection(plan, "Supplemental Benefits");
  const rx = getSection(plan, "Prescription Drugs");
  const resources = getSection(plan, "Plan Resources");
  const dvhGroups = [
    { title: "Dental", icon: "tooth" as const, section: dental },
    { title: "Vision", icon: "eye" as const, section: vision },
    { title: "Hearing", icon: "ear" as const, section: hearing },
  ].filter((g) => g.section);
  const extraSections = plan.sections.filter((s) => !PROTECTED_SECTIONS.has(s.title));
  const resourceGroups = resources ? dedupeResourceRows(resources.rows) : [];

  return (
    <>
      <PlanJsonLd plan={plan} fullId={fullId} premiumNum={premiumNum} />

      <div className="topbar">
        <div className="topbar-inner">
          <Link href="/"><img src="/iny-assets/66d9ac23d3ad7bfd1bb1f3f9_insurance-color-logo.svg" alt="Insurance 'n You" className="logo-img" /></Link>
          <nav className="nav-links">
            <Link href="/medicare">Medicare</Link>
            <Link href="/under-65">Under 65</Link>
            <Link href="/life">Life</Link>
            <a href="https://www.insurancenyou.com/about">About</a>
            <a href="https://www.insurancenyou.com/contact">Contact</a>
          </nav>
          <div className="nav-cta">
            <a href="tel:18005555757" className="nav-phone">
              <Icon name="phone" size={14} />
              (800) 555-5757
            </a>
            <Link href="/medicare" className="btn btn-primary">Get a quote</Link>
          </div>
        </div>
      </div>

      <div className="crumb">
        <Link href="/">Home</Link><span className="sep">&rsaquo;</span>
        <Link href="/medicare">Medicare Plans</Link><span className="sep">&rsaquo;</span>
        {plan.states && (<><a href={`/medicare?state=${plan.states.split(",")[0].trim()}`}>{plan.states.split(",")[0].trim()}</a><span className="sep">&rsaquo;</span></>)}
        <span>{plan.plan_name}</span>
      </div>

      <div className="hero">
        <div className="hero-grid">
          <div>
            <h1 className="plan-name">{plan.plan_name}</h1>
            <div className="plan-sub">
              <span>{fullId}</span>
              {plan.snp_type && <span className="snp-badge">{plan.snp_type}</span>}
              <span className="dot">&middot;</span>
              <span>2026 plan year</span>
            </div>
            <div className="carrier">
              <img src={carrierLogo(plan.carrier)} alt={plan.carrier} className="carrier-logo" />
              <div className="carrier-text">
                <strong>{plan.carrier}</strong>
                <span>{plan.geographic_area} &middot; CMS PBP 2026</span>
              </div>
            </div>
            {plan.org_name && plan.org_name !== plan.carrier && (
              <div className="plan-meta-strip">
                <span>Offered by {plan.org_name}</span>
                {plan.states && <span>States: {plan.states}</span>}
              </div>
            )}
            {plan.star_rating_overall && (
              <>
                <div className="stars">
                  <StarRow rating={plan.star_rating_overall} />
                  <span className="star-text"><strong>{plan.star_rating_overall} / 5</strong> CMS Star Rating &middot; 2026</span>
                </div>
                {(plan.star_rating_part_c != null || plan.star_rating_part_d != null) && (
                  <div className="star-detail">
                    {plan.star_rating_part_c != null && <span>Part C (medical): <strong>{plan.star_rating_part_c} / 5</strong></span>}
                    {plan.star_rating_part_d != null && <span>Part D (drugs): <strong>{plan.star_rating_part_d} / 5</strong></span>}
                  </div>
                )}
              </>
            )}
            <p className="hero-blurb">
              A <strong>{premiumNum === 0 ? "$0-premium" : `${plan.monthly_premium}/month`}</strong> Medicare Advantage {plan.plan_type} plan covering{" "}
              <strong>{plan.counties_count} {county}</strong> in {plan.geographic_area}. Offered by {plan.carrier}.
            </p>
            <div className="hero-cta-row">
              <a href="tel:18005555757" className="btn btn-primary btn-lg">
                <Icon name="phone" size={16} />
                Talk to a licensed agent
              </a>
              <a href="#drugs" className="btn btn-outline btn-lg">View plan documents</a>
            </div>
          </div>
          <aside className="price-card">
            <div className="price-label">Monthly Premium</div>
            <div className="price-amount">{plan.monthly_premium || "$0"}</div>
            <div className="price-period">per month, in addition to your Part B premium</div>
            <div className="price-divider"></div>
            <div className="price-mini"><span className="price-mini-label">Annual deductible (medical)</span><span className="price-mini-val">{plan.annual_deductible_in || "$0"}</span></div>
            <div className="price-mini"><span className="price-mini-label">Drug deductible</span><span className="price-mini-val">{plan.drug_deductible || "—"}</span></div>
            <div className="price-mini"><span className="price-mini-label">Out-of-pocket max (in-network)</span><span className="price-mini-val">{isKnown(plan.moop_in) ? plan.moop_in : "—"}</span></div>
            {isKnown(plan.moop_out) && <div className="price-mini"><span className="price-mini-label">Out-of-network max</span><span className="price-mini-val">{plan.moop_out}</span></div>}
            {isKnown(plan.moop_combined) && <div className="price-mini"><span className="price-mini-label">Combined max (in+out)</span><span className="price-mini-val">{plan.moop_combined}</span></div>}
            {isKnown(plan.part_b_premium_reduction as string) && <div className="price-mini"><span className="price-mini-label" style={{ color: "var(--green-dark)", fontWeight: 600 }}>Part B giveback</span><span className="price-mini-val" style={{ color: "var(--green-dark)" }}>{plan.part_b_premium_reduction}</span></div>}
            <div className="price-mini"><span className="price-mini-label">Plan type</span><span className="price-mini-val">{plan.plan_type}</span></div>
            <div className="price-mini"><span className="price-mini-label">Contract #</span><span className="price-mini-val">{plan.contract_number}</span></div>
            <a href="tel:18005555757" className="btn btn-primary">Talk to agent</a>
            <div className="price-phone">or call <a href="tel:18005555757">(800) 555-5757</a></div>
            <div className="price-trust">
              <Icon name="stethoscope" size={14} />
              Licensed in all 50 states &middot; No cost, no obligation
            </div>
          </aside>
        </div>
      </div>

      <div className="secnav">
        <div className="secnav-inner">
          {keyBenefits && <a href="#benefits">Coverage</a>}
          {dvhGroups.length > 0 && <a href="#extras">Dental &middot; Vision &middot; Hearing</a>}
          {supplemental && <a href="#supplemental">Supplemental</a>}
          {extraSections.length > 0 && <a href="#medical-care">Medical Care</a>}
          {rx && <a href="#drugs">Prescription Drugs</a>}
          {plan.geographic_area && <a href="#area">Service Area</a>}
          {resources && <a href="#resources">Resources</a>}
        </div>
      </div>

      <div className="stage">
        <div className="stage-glow"></div>
        <div className="container">
          <div className="panel">
            <div className="panel-inner">

              {keyBenefits && (
                <section id="benefits">
                  <div className="sec-head">
                    <div className="sec-eyebrow">Key Benefits</div>
                    <h2 className="sec-title">Coverage at a glance</h2>
                    <p className="sec-sub">Your costs for the everyday medical services you use most.</p>
                  </div>
                  <div className="benefit-grid">
                    {keyBenefits.rows.map((r, i) => (
                      <div key={i} className="benefit">
                        <div className="benefit-icon"><Icon name={iconFor(r.label)} size={22} /></div>
                        <div className="benefit-label">{r.label}</div>
                        <div className="benefit-value">{r.value}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {dvhGroups.length > 0 && (
                <section id="extras">
                  <div className="sec-head">
                    <div className="sec-eyebrow">Extras</div>
                    <h2 className="sec-title">Dental, vision &amp; hearing</h2>
                    <p className="sec-sub">Routine care that Original Medicare doesn&rsquo;t cover — included in this plan.</p>
                  </div>
                  <div className="dvh">
                    {dvhGroups.map((g) => (
                      <div key={g.title} className="dvh-card">
                        <div className="dvh-icon"><Icon name={g.icon} size={28} /></div>
                        <div className="dvh-title">{g.title}</div>
                        {g.section!.rows.map((r, i) => (
                          <div key={i} className="dvh-row">
                            <span className="dvh-row-label">{r.label}</span>
                            <span className="dvh-row-val">{r.value}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {supplemental && (
                <section id="supplemental">
                  <div className="sec-head">
                    <div className="sec-eyebrow">Supplemental Benefits</div>
                    <h2 className="sec-title">Beyond the basics</h2>
                  </div>
                  <div className="svc-list">
                    {supplemental.rows.map((r, i) => (
                      <div key={i} className="svc-row">
                        <span className="svc-label">
                          <span className="svc-label-icon"><Icon name={iconFor(r.label)} size={14} /></span>
                          {r.label}
                        </span>
                        <span className="svc-val">{r.value}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {extraSections.length > 0 && (
                <div id="medical-care">
                  {extraSections.map((s, idx) => (
                    <section key={idx} style={{ padding: "26px 0", borderTop: "1px solid rgba(80,11,126,.14)" }}>
                      <div className="sec-head">
                        <div className="sec-eyebrow">Medical Care</div>
                        <h2 className="sec-title">{s.title}</h2>
                      </div>
                      <div className="svc-list">
                        {s.rows.map((r, i) => (
                          <div key={i} className="svc-row">
                            <span className="svc-label">
                              <span className="svc-label-icon"><Icon name={iconFor(r.label)} size={14} /></span>
                              {r.label}
                            </span>
                            <span className="svc-val">{r.value}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}

              {rx && (
                <section id="drugs">
                  <div className="sec-head">
                    <div className="sec-eyebrow">Prescription Drugs</div>
                    <h2 className="sec-title">Drug tier costs</h2>
                    <p className="sec-sub">Your share after the annual drug deductible. 30-day standard retail.</p>
                  </div>
                  <div className="tier-table">
                    <div className="tier-row tier-row-head">
                      <div></div>
                      <div>Drug Tier</div>
                      <div style={{ textAlign: "right" }}>Your cost</div>
                    </div>
                    {(() => {
                      let tierNum = 0;
                      return rx.rows.map((r, i) => {
                        const isTier = /tier\s*\d/i.test(r.label);
                        if (!isTier) {
                          return (
                            <div key={i} className="tier-row" style={{ gridTemplateColumns: "1fr 140px", padding: "11px 20px" }}>
                              <div style={{ fontWeight: 500, color: "var(--grey)" }}>{r.label}</div>
                              <div className="tier-cost" style={{ fontSize: 15 }}>{r.value}</div>
                            </div>
                          );
                        }
                        tierNum++;
                        const tierN = Math.min(tierNum, 5);
                        return (
                          <div key={i} className="tier-row">
                            <div className={`tier-badge tier-${tierN}`}>{tierNum}</div>
                            <div>
                              <div className="tier-name">{r.label.replace(/^tier\s*\d+:\s*/i, "")}</div>
                            </div>
                            <div className="tier-cost">{r.value}</div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </section>
              )}

              {plan.geographic_area && (
                <section id="area">
                  <div className="sec-head">
                    <div className="sec-eyebrow">Service Area</div>
                    <h2 className="sec-title">Where this plan is offered</h2>
                  </div>
                  <div className="coverage">
                    <div className="coverage-icon"><Icon name="pin" size={26} /></div>
                    <div className="coverage-text">
                      <strong>{plan.geographic_area}{plan.states ? `, ${plan.states}` : ""}</strong>
                      <span>Available in {plan.counties_count} {county}. Enter your ZIP code on the quote tool to confirm eligibility.</span>
                    </div>
                  </div>
                </section>
              )}

              {resources && (
                <section id="resources">
                  <div className="sec-head">
                    <div className="sec-eyebrow">Plan Resources</div>
                    <h2 className="sec-title">Member contacts &amp; documents</h2>
                  </div>
                  <div className="res-grid">
                    {resourceGroups.map((g, i) => (
                      <div key={i} className="res-card">
                        <div className="res-card-left">
                          <div className="res-icon"><Icon name={iconFor(g.label)} size={20} /></div>
                          <div>
                            <div className="res-label">{g.label}</div>
                            <div className="res-val">{formatPhoneOrUrl(g.value)}</div>
                            {g.alsoLabels.length > 0 && (
                              <div style={{ fontSize: 11, color: "var(--grey)", marginTop: 3 }}>
                                Also: {g.alsoLabels.join(", ")}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            </div>
          </div>

          <div className="stage-extras">
            <div className="carrier-strip">
              <div className="carrier-strip-title">We compare plans from leading carriers</div>
              <div className="carrier-strip-logos">
                <img src="/iny-assets/686ca346512989d46c5a4bde_united-healthcare-logo.png" alt="UnitedHealthcare" />
                <img src="/iny-assets/686ca2e94240dceeb15cc4a6_aetna-logo.png" alt="Aetna" />
                <img src="/iny-assets/686ca2e9c1983907047fdbeb_cigna-logo.png" alt="Cigna" />
                <img src="/iny-assets/686ca2e95331866c95b9b4f5_kaiser-logo.png" alt="Kaiser" />
                <img src="/iny-assets/686ca2e914dd244075093f85_oscar-logo.png" alt="Oscar" />
                <img src="/iny-assets/686ca2e9cd721ab886e5ff3b_ambetter-logo.png" alt="Ambetter" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="end-zone">
        <div className="container">
          <div className="end-cta">
            <div className="end-eyebrow">Ready to enroll?</div>
            <h3 className="end-title">Talk to a licensed Insurance &apos;n You agent</h3>
            <p className="end-sub">No cost, no pressure. Our team will walk you through this plan and any others available in your ZIP code.</p>
            <div className="end-actions">
              <a href="tel:18005555757" className="btn btn-primary btn-xl">
                <Icon name="phone" size={18} />
                Call (800) 555-5757
              </a>
              <Link href="/medicare" className="btn btn-outline-light btn-xl">Schedule a callback</Link>
            </div>
          </div>
        </div>
      </div>

      <footer>
        <div className="container">
          <div className="foot-grid">
            <div className="foot-col">
              <img src="/iny-assets/66d9ac23d3ad7bfd1bb1f3f9_insurance-color-logo.svg" alt="Insurance 'n You" className="foot-logo" />
              <p style={{ margin: 0, maxWidth: 340, lineHeight: 1.6 }}>Independent insurance agency helping Americans navigate Medicare, ACA Marketplace, and Life Insurance.</p>
              <div className="foot-trust">
                <img src="/iny-assets/671a19056beae4e96a698410_bbb-logo.png" alt="BBB Accredited" />
                <img src="/iny-assets/66dad422292c6e739325cc4a_ssl_1.svg" alt="SSL Secured" />
              </div>
            </div>
            <div className="foot-col">
              <h4>Plans</h4>
              <Link href="/medicare">Medicare Advantage</Link>
              <Link href="/medicare">Medicare Supplement</Link>
              <Link href="/medicare">Part D</Link>
              <Link href="/under-65">Under 65</Link>
              <Link href="/life">Life Insurance</Link>
            </div>
            <div className="foot-col">
              <h4>Resources</h4>
              <Link href="/medicare">Browse all plans</Link>
              <Link href="/medicare">Compare plans</Link>
              <a href="https://www.insurancenyou.com/blog">Blog</a>
            </div>
            <div className="foot-col">
              <h4>Contact</h4>
              <a href="tel:18005555757">(800) 555-5757</a>
              <a href="https://www.insurancenyou.com/contact">Schedule a call</a>
              <a href="https://www.insurancenyou.com/about">About us</a>
              <a href="https://www.insurancenyou.com/privacy">Privacy</a>
            </div>
          </div>
          <div className="foot-disclaimer">
            <p style={{ marginBottom: 12 }}>
              <strong>If you need help, please call 1-844-216-3636. TTY users 711. Mon–Fri: 8am–7pm ET</strong> for licensed insurance agents who can assist with finding information on available Medicare Advantage, Medicare Supplement Insurance, and Prescription Drug Plans.
            </p>
            <p style={{ marginBottom: 10 }}>
              We do not offer every plan available in your area. Please contact Medicare.gov, 1-800-MEDICARE, or your local State Health Insurance Program (SHIP) to get information on all of your options. Not all plans offer all of these benefits. Benefits may vary by carrier and location. Limitations and exclusions may apply.
            </p>
            <p style={{ marginBottom: 10 }}>
              A benefits advisor is a licensed insurance agent. * Depending on service provided. See Summary of Benefits for more details.
            </p>
            <p style={{ marginBottom: 10 }}>
              <strong>Insurance Ad — No Government Affiliation.</strong> This ad is not from the government. It&rsquo;s from Insurance &apos;n You, an independent Medicare insurance agency selling plans from many insurance companies. The Medicare plans represented are PDP, HMO, PPO, or PFFS plans with a Medicare contract. Enrollment in plans depends on contract renewal. Enrollment in a plan may be limited to certain times. Eligibility may require a Special or Initial Enrollment Period. Insurance &apos;n You and Medicare supplement insurance plans are not connected with or endorsed by the U.S. government or the federal Medicare program.
            </p>
            <p style={{ marginBottom: 10 }}>
              By initiating a chat or scheduling a call, you are agreeing to be contacted by a licensed sales agent by email, text message or phone call (including by autodialer or prerecorded/artificial voice) to discuss information about Medicare plans. This is a solicitation for insurance. Standard messaging rates apply.
            </p>
            <p style={{ marginBottom: 10 }}>
              Benefits shown are for the 2026 plan year. Not all plans offer all benefits mentioned. Benefits may vary by carrier and location. Deductibles, copays, and coinsurance may apply. Limitations and exclusions may apply. $0 premium plans are not available in all areas. You must continue to pay your Part B premium.
            </p>
            <p style={{ marginBottom: 10 }}>
              Your information and use of this site is governed by our most recent <Link href="/terms">Terms of Use</Link> and <Link href="/privacy">Privacy Policy</Link>. Insurance &apos;n You is your independent Medicare insurance advisor.
            </p>
            <p>
              Benefit(s) mentioned may be part of a Special Supplemental Benefit for the Chronically Ill (SSBCI). You may qualify if you have one or more medically complex chronic conditions that are life-threatening or significantly limit your overall health or function, have a high risk of hospitalization, and require intensive care coordination to manage one or more of the following conditions: Chronic Heart Failure, Cardiovascular Disorders, Chronic Lung Disorders, Chronic Kidney Disease, or Diabetes. This is not a complete list of qualifying conditions. Having a qualifying condition alone does not mean you will receive the benefit(s). Other requirements may apply. Please refer to the Evidence of Coverage.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
