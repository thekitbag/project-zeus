import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;
type RawDb = InstanceType<typeof Database>;

let _instance: DrizzleDb | null = null;
let _sqlite: RawDb | null = null;
let _shutdownRegistered = false;

// Fold the WAL back into the main .db file and reset it. Safe to call while
// the app is running — a checkpoint only copies already-committed pages and is
// concurrency-safe. Kept defensive so a shutdown signal can never throw.
function flushWal(sqlite: RawDb) {
  try {
    sqlite.pragma("wal_checkpoint(TRUNCATE)");
  } catch {
    // best-effort: if a reader briefly blocks the truncate, the next boot
    // checkpoint (or autocheckpoint) will catch up.
  }
}

export function getDb(): DrizzleDb {
  if (_instance) return _instance;

  const dbPath =
    process.env.DATABASE_PATH ||
    path.join(process.cwd(), "data", "project-zeus.db");

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const sqlite = new Database(dbPath);
  _sqlite = sqlite;
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  // Wait up to 5s for a lock instead of throwing SQLITE_BUSY immediately.
  sqlite.pragma("busy_timeout = 5000");
  // NORMAL is durable under WAL and avoids an fsync on every commit.
  sqlite.pragma("synchronous = NORMAL");
  // Fold the WAL into the main file roughly every ~100 pages (~400KB) so the
  // committed data never accumulates in an unbounded, unflushed -wal file.
  sqlite.pragma("wal_autocheckpoint = 100");
  // Flush anything left in the WAL from a previous (possibly SIGKILL'd) run so
  // every container start acts as a checkpoint safety net.
  flushWal(sqlite);

  // Next installs its own SIGTERM/SIGINT handlers to drain in-flight requests,
  // so we must NOT call process.exit() here — just flush the WAL on the way out
  // and let Next own the exit. Checkpointing (rather than closing) avoids
  // yanking the connection out from under an in-flight query.
  if (!_shutdownRegistered) {
    _shutdownRegistered = true;
    let flushed = false;
    const onSignal = () => {
      if (flushed) return;
      flushed = true;
      if (_sqlite) flushWal(_sqlite);
    };
    process.once("SIGTERM", onSignal);
    process.once("SIGINT", onSignal);
  }

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS shopping_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shopping_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id INTEGER NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id INTEGER NOT NULL REFERENCES task_lists(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS situation_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      emoji TEXT NOT NULL,
      colour TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS situations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category_id INTEGER NOT NULL REFERENCES situation_categories(id),
      start_date TEXT NOT NULL,
      end_date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS watch_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'film',
      notes TEXT,
      watched INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS budget_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      emoji TEXT NOT NULL,
      colour TEXT NOT NULL,
      monthly_budget INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS spending_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES budget_categories(id) ON DELETE CASCADE,
      amount_pence INTEGER NOT NULL,
      notes TEXT,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      balance_pence INTEGER NOT NULL,
      interest_rate REAL,
      monthly_payment_pence INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS debt_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      total_pence INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS monzo_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TEXT NOT NULL,
      monzo_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS monzo_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      monzo_account_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      balance_pence INTEGER NOT NULL DEFAULT 0,
      last_synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS monzo_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      monzo_transaction_id TEXT NOT NULL UNIQUE,
      monzo_account_id TEXT NOT NULL,
      merchant_name TEXT NOT NULL,
      amount_pence INTEGER NOT NULL,
      date TEXT NOT NULL,
      monzo_category TEXT NOT NULL DEFAULT 'general',
      suggested_category_id INTEGER REFERENCES budget_categories(id),
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      spending_entry_id INTEGER REFERENCES spending_entries(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const existing = sqlite
    .prepare("SELECT COUNT(*) as count FROM shopping_lists")
    .get() as { count: number };
  if (existing.count === 0) {
    const insert = sqlite.prepare(
      "INSERT INTO shopping_lists (name, created_at) VALUES (?, datetime('now'))"
    );
    insert.run("Groceries");
    insert.run("Costco");
    insert.run("Household");
  }

  const budgetCatCount = (sqlite.prepare("SELECT COUNT(*) as count FROM budget_categories").get() as { count: number }).count;
  if (budgetCatCount === 0) {
    const insertBudget = sqlite.prepare(
      "INSERT INTO budget_categories (name, emoji, colour, monthly_budget, created_at) VALUES (?, ?, ?, ?, datetime('now'))"
    );
    insertBudget.run("Groceries",     "🛒", "#86efac", 45000);
    insertBudget.run("Takeaway",      "🍔", "#fda4af", 8000);
    insertBudget.run("Travel",        "🚌", "#93c5fd", 15000);
    insertBudget.run("Entertainment", "🎭", "#c4b5fd", 10000);
    insertBudget.run("Household",     "🏠", "#fcd34d", 20000);
    insertBudget.run("Bills",         "📄", "#a8a29e", 50000);
    insertBudget.run("Celebrations",  "🎉", "#f9a8d4", 10000);
    insertBudget.run("Miscellaneous", "📦", "#d4d4d4", 10000);
  }

  // Add any categories missing from existing installs
  const hasCelebrations = (sqlite.prepare("SELECT COUNT(*) as count FROM budget_categories WHERE name = 'Celebrations'").get() as { count: number }).count;
  if (!hasCelebrations) {
    sqlite.prepare(
      "INSERT INTO budget_categories (name, emoji, colour, monthly_budget, created_at) VALUES (?, ?, ?, ?, datetime('now'))"
    ).run("Celebrations", "🎉", "#f9a8d4", 10000);
  }

  const catCount = (sqlite.prepare("SELECT COUNT(*) as count FROM situation_categories").get() as { count: number }).count;
  if (catCount === 0) {
    const insertCat = sqlite.prepare(
      "INSERT INTO situation_categories (name, emoji, colour, created_at) VALUES (?, ?, ?, datetime('now'))"
    );
    insertCat.run("Birthday",     "🎂", "#fda4af");
    insertCat.run("Out of House", "🏢", "#93c5fd");
    insertCat.run("Visitors",     "🏠", "#86efac");
    insertCat.run("Travel",       "✈️", "#fcd34d");
    insertCat.run("Event",        "⚡", "#c4b5fd");
  }

  _instance = drizzle(sqlite, { schema });
  return _instance;
}
