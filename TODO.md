# Pocketwise delivery checklist

## Core dashboard and calculations
- [ ] Show editable defaults: ₹10,000 starting budget, 30 days, ₹2,000 savings goal, ₹1,200 commitments, ₹1,500 emergency fund target, INR locale.
- [ ] Distinguish available balance, actual spending, reserved commitments, allocated savings, discretionary balance, and projected month-end balance.
- [ ] Recalculate daily allowance and discretionary allowance after expenses, income, savings allocation, commitment changes, and confirmed decisions.
- [ ] Display category breakdown, budget utilization, daily trend, actual-versus-planned labels, and a 30-day financial timeline.

## Decision simulator
- [ ] Simulate products, dining, trips, courses, subscriptions, medical expenses, entertainment, savings, income, and bills without mutating actual records.
- [ ] Compare before/after balance, allowance, savings progress, projection, health score, risk level, and a plain-language consequence summary.
- [ ] Compare multiple scenarios from one starting state and confirm only the selected scenario.

## Health, risk, forecast, insights
- [ ] Use a documented deterministic 0–100 educational health score with score change and factor explanations.
- [ ] Detect commitment shortfalls, unrealistic goals, fast spending, subscription load, large purchase threats, emergency reserve pressure, and negative projections.
- [ ] Include the data behind each warning, its consequence, and a calculated practical recommendation.
- [ ] Separate actual, planned, and estimated values in the month-end forecast and explain preliminary forecasts when history is sparse.

## Records and persistence
- [ ] Support income/expense transaction creation, edit, delete, categorization, descriptions, dates, filters, search, validation, and user ownership.
- [ ] Support multiple savings goals, contributions, target dates, progress and completion forecasts without double-counting.
- [ ] Support bills/subscriptions with frequency, dates, categories, active/cancelled status, cancellation simulation, and paid-bill deduplication.
- [ ] Persist confirmed records through the database migration and refresh, with server-side authorization.

## Quality and delivery
- [ ] Include loading, empty, error, success, validation and confirmation states; no placeholder buttons.
- [ ] Keep Manus OAuth session handling and user-owned records protected; do not collect bank passwords, PINs, or real bank connections.
- [ ] Run typecheck, unit tests, and production build; document environment setup, migration, API surface, local development, testing and deployment.
