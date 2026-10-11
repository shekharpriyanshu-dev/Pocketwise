import { COOKIE_NAME } from "@shared/const";
import { applyScenario, buildDemoInput, calculateFinanceState, type FinanceInput } from "@shared/finance";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { confirmScenario, confirmSavingsScenario, contributeToGoal, deleteTransaction, ensureDemoFinance, getFinanceRecords, insertCommitment, insertSavingsGoal, insertTransaction, payCommitment, updateFinancialProfile } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const dateOnly = (value: Date | string | null | undefined) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
};

const elapsedDaysForProfile = (durationDays: number) => {
  const start = new Date("2026-10-01T00:00:00Z");
  const now = new Date();
  const elapsed = Math.floor((now.getTime() - start.getTime()) / 86400000) + 1;
  return Math.min(durationDays, Math.max(0, elapsed));
};

function recordsToInput(records: NonNullable<Awaited<ReturnType<typeof getFinanceRecords>>>): FinanceInput {
  const profile = records.profile;
  const durationDays = profile?.durationDays ?? 30;
  return {
    startingBudget: Number(profile?.startingBudget ?? 10000),
    startingBalance: Number(profile?.startingBalance ?? 10000),
    durationDays,
    elapsedDays: elapsedDaysForProfile(durationDays),
    emergencyFundTarget: Number(profile?.emergencyFundTarget ?? 1500),
    transactions: records.transactions.map(transaction => ({
      id: transaction.id,
      kind: transaction.kind,
      amount: Number(transaction.amount),
      category: transaction.category,
      description: transaction.description,
      date: dateOnly(transaction.transactionDate),
    })),
    goals: records.goals.map(goal => ({
      id: goal.id,
      name: goal.name,
      targetAmount: Number(goal.targetAmount),
      currentSaved: Number(goal.currentSaved),
      targetDate: dateOnly(goal.targetDate),
      protected: goal.protected,
    })),
    commitments: records.commitments.map(commitment => ({
      id: commitment.id,
      name: commitment.name,
      amount: Number(commitment.amount),
      dueDate: dateOnly(commitment.dueDate),
      kind: commitment.kind,
      active: commitment.active,
      paid: commitment.paid,
      category: commitment.category,
    })),
  };
}

function snapshotFromInput(input: FinanceInput) {
  return { input, metrics: calculateFinanceState(input) };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  finance: router({
    demoSnapshot: publicProcedure.query(() => snapshotFromInput(buildDemoInput())),

    snapshot: protectedProcedure.query(async ({ ctx }) => {
      const records = await ensureDemoFinance(ctx.user.id);
      if (!records) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
      return {
        ...snapshotFromInput(recordsToInput(records)),
        records: {
          transactions: records.transactions,
          goals: records.goals,
          commitments: records.commitments,
          scenarios: records.scenarios,
        },
      };
    }),

    updateSettings: protectedProcedure
      .input(z.object({ startingBudget: z.number().finite().nonnegative().max(100000000), durationDays: z.number().int().positive().max(3650), emergencyFundTarget: z.number().finite().nonnegative().max(100000000) }))
      .mutation(({ ctx, input }) => updateFinancialProfile(ctx.user.id, { startingBudget: input.startingBudget.toFixed(2), durationDays: input.durationDays, emergencyFundTarget: input.emergencyFundTarget.toFixed(2) })),

    createTransaction: protectedProcedure
      .input(z.object({
        kind: z.enum(["expense", "income", "refund"]),
        amount: z.number().finite().positive().max(100000000),
        category: z.string().trim().min(1).max(64),
        description: z.string().trim().min(1).max(255),
        transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }))
      .mutation(async ({ ctx, input }) => {
        if (input.kind === "expense") {
          const records = await ensureDemoFinance(ctx.user.id);
          if (!records) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
          const available = calculateFinanceState(recordsToInput(records)).availableBalance;
          if (input.amount > available) throw new TRPCError({ code: "BAD_REQUEST", message: "Expense exceeds the available balance" });
        }
        const rows = await insertTransaction(ctx.user.id, { ...input, amount: input.amount.toFixed(2) });
        return rows[0];
      }),

    deleteTransaction: protectedProcedure
      .input(z.object({ transactionId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => deleteTransaction(ctx.user.id, input.transactionId)),

    contributeToGoal: protectedProcedure
      .input(z.object({ goalId: z.number().int().positive(), amount: z.number().finite().positive().max(100000000) }))
      .mutation(({ ctx, input }) => contributeToGoal(ctx.user.id, input.goalId, input.amount.toFixed(2))),

    createGoal: protectedProcedure
      .input(z.object({ name: z.string().trim().min(1).max(120), targetAmount: z.number().finite().positive().max(100000000), targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), protected: z.boolean() }))
      .mutation(({ ctx, input }) => insertSavingsGoal(ctx.user.id, { ...input, targetAmount: input.targetAmount.toFixed(2) })),

    createCommitment: protectedProcedure
      .input(z.object({ name: z.string().trim().min(1).max(120), amount: z.number().finite().positive().max(100000000), kind: z.enum(["bill", "subscription"]), dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), category: z.string().trim().min(1).max(64) }))
      .mutation(({ ctx, input }) => insertCommitment(ctx.user.id, { ...input, amount: input.amount.toFixed(2) })),

    payCommitment: protectedProcedure
      .input(z.object({ commitmentId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const records = await ensureDemoFinance(ctx.user.id);
        if (!records) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
        const commitment = records.commitments.find(item => item.id === input.commitmentId);
        if (!commitment) throw new TRPCError({ code: "NOT_FOUND", message: "Commitment not found" });
        const available = calculateFinanceState(recordsToInput(records)).availableBalance;
        if (Number(commitment.amount) > available) throw new TRPCError({ code: "BAD_REQUEST", message: "Payment exceeds the available balance" });
        return payCommitment(ctx.user.id, { commitmentId: input.commitmentId, name: commitment.name, amount: String(commitment.amount), category: commitment.category, transactionDate: new Date().toISOString().slice(0, 10) });
      }),

    evaluateScenario: protectedProcedure
      .input(z.object({
        kind: z.enum(["expense", "income", "save", "bill"]),
        amount: z.number().finite().nonnegative().max(100000000),
        category: z.string().trim().max(64).optional(),
        description: z.string().trim().max(255).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const records = await ensureDemoFinance(ctx.user.id);
        if (!records) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
        const base = recordsToInput(records);
        return {
          before: calculateFinanceState(base),
          after: applyScenario(base, input),
          input,
        };
      }),

    confirmScenario: protectedProcedure
      .input(z.object({
        name: z.string().trim().min(1).max(120),
        kind: z.enum(["expense", "income", "save", "bill"]),
        amount: z.number().finite().positive().max(100000000),
        category: z.string().trim().max(64).optional(),
        goalId: z.number().int().positive().optional(),
        commitmentId: z.number().int().positive().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (input.kind === "save") {
          if (!input.goalId) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a savings goal before confirming a savings allocation." });
          return confirmSavingsScenario(ctx.user.id, { goalId: input.goalId, name: input.name, amount: input.amount.toFixed(2) });
        }
        if (input.kind === "bill") {
          if (!input.commitmentId) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a commitment before confirming a bill payment." });
          const records = await ensureDemoFinance(ctx.user.id);
          if (!records) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
          const commitment = records.commitments.find(item => item.id === input.commitmentId);
          if (!commitment) throw new TRPCError({ code: "NOT_FOUND", message: "Commitment not found" });
          const available = calculateFinanceState(recordsToInput(records)).availableBalance;
          if (Number(commitment.amount) > available) throw new TRPCError({ code: "BAD_REQUEST", message: "Payment exceeds the available balance" });
          return payCommitment(ctx.user.id, { commitmentId: input.commitmentId, name: commitment.name, amount: String(commitment.amount), category: commitment.category, transactionDate: new Date().toISOString().slice(0, 10) });
        }
        return confirmScenario(ctx.user.id, {
          name: input.name,
          kind: input.kind,
          amount: input.amount.toFixed(2),
          category: input.category ?? "Other",
          transactionDate: new Date().toISOString().slice(0, 10),
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
