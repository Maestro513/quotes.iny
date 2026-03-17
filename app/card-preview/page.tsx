import PlanCardV1 from "@/components/plan-card-v1";
import PlanCardV2 from "@/components/plan-card-v2";
import PlanCardV3 from "@/components/plan-card-v3";
import { mockUnder65Plans } from "@/lib/under65/mock";

const plans = mockUnder65Plans.slice(0, 3);

function Section({ label, sub, children }: { label: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="mb-16">
      <div className="mb-6">
        <h2 className="text-white text-xl font-bold">{label}</h2>
        <p className="text-white/40 text-sm mt-1">{sub}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default function CardPreviewPage() {
  return (
    <div className="min-h-screen px-6 py-10 max-w-4xl mx-auto">
      <div className="mb-12">
        <h1 className="text-white text-3xl font-black tracking-tight">Card Layout Concepts</h1>
        <p className="text-white/40 mt-2">Pick your favourite — we'll roll it out to the live results page.</p>
      </div>

      <Section
        label="V1 — Minimal Scorecard"
        sub="White frosted card · single lavender stat strip · clean & modern"
      >
        {plans.map((p, i) => (
          <PlanCardV1
            key={p.id}
            isFeatured={i === 0}
            planName={p.name}
            carrier={p.carrier}
            metalTier={p.metalTier}
            planType={p.planType}
            hsaEligible={p.hsaEligible}
            monthlyPremium={p.netPremium}
            estimatedSubsidy={p.estimatedSubsidy}
            deductible={p.deductible}
            outOfPocketMax={p.outOfPocketMax}
            benefits={p.benefits}
          />
        ))}
      </Section>

      <Section
        label="V2 — Bold Split Panel"
        sub="Dark accent left panel (tier + price) · white right panel with benefit grid"
      >
        {plans.map((p, i) => (
          <PlanCardV2
            key={p.id}
            isFeatured={i === 0}
            planName={p.name}
            carrier={p.carrier}
            metalTier={p.metalTier}
            planType={p.planType}
            hsaEligible={p.hsaEligible}
            monthlyPremium={p.netPremium}
            estimatedSubsidy={p.estimatedSubsidy}
            deductible={p.deductible}
            outOfPocketMax={p.outOfPocketMax}
            benefits={p.benefits}
          />
        ))}
      </Section>

      <Section
        label="V3 — Compact Data Row"
        sub="Dense single-line header · inline enroll button · full-width stat bar below"
      >
        {plans.map((p, i) => (
          <PlanCardV3
            key={p.id}
            isFeatured={i === 0}
            planName={p.name}
            carrier={p.carrier}
            metalTier={p.metalTier}
            planType={p.planType}
            hsaEligible={p.hsaEligible}
            monthlyPremium={p.netPremium}
            estimatedSubsidy={p.estimatedSubsidy}
            deductible={p.deductible}
            outOfPocketMax={p.outOfPocketMax}
            benefits={p.benefits}
          />
        ))}
      </Section>
    </div>
  );
}
