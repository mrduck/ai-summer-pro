import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  deviceId: text("device_id").notNull().unique(),
  quotaLimit: integer("quota_limit").notNull().default(5),
  plan: text("plan").notNull().default("free"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const summaries = sqliteTable("summaries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  url: text("url").notNull(),
  title: text("title"),
  originalTextHash: text("original_text_hash"),
  originalTextLength: integer("original_text_length"),
  summaryText: text("summary_text"),
  summaryMode: text("summary_mode").default("bullet"),
  sourceLang: text("source_lang").default("auto"),
  outputLang: text("output_lang").default("zh"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const dailyQuotas = sqliteTable("daily_quotas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  date: text("date").notNull(),
  usedCount: integer("used_count").notNull().default(0),
  limitCount: integer("limit_count").notNull().default(5),
});