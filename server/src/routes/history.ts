import { Router, Request, Response } from "express";
import { db } from "../db/index.js";
import { summaries } from "../db/schema.js";
import { eq, desc, like, and, sql } from "drizzle-orm";
import { deviceAuth } from "../middleware/deviceAuth.js";
import { findOrCreateUser } from "../services/quota.js";
import { ApiResponse, HistoryItem, HistoryDetail } from "../types/index.js";

const router = Router();

// 所有历史接口需要设备认证
router.use(deviceAuth());

// GET /api/history — 获取历史列表
router.get("/", async (req: Request, res: Response<ApiResponse>) => {
  try {
    const deviceId = (req as any).deviceId as string;
    const user = await findOrCreateUser(deviceId);

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const q = (req.query.q as string) || "";
    const offset = (page - 1) * limit;

    const whereConditions = [eq(summaries.userId, user.id)];
    if (q) {
      whereConditions.push(like(summaries.title, `%${q}%`));
    }

    const [countResult] = await db
      .select({ count: sql`count(*)` })
      .from(summaries)
      .where(and(...whereConditions));

    const items = await db
      .select({
        id: summaries.id,
        title: summaries.title,
        url: summaries.url,
        summaryMode: summaries.summaryMode,
        createdAt: summaries.createdAt,
        summaryText: summaries.summaryText,
      })
      .from(summaries)
      .where(and(...whereConditions))
      .orderBy(desc(summaries.createdAt))
      .limit(limit)
      .offset(offset);

    const result: HistoryItem[] = items.map((item) => ({
      id: item.id,
      title: item.title,
      url: item.url,
      summaryMode: item.summaryMode,
      createdAt: item.createdAt || "",
      summaryPreview: item.summaryText?.slice(0, 100) || null,
    }));

    return res.json({
      code: 0,
      data: {
        total: Number(countResult.count),
        page,
        limit,
        items: result,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ code: 9999, message: "获取历史记录失败" });
  }
});

// GET /api/history/:id — 获取历史详情
router.get("/:id", async (req: Request, res: Response<ApiResponse>) => {
  try {
    const deviceId = (req as any).deviceId as string;
    const user = await findOrCreateUser(deviceId);
    const id = parseInt(req.params.id as string);

    const [item] = await db
      .select()
      .from(summaries)
      .where(and(eq(summaries.id, id), eq(summaries.userId, user.id)))
      .limit(1);

    if (!item) {
      return res.status(404).json({ code: 1001, message: "记录不存在" });
    }

    const result: HistoryDetail = {
      id: item.id,
      title: item.title,
      url: item.url,
      summaryMode: item.summaryMode,
      summaryText: item.summaryText,
      sourceLang: item.sourceLang,
      outputLang: item.outputLang,
      createdAt: item.createdAt || "",
    };

    return res.json({ code: 0, data: result });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ code: 9999, message: "获取详情失败" });
  }
});

// DELETE /api/history/:id — 删除历史记录
router.delete("/:id", async (req: Request, res: Response<ApiResponse>) => {
  try {
    const deviceId = (req as any).deviceId as string;
    const user = await findOrCreateUser(deviceId);
    const id = parseInt(req.params.id as string);

    await db
      .delete(summaries)
      .where(and(eq(summaries.id, id), eq(summaries.userId, user.id)));

    return res.json({ code: 0, message: "ok" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ code: 9999, message: "删除失败" });
  }
});

export default router;