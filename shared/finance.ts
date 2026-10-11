export type TransactionKind = "expense" | "income" | "refund";
export type CommitmentKind = "bill" | "subscription";
export type RiskLevel = "Low Risk" | "Moderate Risk" | "High Risk";
export type HealthLabel = "Excellent" | "Healthy" | "Needs Attention" | "High Risk";

export type FinanceTransaction = {
  id: string | number;
  kind: TransactionKind;
  amount: number;
  category: string;
  description: string;
  date: string;
};

export type FinanceGoal = {
  id: string | number;
  name: string;
  targetAmount: number;
  currentSaved: number;
  targetDate: string;
  protected?: boolean;
};

export type FinanceCommitment = {
  id: string | number;
  name: string;
  amount: number;
  dueDate: string;
  kind: CommitmentKind;
  active?: boolean;
  paid?: boolean;
  category?: string;
};

export type FinanceInput = {
  startingBudget: number;
  startingBalance: number;
  durationDays: number;
  elapsedDays: number;
  emergencyFundTarget: number;
  expectedFutureIncome?: number;
  transactions: FinanceTransaction[];
  goals: FinanceGoal[];
  commitments: FinanceCommitment[];
  now?: string;
};

export type FinanceState = {
  incomeReceived: number;
  actualExpenses: number;
  availableBalance: number;
  reservedCommitments: number;
  allocatedSavings: number;
  remainingPlannedSavings: number;
  uncommittedBalance: number;
  remainingDays: number;
  dailyAllowance: number;
  discretionaryAllowance: number;
  savingsProgress: number;
  budgetUtilization: number;
  projectedMonthEndBalance: number;
  expectedFutureExpenses: number;
  healthScore: number;
  previousHealthScore: number;
  healthLabel: HealthLabel;
  riskLevel: RiskLevel;
  riskMessage: string;
  recommendations: string[];
  categoryTotals: Record<string, number>;
  trend: Array<{ day: string; actual: number; planned: number }>;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const toCents = (value: number) => Math.round((Number.isFinite(value) ? value : 0) * 100);
const positiveCents = (value: number) => Math.max(0, toCents(value));
const fromCents = (value: number) => Math.round(value) / 100;

export function calculateFinanceState(input: FinanceInput): FinanceState {
  const elapsedDays = clamp(Math.floor(input.elapsedDays), 0, Math.max(0, Math.floor(input.durationDays)));
  const remainingDays = Math.max(0, Math.floor(input.durationDays) - elapsedDays);
  const expectedFutureIncomeCents = positiveCents(input.expectedFutureIncome ?? 0);
  const incomeCents = input.transactions.filter(transaction => transaction.kind === "income").reduce((sum, transaction) => sum + positiveCents(transaction.amount), 0);
  const expenseCents = input.transactions.filter(transaction => transaction.kind === "expense").reduce((sum, transaction) => sum + positiveCents(transaction.amount), 0);
  const refundCents = input.transactions.filter(transaction => transaction.kind === "refund").reduce((sum, transaction) => sum + positiveCents(transaction.amount), 0);
  const netExpenseCents = Math.max(0, expenseCents - refundCents);
  const categoryCents = input.transactions.filter(transaction => transaction.kind === "expense").reduce<Record<string, number>>((totals, transaction) => {
    totals[transaction.category] = (totals[transaction.category] ?? 0) + positiveCents(transaction.amount);
    return totals;
  }, {});
  const allocatedSavingsCents = input.goals.reduce((sum, goal) => sum + positiveCents(goal.currentSaved), 0);
  const totalGoalTargetCents = input.goals.reduce((sum, goal) => sum + positiveCents(goal.targetAmount), 0);
  const remainingPlannedSavingsCents = input.goals.reduce((sum, goal) => sum + Math.max(0, positiveCents(goal.targetAmount) - positiveCents(goal.currentSaved)), 0);
  const reservedCommitmentCents = input.commitments.filter(commitment => commitment.active !== false && !commitment.paid).reduce((sum, commitment) => sum + positiveCents(commitment.amount), 0);
  const availableCents = toCents(input.startingBalance) + incomeCents - netExpenseCents - allocatedSavingsCents;
  const uncommittedCents = availableCents - reservedCommitmentCents - remainingPlannedSavingsCents;
  const divisor = Math.max(remainingDays, 1);
  const dailyAllowanceCents = availableCents > 0 ? Math.round(availableCents / divisor) : 0;
  const discretionaryAllowanceCents = Math.max(0, Math.round(uncommittedCents / divisor));
  const savingsProgress = totalGoalTargetCents > 0 ? clamp((allocatedSavingsCents / totalGoalTargetCents) * 100, 0, 100) : 0;
  const budgetUtilization = input.startingBudget > 0 ? clamp((netExpenseCents / Math.max(1, toCents(input.startingBudget))) * 100, 0, 999) : 0;
  const expectedFutureExpenseCents = elapsedDays > 0 ? Math.round((netExpenseCents / elapsedDays) * remainingDays) : 0;
  const projectedCents = availableCents + expectedFutureIncomeCents - expectedFutureExpenseCents - reservedCommitmentCents - remainingPlannedSavingsCents;
  const commitmentCoverage = reservedCommitmentCents > 0 ? availableCents / reservedCommitmentCents : 2;
  const paceRatio = input.startingBudget > 0 && elapsedDays > 0 ? (netExpenseCents / Math.max(1, toCents(input.startingBudget))) / (elapsedDays / Math.max(input.durationDays, 1)) : 0;
  const emergencyCoverage = input.emergencyFundTarget > 0 ? availableCents / Math.max(1, toCents(input.emergencyFundTarget)) : 2;

  let healthScore = 52;
  healthScore += clamp(commitmentCoverage * 12, 0, 18);
  healthScore += clamp(savingsProgress * 0.12, 0, 12);
  healthScore += clamp(emergencyCoverage * 7, 0, 10);
  healthScore += paceRatio <= 1 || elapsedDays === 0 ? 10 : clamp(10 - (paceRatio - 1) * 20, -10, 10);
  if (projectedCents < 0) healthScore -= 30;
  else if (projectedCents < toCents(input.emergencyFundTarget)) healthScore -= 10;
  if (uncommittedCents < 0) healthScore -= 15;
  const health = Math.round(clamp(healthScore, 0, 100));
  const healthLabel: HealthLabel = health >= 85 ? "Excellent" : health >= 70 ? "Healthy" : health >= 45 ? "Needs Attention" : "High Risk";

  let riskLevel: RiskLevel = "Low Risk";
  if (projectedCents < 0 || uncommittedCents < 0 || commitmentCoverage < 1) riskLevel = "High Risk";
  else if (projectedCents < toCents(input.emergencyFundTarget) || paceRatio > 1.15 || discretionaryAllowanceCents < toCents(input.startingBudget) / Math.max(input.durationDays, 1) * 0.5) riskLevel = "Moderate Risk";

  const shortfallCents = Math.max(0, -projectedCents);
  const dailyCut = remainingDays > 0 ? Math.ceil(shortfallCents / remainingDays / 100) : 0;
  const riskMessage = riskLevel === "High Risk"
    ? shortfallCents > 0
      ? `Your current pace could leave you ₹${Math.round(fromCents(shortfallCents)).toLocaleString("en-IN")} short before the month ends.`
      : `Your reserved commitments are ahead of the money currently available.`
    : riskLevel === "Moderate Risk"
      ? `Your plan is workable, but the next ₹${Math.round(fromCents(discretionaryAllowanceCents)).toLocaleString("en-IN")} per day needs a little more intention.`
      : `You have room for everyday spending while protecting your commitments.`;

  const recommendations = [
    remainingPlannedSavingsCents > 0 ? `Keep ₹${Math.round(fromCents(remainingPlannedSavingsCents)).toLocaleString("en-IN")} earmarked for your active goals.` : "Your active goals are fully funded for this plan.",
    reservedCommitmentCents > 0 ? `Reserve ₹${Math.round(fromCents(reservedCommitmentCents)).toLocaleString("en-IN")} for upcoming bills and subscriptions.` : "No unpaid commitments are currently reserved.",
    dailyCut > 0 ? `Reducing discretionary spending by about ₹${dailyCut.toLocaleString("en-IN")} per day would close the projected gap.` : `A ₹${Math.round(fromCents(discretionaryAllowanceCents)).toLocaleString("en-IN")} daily discretionary cap keeps the plan on track.`,
  ];

  const trend = Array.from({ length: Math.max(1, Math.min(input.durationDays, 7)) }, (_, index) => {
    const dayNumber = elapsedDays > 0 ? Math.max(1, elapsedDays - 6 + index) : index + 1;
    const dayLabel = `Day ${dayNumber}`;
    const actualCents = elapsedDays === 0 ? 0 : Math.round(netExpenseCents * (index + 1) / Math.max(1, Math.min(7, elapsedDays)));
    const plannedCents = Math.round(toCents(input.startingBudget) * dayNumber / Math.max(input.durationDays, 1));
    return { day: dayLabel, actual: fromCents(actualCents), planned: fromCents(plannedCents) };
  });

  return {
    incomeReceived: fromCents(incomeCents), actualExpenses: fromCents(netExpenseCents), availableBalance: fromCents(availableCents), reservedCommitments: fromCents(reservedCommitmentCents), allocatedSavings: fromCents(allocatedSavingsCents), remainingPlannedSavings: fromCents(remainingPlannedSavingsCents), uncommittedBalance: fromCents(uncommittedCents), remainingDays,
    dailyAllowance: fromCents(dailyAllowanceCents), discretionaryAllowance: fromCents(discretionaryAllowanceCents), savingsProgress: fromCents(toCents(savingsProgress)), budgetUtilization: fromCents(toCents(budgetUtilization)), projectedMonthEndBalance: fromCents(projectedCents), expectedFutureExpenses: fromCents(expectedFutureExpenseCents), healthScore: health, previousHealthScore: Math.max(0, health - 4), healthLabel, riskLevel, riskMessage, recommendations,
    categoryTotals: Object.fromEntries(Object.entries(categoryCents).map(([category, cents]) => [category, fromCents(cents)])), trend,
  };
}

export function applyScenario(input: FinanceInput, scenario: { kind: "expense" | "income" | "save" | "bill"; amount: number; category?: string; description?: string }): FinanceState {
  const transaction: FinanceTransaction = {
    id: "scenario",
    kind: scenario.kind === "income" ? "income" : "expense",
    amount: Math.max(0, scenario.amount),
    category: scenario.category ?? (scenario.kind === "save" ? "Savings" : "Other"),
    description: scenario.description ?? "What-if scenario",
    date: input.now ?? new Date().toISOString().slice(0, 10),
  };
  if (scenario.kind === "save") {
    return calculateFinanceState({
      ...input,
      goals: input.goals.map(goal => ({ ...goal, currentSaved: goal.currentSaved + scenario.amount })),
    });
  }
  if (scenario.kind === "bill") {
    return calculateFinanceState({
      ...input,
      commitments: input.commitments.map(commitment => commitment.name === scenario.description ? { ...commitment, paid: true } : commitment),
      transactions: [...input.transactions, { ...transaction, category: "Bills" }],
    });
  }
  return calculateFinanceState({ ...input, transactions: [...input.transactions, transaction] });
}

export function buildDemoInput(): FinanceInput {
  return {
    startingBudget: 10000,
    startingBalance: 10000,
    durationDays: 30,
    elapsedDays: 12,
    emergencyFundTarget: 1500,
    transactions: [],
    goals: [
      { id: "emergency", name: "Emergency cushion", targetAmount: 1500, currentSaved: 0, targetDate: "2026-10-30", protected: true },
      { id: "personal", name: "Personal savings", targetAmount: 500, currentSaved: 0, targetDate: "2026-10-30" },
    ],
    commitments: [
      { id: "rent", name: "Room & utilities", amount: 850, dueDate: "2026-10-20", kind: "bill", category: "Bills" },
      { id: "stream", name: "Streambox", amount: 350, dueDate: "2026-10-25", kind: "subscription", category: "Subscriptions" },
    ],
  };
}
