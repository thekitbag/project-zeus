import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const shoppingLists = sqliteTable("shopping_lists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull().default(""),
});

export const shoppingItems = sqliteTable("shopping_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  listId: integer("list_id")
    .notNull()
    .references(() => shoppingLists.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(""),
});

export type ShoppingList = typeof shoppingLists.$inferSelect;
export type ShoppingItem = typeof shoppingItems.$inferSelect;

export const taskLists = sqliteTable("task_lists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull().default(""),
});

export const taskItems = sqliteTable("task_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  listId: integer("list_id")
    .notNull()
    .references(() => taskLists.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(""),
});

export type TaskList = typeof taskLists.$inferSelect;
export type TaskItem = typeof taskItems.$inferSelect;

export const situationCategories = sqliteTable("situation_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  emoji: text("emoji").notNull(),
  colour: text("colour").notNull(),
  createdAt: text("created_at").notNull().default(""),
});

export const situations = sqliteTable("situations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => situationCategories.id),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(""),
});

export type SituationCategory = typeof situationCategories.$inferSelect;
export type Situation = typeof situations.$inferSelect;

export const watchItems = sqliteTable("watch_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  type: text("type", { enum: ["film", "series", "documentary", "other"] }).notNull().default("film"),
  notes: text("notes"),
  watched: integer("watched", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(""),
});

export type WatchItem = typeof watchItems.$inferSelect;

export const budgetCategories = sqliteTable("budget_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  emoji: text("emoji").notNull(),
  colour: text("colour").notNull(),
  monthlyBudget: integer("monthly_budget").notNull().default(0),
  createdAt: text("created_at").notNull().default(""),
});

export const spendingEntries = sqliteTable("spending_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id")
    .notNull()
    .references(() => budgetCategories.id, { onDelete: "cascade" }),
  amountPence: integer("amount_pence").notNull(),
  notes: text("notes"),
  date: text("date").notNull(),
  createdAt: text("created_at").notNull().default(""),
});

export const debts = sqliteTable("debts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  balancePence: integer("balance_pence").notNull(),
  interestRate: real("interest_rate"),
  monthlyPaymentPence: integer("monthly_payment_pence"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(""),
});

export type BudgetCategory = typeof budgetCategories.$inferSelect;
export type SpendingEntry = typeof spendingEntries.$inferSelect;
export type Debt = typeof debts.$inferSelect;
