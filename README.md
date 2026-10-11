# Pocketwise

Pocketwise is a full-stack personal finance decision simulator for a ₹10,000 / 30-day budget. It is designed for students and young professionals who want to see how everyday choices affect their future flexibility.

## Stack

- React + TypeScript + Vite + Tailwind CSS + Recharts
- Node.js + Express + tRPC
- Drizzle ORM + managed MySQL-compatible database
- Manus OAuth application sessions
- Vitest for the calculation engine

## Local development

```bash
pnpm install
pnpm db:migrate
pnpm dev
```

The app listens on `PORT` (default `3000`). The managed environment supplies `DATABASE_URL`, Manus OAuth values, and `MANUS_JWT_SECRET`. For an external local database, provide a MySQL-compatible `DATABASE_URL` in `.env` based on `.env.example`.

## Database

Schema is defined in `drizzle/schema.ts`. After intentional schema edits, generate and apply an additive migration:

```bash
pnpm db:push
pnpm db:migrate
```

Development and published environments share the managed database, so do not run destructive DDL against it. The first authenticated finance snapshot creates the fictional demo profile only when the user has no profile yet.

## Checks

```bash
pnpm check
pnpm test
pnpm build
```

## API surface

The server exposes tRPC at `/api/trpc` and health at `/api/health`.

- `auth.me`, `auth.logout`
- `finance.demoSnapshot` — public deterministic preview state
- `finance.snapshot` — protected user-owned financial snapshot
- `finance.createTransaction`, `finance.deleteTransaction` — protected transaction mutations
- `finance.updateSettings`, `finance.createGoal`, `finance.createCommitment` — protected plan configuration mutations
- `finance.contributeToGoal`, `finance.payCommitment` — protected savings and commitment mutations
- `finance.evaluateScenario` — protected scenario evaluation
- `finance.confirmScenario` — protected atomic expense, income, bill, and savings confirmation mutation

All protected procedures resolve the user from the Manus OAuth session and scope records by `userId`.

## Deployment

The managed Webdev project uses the checked-in `Dockerfile`, `pnpm build`, and `/api/health`. Do not put database credentials or OAuth secrets in browser code. Pocketwise is an educational budgeting tool, not a bank, investment platform, credit score, or source of guaranteed financial advice.
