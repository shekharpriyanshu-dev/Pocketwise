import { describe, expect, it } from "vitest";
import { applyScenario, buildDemoInput, calculateFinanceState } from "./finance";

describe("Pocketwise finance engine", () => {
  it("reduces available balance by a confirmed expense", () => {
    const input = { ...buildDemoInput(), commitments: [], goals: [], transactions: [] };
    const before = calculateFinanceState(input);
    const after = calculateFinanceState({ ...input, transactions: [{ id: "1", kind: "expense", amount: 500, category: "Food", description: "Lunch", date: "2026-10-12" }] });
    expect(before.availableBalance).toBe(10000);
    expect(after.availableBalance).toBe(9500);
  });

  it("keeps a simulation separate from the actual input state", () => {
    const input = { ...buildDemoInput(), commitments: [], goals: [], transactions: [] };
    const before = calculateFinanceState(input);
    const proposed = applyScenario(input, { kind: "expense", amount: 2500, category: "Shopping", description: "Headphones" });
    expect(proposed.availableBalance).toBe(7500);
    expect(before.availableBalance).toBe(10000);
    expect(input.transactions).toHaveLength(0);
  });

  it("does not double-count paid commitments", () => {
    const input = { ...buildDemoInput(), goals: [], transactions: [{ id: "1", kind: "expense" as const, amount: 850, category: "Bills", description: "Room & utilities", date: "2026-10-20" }] };
    const unpaid = calculateFinanceState(input);
    const paid = calculateFinanceState({ ...input, commitments: input.commitments.map(commitment => ({ ...commitment, paid: true })) });
    expect(unpaid.reservedCommitments).toBe(1200);
    expect(paid.reservedCommitments).toBe(0);
    expect(paid.actualExpenses).toBe(850);
  });

  it("marks a negative projected month as high risk with a calculated recommendation", () => {
    const input = {
      ...buildDemoInput(),
      startingBudget: 1000,
      startingBalance: 1000,
      commitments: [{ id: "large", name: "Rent", amount: 1500, dueDate: "2026-10-20", kind: "bill" as const }],
      goals: [],
      transactions: [],
    };
    const result = calculateFinanceState(input);
    expect(result.projectedMonthEndBalance).toBeLessThan(0);
    expect(result.riskLevel).toBe("High Risk");
    expect(result.recommendations.some(message => message.includes("per day"))).toBe(true);
  });

  it("moves savings out of discretionary money instead of leaving it spendable", () => {
    const input = { ...buildDemoInput(), commitments: [], transactions: [] };
    const before = calculateFinanceState(input);
    const after = calculateFinanceState({ ...input, goals: input.goals.map(goal => goal.id === "emergency" ? { ...goal, currentSaved: 500 } : goal) });
    expect(after.allocatedSavings).toBe(500);
    expect(after.availableBalance).toBe(before.availableBalance - 500);
    expect(after.uncommittedBalance).toBeLessThanOrEqual(before.uncommittedBalance);
  });

  it("preserves a deficit so the risk layer can explain insufficient funds", () => {
    const input = { ...buildDemoInput(), startingBudget: 100, startingBalance: 100, goals: [], commitments: [], transactions: [{ id: "1", kind: "expense" as const, amount: 100.01, category: "Healthcare", description: "Clinic", date: "2026-10-12" }] };
    const result = calculateFinanceState(input);
    expect(result.availableBalance).toBe(-0.01);
    expect(result.riskLevel).toBe("High Risk");
  });

  it("rounds monetary inputs to cents before summing", () => {
    const input = { ...buildDemoInput(), goals: [], commitments: [], transactions: [
      { id: "1", kind: "expense" as const, amount: 0.1, category: "Other", description: "One", date: "2026-10-12" },
      { id: "2", kind: "expense" as const, amount: 0.2, category: "Other", description: "Two", date: "2026-10-12" },
    ] };
    expect(calculateFinanceState(input).actualExpenses).toBe(0.3);
  });
});
