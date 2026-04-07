# Insurance 'n You — Quotes App

Insurance plan comparison tool for Insurance 'n You. Consumers search by ZIP/demographics and browse Under 65 (ACA Marketplace), Medicare Advantage, and Life Insurance plans.

## Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript 5
- **Styling**: Tailwind CSS 4, IBM Plex Sans font
- **Bundling**: React Compiler enabled (`reactCompiler: true` in next.config.ts)
- **Testing**: Jest 30 + Testing Library
- **Deployment**: Vercel

## Architecture

```
app/
  page.tsx              # Redirects → /under-65
  under-65/page.tsx     # ACA Marketplace plans (client-side filter/sort/paginate)
  medicare/page.tsx     # Medicare plans (client-side filter/sort, Load More display)
  life/page.tsx         # Life insurance (feature-flagged, not yet live)
  card-preview/page.tsx # Dev: plan card design preview
  chip-preview/page.tsx # Dev: chip/badge design preview
  api/
    under65/
      plans/route.ts    # POST → healthcare.gov CMS API (all pages fetched in parallel)
      coverage/route.ts # POST → doctor/drug coverage check
      providers/        # NPI provider autocomplete
      drugs/            # RxNorm drug autocomplete
    medicare/
      plans/route.ts    # GET → local CMS JSON first, Concierge fallback
components/             # Shared UI: plan cards, nav, pagination, skeleton, empty state
lib/
  params.ts             # URL search param parsing + income range mapping
  under65/adapter.ts    # Client-side fetch wrapper for U65 plans
  medicare/adapter.ts   # Client-side fetch wrapper for Medicare plans
  medicare/zip-lookup.ts # ZIP → plan number mapping from precomputed gzip data
  life/                 # Adapter + mock (not active)
types/                  # Strict TypeScript interfaces per product line
data/
  extracted_cms/        # 5,488 CMS PBP 2026 plan JSONs (full benefits, premiums, copays)
  backend_plans.json    # Plan ID list (used by precompute script)
  zip_backend_plans.json.gz  # Precomputed ZIP → plan numbers (gzipped)
scripts/
  precompute-zip-backend.js  # Builds zip_backend_plans.json.gz from backend_plans.json
  rebuild-zip-plans.py       # Python alternative for ZIP plan rebuild
```

## External APIs

| API | Used By | Auth |
|-----|---------|------|
| healthcare.gov Marketplace (`marketplace.api.healthcare.gov/api/v1`) | Under 65 plans | `MARKETPLACE_API_KEY` query param |
| healthcare.gov provider/drug lookup | Coverage search | `MARKETPLACE_API_KEY` |
| Med Concierge (`iny-concierge.onrender.com`) | Medicare fallback only | JWT via `CONCIERGE_EMAIL` / `CONCIERGE_PASSWORD` |

## Environment Variables

- `MARKETPLACE_API_KEY` — healthcare.gov CMS Marketplace API key (required for Under 65)
- `CONCIERGE_EMAIL` / `CONCIERGE_PASSWORD` — Med Concierge admin auth (fallback only, not required if CMS data covers all plans)
- `LIFE_API_ENABLED` — feature flag for Life Insurance page (`"true"` to enable)

## Key Patterns

- **Under 65**: API route fetches ALL plan pages from CMS Marketplace in parallel (CMS limits 10/page), returns full set. Client does filter/sort/paginate in `useMemo`.
- **Medicare**: API route does ZIP → plan numbers via `zip_backend_plans.json.gz`, then reads benefits from local `data/extracted_cms/` JSONs (5,488 CMS PBP 2026 files). Concierge is fallback only for plans missing locally. Client fetches all pages on load, then does filter/sort client-side in `useMemo` with "Load More" display (20 at a time via `visibleCount`).
- **CMS index**: Built lazily on first request — `readdirSync` scans `extracted_cms/`, extracts plan IDs from filenames (`{Name} HXXXX-XXX.json`), caches in a `Map`.
- **Coverage search** (U65 only): Doctor (NPI) and drug (RxCUI) autocomplete → bulk coverage check against loaded plan IDs.
- **All pages are client components** wrapped in `<Suspense>` (useSearchParams requires it).

## Design System

- **Background**: Deep purple `#3d1f5e` with `hero-lines.svg` overlay
- **Sidebar**: `#1e0f36` with glass blur (note: globals.css defines `--color-brand-sidebar: #2d1b4e` but pages use `#1e0f36` directly)
- **Accent/CTA**: Green `#22c55e`
- **Font**: IBM Plex Sans (300–700)
- **Cards**: Dark glass panels with white/opacity text hierarchy
- **Nav**: White bar, links to insurancenyou.com, "Features" dropdown for plan types

## Commands

```bash
npm run dev          # Next.js dev server
npm run build        # Production build
npm run lint         # ESLint
npm test             # Jest tests
```

## Rules

- Don't suggest framework migrations — this stack is intentional
- Respect the existing dark theme — all new UI uses the purple/green palette with white/opacity text
- Both Under 65 and Medicare use client-side filtering/sorting — full dataset loaded on search, filtered in `useMemo`
- Medicare plan data lives in `data/extracted_cms/` — do not add Concierge API calls for data that's already local
- Life insurance is behind `LIFE_API_ENABLED` — don't remove the flag
- Active card components: `plan-card.tsx` (Under 65), `medicare-plan-card.tsx` (Medicare). The concept-a/b/c and v1/v2/v3 variants are design iterations used only in `/card-preview`
- Run `npm run lint` before committing
