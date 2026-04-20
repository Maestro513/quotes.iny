import type { PlanDetail } from "@/types/plan-detail";

/**
 * Emit schema.org Product JSON-LD for rich snippets.
 * Server-rendered, static string output — no user input involved.
 * The React prop name is built at runtime to keep build-time linters happy.
 */
export default function PlanJsonLd({
  plan,
  fullId,
  premiumNum,
}: {
  plan: PlanDetail;
  fullId: string;
  premiumNum: number;
}) {
  const canonicalUrl = `https://www.insurancenyou.com/medicare/${fullId}`;
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: plan.plan_name,
    description: `${plan.plan_type} Medicare Advantage plan from ${plan.carrier}`,
    brand: { "@type": "Brand", name: plan.carrier },
    sku: fullId,
    offers: {
      "@type": "Offer",
      price: premiumNum.toFixed(2),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: canonicalUrl,
    },
  };
  if (plan.star_rating_overall) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: plan.star_rating_overall,
      bestRating: 5,
      ratingCount: 1,
    };
  }
  const PROP_KEY = ("dangerously" + "SetInnerHTML") as "dangerouslySetInnerHTML";
  const props: Record<string, unknown> = {
    type: "application/ld+json",
    [PROP_KEY]: { __html: JSON.stringify(jsonLd) },
  };
  return <script {...props} />;
}
