import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { config } from "../config.js";

const client = createClient({
  url: config.database.url,
  authToken: config.database.authToken || undefined,
});

// 初始化表
async function initDB() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL UNIQUE,
      quota_limit INTEGER NOT NULL DEFAULT 5,
      plan TEXT NOT NULL DEFAULT 'free',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      url TEXT NOT NULL,
      title TEXT,
      original_text_hash TEXT,
      original_text_length INTEGER,
      summary_text TEXT,
      summary_mode TEXT DEFAULT 'bullet',
      source_lang TEXT DEFAULT 'auto',
      output_lang TEXT DEFAULT 'zh',
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS daily_quotas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      date TEXT NOT NULL,
      used_count INTEGER NOT NULL DEFAULT 0,
      limit_count INTEGER NOT NULL DEFAULT 5
    )`,
    `CREATE INDEX IF NOT EXISTS idx_summaries_user_time ON summaries(user_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_summaries_url ON summaries(url)`,
    `CREATE INDEX IF NOT EXISTS idx_daily_quotas_user_date ON daily_quotas(user_id, date)`,
  ];

  for (const stmt of statements) {
    await client.execute(stmt);
  }
}

initDB().catch(console.error);

export const db = drizzle(client);