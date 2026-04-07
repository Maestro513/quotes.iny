# RX Cost Estimator — Design Spec

## Summary
Add medication cost estimation to the Medicare results page. Users add meds in the sidebar, each plan card shows estimated annual drug cost. Full simulation ported from conci-fresh's `drug_cost_engine.py`.

## Data
- `data/cms_benefits.db` (192MB SQLite) — tables: `formulary_drugs`, `beneficiary_cost`, `plan_formulary`
- RxNorm API (free, no key) — drug name → RXCUI resolution

## New API Routes

### `POST /api/medicare/drugs/autocomplete`
- Input: `{ query: string }`
- Proxies RxNorm `/drugs.json?name=<query>`
- Returns: `[{ name: string, rxcui: string }]`

### `POST /api/medicare/drugs/estimate`
- Input: `{ planIds: string[], drugs: [{ rxcui: string, name: string }] }`
- Per plan: look up each drug's tier + copay from SQLite, run 12-month simulation
- Returns: `{ estimates: Record<string, { annualCost: number, uncoveredDrugs: string[] }> }`

## New Files
- `lib/medicare/drug-cost-engine.ts` — port of conci-fresh `drug_cost_engine.py` (292 lines)
- `lib/medicare/cms-db.ts` — SQLite wrapper for formulary/cost lookups
- `app/api/medicare/drugs/autocomplete/route.ts`
- `app/api/medicare/drugs/estimate/route.ts`
- `components/medication-input.tsx` — sidebar autocomplete + chip list

## Modified Files
- `app/medicare/page.tsx` — medication state, sidebar section, pass estimates to cards
- `components/medicare-plan-card.tsx` — display "Est. Annual Drug Cost: $X,XXX"
- `types/medicare.ts` — drug estimate types

## Drug Cost Engine (TypeScript)
Port of `drug_cost_engine.py` — 12-month simulation:
- Deductible phase → Initial Coverage → Catastrophic ($0 after $2k TrOOP)
- Insulin $35/month cap (IRA)
- Tier-specific deductible application
- Copay + coinsurance with cost caps
- Constants: CATASTROPHIC_TROOP = $2,000, INSULIN_CAP = $35, STANDARD_DEDUCTIBLE = $565

## Frontend Flow
1. Sidebar: "My Medications" section with autocomplete input
2. Selected drugs shown as removable chips
3. On add/remove → POST estimate endpoint with current planIds + drugs
4. Cards show annual estimate, uncovered drugs flagged
5. New sort option: "Lowest Drug Cost"

## Reference Source
- Engine: `conci-fresh/backend/app/drug_cost_engine.py`
- DB queries: `conci-fresh/backend/app/cms_lookup.py`
- SQLite: `conci/backend/cms_benefits.db`
