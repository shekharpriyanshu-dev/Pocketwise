import { boolean, date, decimal, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const financialProfiles = mysqlTable("financial_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  startingBudget: decimal("startingBudget", { precision: 12, scale: 2 }).notNull().default("10000"),
  startingBalance: decimal("startingBalance", { precision: 12, scale: 2 }).notNull().default("10000"),
  durationDays: int("durationDays").notNull().default(30),
  emergencyFundTarget: decimal("emergencyFundTarget", { precision: 12, scale: 2 }).notNull().default("1500"),
  currency: varchar("currency", { length: 8 }).notNull().default("INR"),
  locale: varchar("locale", { length: 16 }).notNull().default("en-IN"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ userUnique: uniqueIndex("financial_profiles_user_unique").on(table.userId) }));

export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  kind: mysqlEnum("kind", ["expense", "income", "refund"]).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  transactionDate: date("transactionDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ userIndex: index("transactions_user_idx").on(table.userId) }));

export const savingsGoals = mysqlTable("savings_goals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  name: varchar("name", { length: 120 }).notNull(),
  targetAmount: decimal("targetAmount", { precision: 12, scale: 2 }).notNull(),
  currentSaved: decimal("currentSaved", { precision: 12, scale: 2 }).notNull().default("0"),
  targetDate: date("targetDate").notNull(),
  protected: boolean("protected").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ userIndex: index("savings_goals_user_idx").on(table.userId) }));

export const commitments = mysqlTable("commitments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  name: varchar("name", { length: 120 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  kind: mysqlEnum("kind", ["bill", "subscription"]).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  dueDate: date("dueDate").notNull(),
  frequency: varchar("frequency", { length: 32 }).notNull().default("monthly"),
  active: boolean("active").notNull().default(true),
  paid: boolean("paid").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ userIndex: index("commitments_user_idx").on(table.userId) }));

export const scenarios = mysqlTable("scenarios", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  name: varchar("name", { length: 120 }).notNull(),
  kind: varchar("kind", { length: 32 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["simulated", "confirmed", "cancelled"]).notNull().default("simulated"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  confirmedAt: timestamp("confirmedAt"),
}, table => ({ userIndex: index("scenarios_user_idx").on(table.userId) }));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type FinancialProfile = typeof financialProfiles.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type SavingsGoal = typeof savingsGoals.$inferSelect;
export type Commitment = typeof commitments.$inferSelect;
export type Scenario = typeof scenarios.$inferSelect;
