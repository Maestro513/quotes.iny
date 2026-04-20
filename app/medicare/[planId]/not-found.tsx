import Link from "next/link";
import "./plan-detail.css";

export default function PlanNotFound() {
  return (
    <>
      <div className="topbar">
        <div className="topbar-inner">
          <Link href="/"><img src="/iny-assets/66d9ac23d3ad7bfd1bb1f3f9_insurance-color-logo.svg" alt="Insurance 'n You" className="logo-img" /></Link>
          <nav className="nav-links">
            <Link href="/medicare">Medicare</Link>
            <Link href="/under-65">Under 65</Link>
            <Link href="/life">Life</Link>
          </nav>
          <div className="nav-cta">
            <a href="tel:18444676968" className="nav-phone">(844) 467-6968</a>
            <Link href="/medicare" className="btn btn-primary">Get a quote</Link>
          </div>
        </div>
      </div>
      <div className="end-zone" style={{ paddingTop: 80, paddingBottom: 80 }}>
        <div className="container" style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 44, fontWeight: 800, color: "var(--dark-violet)", marginBottom: 12 }}>Plan not found</h1>
          <p style={{ fontSize: 17, color: "var(--grey)", maxWidth: 560, margin: "0 auto 28px" }}>
            This plan ID doesn&rsquo;t match any Medicare Advantage plan in our 2026 library. It may have been retired, renamed, or never existed.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
            <Link href="/medicare" className="btn btn-primary btn-lg">Browse all plans</Link>
            <a href="tel:18444676968" className="btn btn-outline btn-lg">Talk to an agent</a>
          </div>
        </div>
      </div>
    </>
  );
}
