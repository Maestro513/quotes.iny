/**
 * Maps CMS carrier name strings to static-served logo paths.
 * Several carrier-name variants (e.g. "Aetna" / "Aetna Medicare") collapse to
 * one logo file; the longest matching key wins (see carrierLogo below).
 *
 * For BCBS state variants (Montana, California, Minnesota, Louisiana, etc.)
 * a single generic "Blue Cross and Blue Shield" key catches all of them
 * via the fuzzy match — Anthem and BCBS Tennessee still win for their
 * specific naming because the longest-match rule picks the most specific key.
 */
const CARRIER_LOGOS: Record<string, string> = {
  // Top 10 (highest plan volume)
  UnitedHealthcare: "/iny-assets/carriers/united-healthcare.png",
  Humana: "/iny-assets/carriers/humana.png",
  "Aetna Medicare": "/iny-assets/carriers/aetna.png",
  Aetna: "/iny-assets/carriers/aetna.png",
  "Devoted Health": "/iny-assets/carriers/devoted-health.png",
  Wellcare: "/iny-assets/carriers/wellcare.png",
  "Kaiser Permanente": "/iny-assets/66f4327316fec6735d04268f_kaiser.svg",
  "Anthem Blue Cross and Blue Shield": "/iny-assets/carriers/anthem-bcbs.png",
  "Anthem Blue Cross": "/iny-assets/carriers/anthem-bcbs.png",
  "Anthem HealthKeepers": "/iny-assets/carriers/anthem-bcbs.png",
  "Anthem Blue Cross Partnership Plan": "/iny-assets/carriers/anthem-bcbs.png",
  "Alignment Health Plan": "/iny-assets/carriers/alignment-health.png",
  "SCAN Health Plan": "/iny-assets/carriers/scan-health.png",
  "Highmark Blue Cross Blue Shield or Highmark Blue Shield": "/iny-assets/carriers/highmark.png",
  Highmark: "/iny-assets/carriers/highmark.png",

  // Cigna family
  "Cigna Healthcare": "/iny-assets/686ca2e9c1983907047fdbeb_cigna-logo.png",
  Cigna: "/iny-assets/686ca2e9c1983907047fdbeb_cigna-logo.png",
  HealthSpring: "/iny-assets/carriers/healthspring.png",

  // Blue Cross / Blue Shield family — generic key handles state variants via fuzzy match
  "Blue Cross and Blue Shield": "/iny-assets/carriers/bcbs.png",
  "Blue Shield": "/iny-assets/carriers/bcbs.png",
  "BlueCross BlueShield of Tennessee": "/iny-assets/carriers/bcbs-tennessee.svg",
  "Florida Blue": "/iny-assets/carriers/florida-blue.png",
  "Florida Blue HMO": "/iny-assets/carriers/florida-blue.png",
  "Independence Blue Cross": "/iny-assets/carriers/independence-blue.png",
  "Capital Blue Cross": "/iny-assets/carriers/capital-blue.png",
  Wellpoint: "/iny-assets/carriers/wellpoint.png",

  // Regional carriers — new logo additions from 2026-05 batch
  "Baylor Scott & White Health Plan": "/iny-assets/carriers/baylor-scott-white.png",
  "CarePlus Health Plans, Inc.": "/iny-assets/carriers/careplus.png",
  CarePlus: "/iny-assets/carriers/careplus.png",
  "Essence Healthcare": "/iny-assets/carriers/essence-healthcare.png",
  "Freedom Health, Inc.": "/iny-assets/carriers/freedom-health.png",
  "Freedom Health": "/iny-assets/carriers/freedom-health.png",
  "HealthSun Health Plans, Inc.": "/iny-assets/carriers/healthsun.png",
  HealthSun: "/iny-assets/carriers/healthsun.png",
  // Tufts Health Plan rebranded under Point32Health (the parent org)
  "Tufts Health Plan": "/iny-assets/carriers/point32health.png",
  Point32Health: "/iny-assets/carriers/point32health.png",
  "Priority Health Medicare": "/iny-assets/carriers/priority-health.png",
  "Priority Health": "/iny-assets/carriers/priority-health.png",
  "Prominence Health Plan": "/iny-assets/carriers/prominence-health.png",
  "Quartz Medicare Advantage (HMO)": "/iny-assets/carriers/quartz.png",
  Quartz: "/iny-assets/carriers/quartz.png",
  "Solis Health Plans": "/iny-assets/carriers/solis.png",
  "UPMC for Life": "/iny-assets/carriers/upmc-for-life.png",
  UPMC: "/iny-assets/carriers/upmc-for-life.png",
  "Zing Health": "/iny-assets/carriers/zing-health.png",

  // Other existing entries
  "Simply Healthcare Plans, Inc.": "/iny-assets/carriers/simply-healthcare.svg",
  "Clover Health": "/iny-assets/carriers/clover-health.jpg",
  "Excellus Health Plan, Inc": "/iny-assets/carriers/excellus.png",
  "Molina Healthcare": "/iny-assets/carriers/molina-healthcare.png",
  Molina: "/iny-assets/carriers/molina-healthcare.png",
  "Mutual of Omaha": "/iny-assets/carriers/mutual-of-omaha.png",
  "AARP Medicare": "/iny-assets/carriers/aarp-medicare.png",
  AARP: "/iny-assets/carriers/aarp-medicare.png",
  "Health First Health Plans": "/iny-assets/carriers/health-first-ny.png",
  Healthfirst: "/iny-assets/carriers/health-first-ny.png",
  "CVS Health": "/iny-assets/carriers/cvs-aetna.png",
  "Aetna CVS Health": "/iny-assets/carriers/cvs-aetna.png",
  "Elevance Health": "/iny-assets/carriers/elevance-health.jpg",
  EmblemHealth: "/iny-assets/carriers/emblem-health.png",
  "Emblem Health": "/iny-assets/carriers/emblem-health.png",

  // ACA / under-65 carriers (also appear on some Medicare lines)
  "Oscar Insurance Company": "/iny-assets/686ca2e914dd244075093f85_oscar-logo.png",
  "Oscar Health": "/iny-assets/686ca2e914dd244075093f85_oscar-logo.png",
  Oscar: "/iny-assets/686ca2e914dd244075093f85_oscar-logo.png",
  Ambetter: "/iny-assets/686ca2e9cd721ab886e5ff3b_ambetter-logo.png",
  "Ambetter from Sunshine Health": "/iny-assets/686ca2e9cd721ab886e5ff3b_ambetter-logo.png",
  "Ambetter Health": "/iny-assets/686ca2e9cd721ab886e5ff3b_ambetter-logo.png",
  Centene: "/iny-assets/carriers/centene.jpg",
};

/**
 * Resolve a carrier name to a logo path. Picks the longest matching key so
 * "Aetna Medicare" wins over "Aetna".
 *
 * The match is BIDIRECTIONAL: the passed-in carrier may be either longer or
 * shorter than the dictionary key. "Devoted Health" matches "Devoted",
 * "DEVOTED" matches "Devoted Health", etc. Without bidirectional matching
 * the API's all-caps abbreviated carrier strings ("DEVOTED", "UHC") never
 * resolved.
 *
 * Returns `undefined` when no match is found — the caller should skip the
 * <img> entirely and rely on the carrier-name text. Avoids showing the wrong
 * carrier's logo as a fallback (which is more misleading than no logo).
 */
export function carrierLogo(carrier: string | undefined | null): string | undefined {
  if (!carrier) return undefined;
  if (CARRIER_LOGOS[carrier]) return CARRIER_LOGOS[carrier];
  const lc = carrier.toLowerCase().trim();
  let best = "";
  for (const key of Object.keys(CARRIER_LOGOS)) {
    const klc = key.toLowerCase();
    if ((lc.includes(klc) || klc.includes(lc)) && key.length > best.length) {
      best = key;
    }
  }
  return best ? CARRIER_LOGOS[best] : undefined;
}
