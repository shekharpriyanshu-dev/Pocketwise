import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  commitments,
  financialProfiles,
  InsertUser,
  scenarios,
  savingsGoals,
  transactions,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function ensureDemoFinance(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const profile = await db.select().from(financialProfiles).where(eq(financialProfiles.userId, userId)).limit(1);
  if (profile.length === 0) {
    await db.insert(financialProfiles).values({
      userId,
      startingBudget: "10000",
      startingBalance: "10000",
      durationDays: 30,
      emergencyFundTarget: "1500",
      currency: "INR",
      locale: "en-IN",
    });
  }
  const goals = await db.select().from(savingsGoals).where(eq(savingsGoals.userId, userId)).limit(1);
  if (goals.length === 0) {
    await db.insert(savingsGoals).values({ userId, name: "Emergency cushion", targetAmount: "1500", currentSaved: "0", targetDate: new Date("2026-10-30"), protected: true });
    await db.insert(savingsGoals).values({ userId, name: "Personal savings", targetAmount: "500", currentSaved: "0", targetDate: new Date("2026-10-30"), protected: false });
  }
  const savedCommitments = await db.select().from(commitments).where(eq(commitments.userId, userId)).limit(1);
  if (savedCommitments.length === 0) {
    await db.insert(commitments).values({ userId, name: "Room & utilities", amount: "850", kind: "bill", category: "Bills", dueDate: new Date("2026-10-20"), frequency: "monthly" });
    await db.insert(commitments).values({ userId, name: "Streambox", amount: "350", kind: "subscription", category: "Subscriptions", dueDate: new Date("2026-10-25"), frequency: "monthly" });
  }
  return getFinanceRecords(userId);
}

export async function updateFinancialProfile(userId: number, input: { startingBudget: string; durationDays: number; emergencyFundTarget: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(financialProfiles).set(input).where(eq(financialProfiles.userId, userId));
  return { success: true };
}

export async function getFinanceRecords(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [profile] = await db.select().from(financialProfiles).where(eq(financialProfiles.userId, userId)).limit(1);
  const userTransactions = await db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.transactionDate));
  const goals = await db.select().from(savingsGoals).where(and(eq(savingsGoals.userId, userId), eq(savingsGoals.active, true)));
  const userCommitments = await db.select().from(commitments).where(eq(commitments.userId, userId));
  const history = await db.select().from(scenarios).where(eq(scenarios.userId, userId)).orderBy(desc(scenarios.createdAt)).limit(10);
  return { profile, transactions: userTransactions, goals, commitments: userCommitments, scenarios: history };
}

export async function insertTransaction(userId: number, input: {
  kind: "expense" | "income" | "refund";
  amount: string;
  category: string;
  description: string;
  transactionDate: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(transactions).values({ userId, ...input, transactionDate: new Date(input.transactionDate) });
  const id = Number(result[0].insertId);
  return db.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId))).limit(1);
}

export async function insertSavingsGoal(userId: number, input: { name: string; targetAmount: string; targetDate: string; protected: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(savingsGoals).values({ userId, name: input.name, targetAmount: input.targetAmount, currentSaved: "0", targetDate: new Date(input.targetDate), protected: input.protected });
  return { id: Number(result[0].insertId), ...input, currentSaved: "0", active: true };
}

export async function insertCommitment(userId: number, input: { name: string; amount: string; kind: "bill" | "subscription"; dueDate: string; category: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(commitments).values({ userId, name: input.name, amount: input.amount, kind: input.kind, category: input.category, dueDate: new Date(input.dueDate), frequency: "monthly", active: true, paid: false });
  return { id: Number(result[0].insertId), ...input, active: true, paid: false, frequency: "monthly" };
}

export async function deleteTransaction(userId: number, transactionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(transactions).where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));
  return { success: true };
}

export async function contributeToGoal(userId: number, goalId: number, amount: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [goal] = await db.select().from(savingsGoals).where(and(eq(savingsGoals.id, goalId), eq(savingsGoals.userId, userId))).limit(1);
  if (!goal) throw new Error("Savings goal not found");
  const nextValue = Number(goal.currentSaved) + Number(amount);
  if (nextValue > Number(goal.targetAmount)) throw new Error("Savings contribution exceeds this goal's target");
  const next = nextValue.toFixed(2);
  await db.update(savingsGoals).set({ currentSaved: next }).where(and(eq(savingsGoals.id, goalId), eq(savingsGoals.userId, userId)));
  return { success: true, currentSaved: next };
}

export async function recordScenario(userId: number, input: { name: string; kind: string; amount: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(scenarios).values({ userId, name: input.name, kind: input.kind, amount: input.amount, status: "confirmed", confirmedAt: new Date() });
  return { id: Number(result[0].insertId), ...input, status: "confirmed" as const };
}

export async function confirmScenario(userId: number, input: {
  name: string;
  kind: "expense" | "income" | "bill";
  amount: string;
  category: string;
  transactionDate: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const transactionId = await db.transaction(async tx => {
    const transactionResult = await tx.insert(transactions).values({
      userId,
      kind: input.kind === "income" ? "income" : "expense",
      amount: input.amount,
      category: input.category,
      description: input.name,
      transactionDate: new Date(input.transactionDate),
    });
    await tx.insert(scenarios).values({ userId, name: input.name, kind: input.kind, amount: input.amount, status: "confirmed", confirmedAt: new Date() });
    return Number(transactionResult[0].insertId);
  });
  const rows = await db.select().from(transactions).where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId))).limit(1);
  return { transaction: rows[0], confirmed: true };
}

export async function confirmSavingsScenario(userId: number, input: { goalId: number; name: string; amount: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const [goal] = await tx.select().from(savingsGoals).where(and(eq(savingsGoals.id, input.goalId), eq(savingsGoals.userId, userId), eq(savingsGoals.active, true))).limit(1);
    if (!goal) throw new Error("Savings goal not found");
    const next = Number(goal.currentSaved) + Number(input.amount);
    if (next > Number(goal.targetAmount)) throw new Error("Savings contribution exceeds this goal's target");
    await tx.update(savingsGoals).set({ currentSaved: next.toFixed(2) }).where(and(eq(savingsGoals.id, input.goalId), eq(savingsGoals.userId, userId)));
    const scenarioResult = await tx.insert(scenarios).values({ userId, name: input.name, kind: "save", amount: input.amount, status: "confirmed", confirmedAt: new Date() });
    return { goalId: input.goalId, currentSaved: next.toFixed(2), scenarioId: Number(scenarioResult[0].insertId), confirmed: true };
  });
}

export async function payCommitment(userId: number, input: { commitmentId: number; name: string; amount: string; category: string; transactionDate: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const [commitment] = await tx.select().from(commitments).where(and(eq(commitments.id, input.commitmentId), eq(commitments.userId, userId))).limit(1);
    if (!commitment) throw new Error("Commitment not found");
    if (commitment.paid) return { alreadyPaid: true, commitmentId: input.commitmentId, confirmed: true };
    await tx.update(commitments).set({ paid: true }).where(and(eq(commitments.id, input.commitmentId), eq(commitments.userId, userId)));
    const amount = String(commitment.amount);
    const transactionResult = await tx.insert(transactions).values({ userId, kind: "expense", amount, category: commitment.category, description: commitment.name, transactionDate: new Date(input.transactionDate) });
    const scenarioResult = await tx.insert(scenarios).values({ userId, name: commitment.name, kind: "bill", amount, status: "confirmed", confirmedAt: new Date() });
    return { alreadyPaid: false, transactionId: Number(transactionResult[0].insertId), scenarioId: Number(scenarioResult[0].insertId), commitmentId: input.commitmentId, confirmed: true };
  });
}
