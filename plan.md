# Pocketwise implementation plan

## Product scope
Pocketwise is a mobile-first budgeting workspace for a ₹10,000 / 30-day scenario. The implementation prioritizes the dashboard, centralized financial calculations, decision simulator, transaction workflows, savings/commitments visibility, risk/forecast messaging, and a persistent full-stack foundation.

## Implementation approach
- **Frontend:** React + TypeScript + Vite with a single responsive dashboard shell. The UI uses local state for immediate demo interactions and localStorage for continuity between refreshes; authenticated tRPC procedures are available for durable user records.
- **Backend:** Express + tRPC using the starter's Manus OAuth session contract. Protected finance procedures enforce the authenticated user from the request context.
- **Data layer:** Drizzle/MySQL schema adds financial profiles, transactions, savings goals, commitments, and scenario history to the starter users table. Additive migrations and a seed/ensure flow provide the demo scenario without overwriting user edits.
- **Business logic:** `shared/finance.ts` is the single deterministic calculation engine. The UI simulator and server snapshot both use the same formulas for available balance, reserved commitments, discretionary allowance, forecast, risk, and health score.
- **Validation:** Zod input validation at the tRPC boundary, negative/zero amount guards in the UI and server, and Vitest coverage for the highest-risk calculation and simulator immutability behaviors.

## Project structure
- `client/src/pages/Home.tsx` — dashboard shell, simulator, transaction/goals/commitments sections, responsive states.
- `client/src/index.css` — Pocketwise visual system and responsive utilities.
- `shared/finance.ts` — money-safe integer arithmetic and derived financial state.
- `server/routers.ts` — auth and protected finance API procedures.
- `server/db.ts` — Drizzle connection and user-scoped finance queries/mutations.
- `drizzle/schema.ts` + `drizzle/*.sql` — database models and additive migrations.
- `client/public/manus-routes.json` — page route manifest for the preview/published site.
- `README.md` — install, migrate, test, development, and deployment instructions.

## Design system
- **Design movement:** Editorial fintech / quiet luxury. Dense data feels calm and deliberate rather than noisy.
- **Core principles:** (1) one clear next action, (2) actual vs planned is always explicit, (3) meaningful numbers get breathing room, (4) warnings are direct but never alarmist.
- **Color philosophy:** ink navy grounds the product; mint/emerald signals control and progress; amber is reserved for decisions that need attention; coral/red is reserved for genuine downside. Warm paper surfaces keep the dashboard human and approachable.
- **Layout paradigm:** a left rail on wide screens and a stacked command bar on mobile, with an asymmetric main canvas: one large financial pulse card, a narrow decision rail, then activity and planning modules.
- **Signature elements:** the “pulse” balance card with a subtle contour grid, a vertical daily runway indicator, and a pale mint simulator comparison panel.
- **Interaction philosophy:** every action previews its effect before committing; confirmations use plain language and show the new balance. Empty states suggest the next useful action.
- **Animation:** short 160–220ms ease-out transitions for cards, progress bars and overlays; no looping decoration; simulator numbers animate only when a scenario changes.
- **Typography system:** Inter for UI/data and Fraunces for editorial display moments. Tabular numbers use font-variant-numeric for reliable scanning.
- **Brand essence:** “A calmer way to make your money last.” For students and early-career earners; different because it turns decisions into visible trade-offs. Personality: clear, grounded, quietly confident.
- **Brand voice:** headlines are direct (“Give your next rupee a job.”); CTAs are specific (“Run this purchase”); microcopy explains rather than judges (“This is a planning signal, not a credit score.”).
- **Wordmark/logo:** the Pocketwise mark is a compact rounded “P” formed from a wallet tab and a rising line, paired with a small emerald dot.
- **Signature brand color:** `#27C99A` mint — a confident, ownable signal for financial breathing room.

## Build workflow
1. Extend the schema and shared finance engine.
2. Wire protected tRPC finance procedures and additive migration.
3. Replace the starter example page with the responsive Pocketwise dashboard and simulator.
4. Add route metadata, theme switching, and operational documentation.
5. Run typecheck, unit tests, production build, and preview readiness checks.
6. Commit and push the verified implementation to the managed repository checkpoint.
