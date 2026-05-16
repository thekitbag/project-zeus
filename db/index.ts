import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let _instance: DrizzleDb | null = null;

export function getDb(): DrizzleDb {
  if (_instance) return _instance;

  const dbPath =
    process.env.DATABASE_PATH ||
    path.join(process.cwd(), "data", "project-zeus.db");

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

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
