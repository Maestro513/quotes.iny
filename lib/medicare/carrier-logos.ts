/**
 * Maps CMS carrier name strings to static-served logo paths.
 * Several carrier-name variants (e.g. "Aetna" / "Aetna Medicare") collapse to
 * one logo file; the longest matching key wins.
 */
const CARRIER_LOGOS: Record<string, string> = {
  UnitedHealthcare: "/iny-assets/686ca346512989d46c5a4bde_united-healthcare-logo.png",
  Humana: "/iny-assets/carriers/humana.svg",
  "Aetna Medicare": "/iny-assets/686ca2e94240dceeb15cc4a6_aetna-logo.png",
  Aetna: "/iny-assets/686ca2e94240dceeb15cc4a6_aetna-logo.png",
  "Devoted Health": "/iny-assets/carriers/devoted-health.png",
  Wellcare: "/iny-assets/carriers/wellcare.png",
  "Kaiser Permanente": "/iny-assets/66f4327316fec6735d04268f_kaiser.svg",
  "Anthem Blue Cross and Blue Shield": "/iny-assets/carriers/anthem-bcbs.png",
  "Anthem Blue Cross": "/iny-assets/carriers/anthem-bcbs.png",
  "Anthem HealthKeepers": "/iny-assets/carriers/anthem-bcbs.png",
  "Anthem Blue Cross Partnership Plan": "/iny-assets/carriers/anthem-bcbs.png",
  "Cigna Healthcare": "/iny-assets/686ca2e9c1983907047fdbeb_cigna-logo.png",
  Cigna: "/iny-assets/686ca2e9c1983907047fdbeb_cigna-logo.png",
  "SCAN Health Plan": "/iny-assets/carriers/scan-health.png",
  "Alignment Health Plan": "/iny-assets/carriers/alignment-health.png",
  Wellpoint: "/iny-assets/carriers/wellpoint.png",
  "Highmark Blue Cross Blue Shield or Highmark Blue Shield": "/iny-assets/carriers/highmark.jpg",
  "Simply Healthcare Plans, Inc.": "/iny-assets/carriers/simply-healthcare.svg",
  "Florida Blue": "/iny-assets/carriers/florida-blue.png",
  "Florida Blue HMO": "/iny-assets/carriers/florida-blue.png",
  "Independence Blue Cross": "/iny-assets/carriers/independence-blue.png",
  "Clover Health": "/iny-assets/carriers/clover-health.jpg",
  "Excellus Health Plan, Inc": "/iny-assets/carriers/excellus.png",
  "BlueCross BlueShield of Tennessee": "/iny-assets/carriers/bcbs-tennessee.svg",

  // ACA / under-65 carriers (also appear on some Medicare lines)
  "Oscar Insurance Company": "/iny-assets/686ca2e914dd244075093f85_oscar-logo.png",
  "Oscar Health": "/iny-assets/686ca2e914dd244075093f85_oscar-logo.png",
  Oscar: "/iny-assets/686ca2e914dd244075093f85_oscar-logo.png",
  Ambetter: "/iny-assets/686ca2e9cd721ab886e5ff3b_ambetter-logo.png",
  "Ambetter from Sunshine Health": "/iny-assets/686ca2e9cd721ab886e5ff3b_ambetter-logo.png",
  "Ambetter Health": "/iny-assets/686ca2e9cd721ab886e5ff3b_ambetter-logo.png",
  Centene: "/iny-assets/carriers/centene.jpg",
  "CVS Health": "/iny-assets/carriers/cvs-aetna.png",
  "Aetna CVS Health": "/iny-assets/carriers/cvs-aetna.png",
  "Elevance Health": "/iny-assets/carriers/elevance-health.jpg",
  EmblemHealth: "/iny-assets/carriers/emblem-health.png",
  "Emblem Health": "/iny-assets/carriers/emblem-health.png",
  "Molina Healthcare": "/iny-assets/carriers/molina-healthcare.png",
  Molina: "/iny-assets/carriers/molina-healthcare.png",
  "Mutual of Omaha": "/iny-assets/carriers/mutual-of-omaha.png",
  "AARP Medicare": "/iny-assets/carriers/aarp-medicare.png",
  AARP: "/iny-assets/carriers/aarp-medicare.png",
  "Health First Health Plans": "/iny-assets/carriers/health-first-ny.png",
  "Healthfirst": "/iny-assets/carriers/health-first-ny.png",
};

const FALLBACK = "/iny-assets/carriers/bcbs-association.png";

/**
 * Resolve a carrier name to a logo path. Picks the longest matching key so
 * "Aetna Medicare" wins over "Aetna".
 */
export function carrierLogo(carrier: string | undefined | null): string {
  if (!carrier) return FALLBACK;
  if (CARRIER_LOGOS[carrier]) return CARRIER_LOGOS[carrier];
  // Fuzzy fallback: find the longest key that's a case-insensitive substring
  const lc = carrier.toLowerCase();
  let best = "";
  for (const key of Object.keys(CARRIER_LOGOS)) {
    if (lc.includes(key.toLowerCase()) && key.length > best.length) best = key;
  }
  return best ? CARRIER_LOGOS[best] : FALLBACK;
}
