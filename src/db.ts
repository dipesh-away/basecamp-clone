/** SQLite store. Factory takes a path so tests can use :memory:. */
import { DatabaseSync } from "node:sqlite";

export function initDb(path = process.env.DB_PATH ?? "./data.db"): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}
