import { db } from "../db/index.js";
import { users, dailyQuotas } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { QuotaInfo } from "../types/index.js";

function getTodayDate() {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

/**
 * 查找或创建用户
 */
export async function findOrCreateUser(deviceId: string) {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.deviceId, deviceId))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [newUser] = await db
    .insert(users)
    .values({ deviceId, quotaLimit: 5, plan: "free" })
    .returning();

  return newUser;
}

/**
 * 获取今日配额信息
 */
export async function getDailyQuota(userId: number, planLimit: number): Promise<QuotaInfo> {
  const today = getTodayDate();
  const [record] = await db
    .select()
    .from(dailyQuotas)
    .where(and(eq(dailyQuotas.userId, userId), eq(dailyQuotas.date, today)))
    .limit(1);

  if (!record) {
    const [newRecord] = await db
      .insert(dailyQuotas)
      .values({ userId, date: today, usedCount: 0, limitCount: planLimit })
      .returning();
    return {
      plan: planLimit > 5 ? "pro" : "free",
      dailyLimit: planLimit,
      dailyUsed: 0,
      remaining: planLimit,
    };
  }

  return {
    plan: planLimit > 5 ? "pro" : "free",
    dailyLimit: record.limitCount,
    dailyUsed: record.usedCount,
    remaining: record.limitCount - record.usedCount,
  };
}

/**
 * 检查配额是否充足
 */
export async function checkQuota(userId: number, planLimit: number): Promise<boolean> {
  const quota = await getDailyQuota(userId, planLimit);
  return quota.remaining > 0;
}

/**
 * 消耗一次配额
 */
export async function consumeQuota(userId: number, planLimit: number): Promise<void> {
  const today = getTodayDate();
  const [record] = await db
    .select()
    .from(dailyQuotas)
    .where(and(eq(dailyQuotas.userId, userId), eq(dailyQuotas.date, today)))
    .limit(1);

  if (!record) {
    await db
      .insert(dailyQuotas)
      .values({ userId, date: today, usedCount: 1, limitCount: planLimit });
  } else {
    await db
      .update(dailyQuotas)
      .set({ usedCount: record.usedCount + 1 })
      .where(eq(dailyQuotas.id, record.id));
  }
}