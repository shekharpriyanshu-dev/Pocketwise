import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  confirmScenario: vi.fn(),
  confirmSavingsScenario: vi.fn(),
  contributeToGoal: vi.fn(),
  deleteTransaction: vi.fn(),
  ensureDemoFinance: vi.fn(),
  getFinanceRecords: vi.fn(),
  insertCommitment: vi.fn(),
  insertSavingsGoal: vi.fn(),
  insertTransaction: vi.fn(),
  payCommitment: vi.fn(),
  updateFinancialProfile: vi.fn(),
}));

import { appRouter } from "./routers";
import { confirmSavingsScenario, ensureDemoFinance, insertTransaction } from "./db";

const user = { id: 7, openId: "api-test-user", name: "API Test", email: "api@example.com", loginMethod: "test", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const context = (currentUser: typeof user | null = user) => ({ req: {} as never, res: { clearCookie: vi.fn() } as never, user: currentUser });
const records = {
  profile: { startingBudget: "10000", startingBalance: "10000", durationDays: 30, emergencyFundTarget: "1500" },
  transactions: [],
  goals: [{ id: 11, name: "Emergency fund", targetAmount: "1500", currentSaved: "0", targetDate: new Date("2026-11-30"), protected: true, active: true }],
  commitments: [],
  scenarios: [],
};

describe("protected finance API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects unauthenticated transaction creation", async () => {
    const caller = appRouter.createCaller(context(null));
    await expect(caller.finance.createTransaction({ kind: "expense", amount: 10, category: "Food", description: "Test", transactionDate: "2026-10-12" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects an expense that exceeds the calculated available balance", async () => {
    vi.mocked(ensureDemoFinance).mockResolvedValue(records as never);
    const caller = appRouter.createCaller(context());
    await expect(caller.finance.createTransaction({ kind: "expense", amount: 10001, category: "Shopping", description: "Too much", transactionDate: "2026-10-12" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(insertTransaction).not.toHaveBeenCalled();
  });

  it("routes savings confirmation to the goal-scoped atomic mutation", async () => {
    vi.mocked(confirmSavingsScenario).mockResolvedValue({ goalId: 11, currentSaved: "250.00", scenarioId: 3, confirmed: true });
    const caller = appRouter.createCaller(context());
    await expect(caller.finance.confirmScenario({ kind: "save", name: "Emergency buffer", amount: 250, goalId: 11 })).resolves.toMatchObject({ goalId: 11, confirmed: true });
    expect(confirmSavingsScenario).toHaveBeenCalledWith(7, { goalId: 11, name: "Emergency buffer", amount: "250.00" });
  });
});
