import PlanCardConceptA from "@/components/plan-card-concept-a";
import PlanCardConceptB from "@/components/plan-card-concept-b";
import PlanCardConceptC from "@/components/plan-card-concept-c";
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
    <div className="min-h-screen px-6 py-10 max-w-5xl mx-auto">
      <div className="mb-12">
        <h1 className="text-white text-3xl font-black tracking-tight">Card Redesign Concepts</h1>
        <p className="text-white/40 mt-2">Three condensed layouts inspired by healthcare.gov — pick your favourite.</p>
      </div>

      <Section
        label="Concept A — Two-Column Hero"
        sub="Big premium + deductible side-by-side · benefit rows on the right · footer with links + CTA"
      >
        {plans.map((p, i) => (
          <PlanCardConceptA
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
        label="Concept B — Compact Single Row"
        sub="Ultra-dense one-liner · tier accent bar · inline stats · price + enroll on the right"
      >
        {plans.map((p, i) => (
          <PlanCardConceptB
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
        label="Concept C — Modern Pill Stats"
        sub="Tier gradient accent · big price · pill-shaped stat chips · dark enroll button"
      >
        {plans.map((p, i) => (
          <PlanCardConceptC
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
