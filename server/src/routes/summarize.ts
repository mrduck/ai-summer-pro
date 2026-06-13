import { Router, Request, Response } from "express";
import { db } from "../db/index.js";
import { summaries } from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import crypto from "crypto";
import { deviceAuth } from "../middleware/deviceAuth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { findOrCreateUser, checkQuota, getDailyQuota, consumeQuota } from "../services/quota.js";
import { streamSummary } from "../services/ai.js";
import { ApiResponse, SummaryMode, OutputLang } from "../types/index.js";

const router = Router();

// 总结接口需要设备认证 + 频率限制
router.use(deviceAuth());
router.use(rateLimit(1000, 1));

// POST /api/summarize — 页面总结（流式）
router.post("/", async (req: Request, res: Response) => {
  try {
    const deviceId = (req as any).deviceId as string;
    const { url, title, content, mode = "bullet", outputLang = "auto" } = req.body;

    // 参数校验
    if (!content || content.length < 100) {
      return res.status(400).json({ code: 1002, message: "页面内容过短，无法总结" });
    }

    if (!["brief", "paragraph", "bullet"].includes(mode)) {
      return res.status(400).json({ code: 1003, message: "mode 值无效" });
    }

    // 用户 & 配额检查
    const user = await findOrCreateUser(deviceId);
    const hasQuota = await checkQuota(user.id, user.quotaLimit);
    if (!hasQuota) {
      return res.status(429).json({ code: 3001, message: "今日配额已用完" });
    }

    // 缓存检查：相同 URL + mode 不重复消耗
    const contentHash = crypto.createHash("md5").update(content).digest("hex");
    const [cached] = await db
      .select()
      .from(summaries)
      .where(
        and(
          eq(summaries.userId, user.id),
          eq(summaries.url, url || ""),
          eq(summaries.summaryMode, mode),
          eq(summaries.originalTextHash, contentHash)
        )
      )
      .limit(1);

    if (cached && cached.summaryText) {
      // 命中缓存，不用消耗配额，直接流式返回
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Cached": "true",
      });
      res.write(`event: start\ndata: {"summaryId": ${cached.id}}\n\n`);
      for (const char of cached.summaryText) {
        res.write(`event: token\ndata: ${JSON.stringify({ content: char })}\n\n`);
      }
      res.write(`event: done\ndata: {"summaryId": ${cached.id}}\n\n`);
      res.end();
      return;
    }

    // 消耗配额
    await consumeQuota(user.id, user.quotaLimit);

    // 发送流式响应
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    let summaryText = "";
    let paragraphRefs: { index: number; text: string }[] = [];

    try {
      for await (const event of streamSummary(content, mode as SummaryMode, outputLang as OutputLang)) {
        if (event.type === "error") {
          res.write(`event: error\ndata: ${JSON.stringify({ code: 9001, message: event.content })}\n\n`);
          res.end();
          return;
        }

        if (event.type === "token") {
          summaryText += event.content;
        }

        if (event.type === "done") {
          paragraphRefs = event.paragraphRefs || [];
        }

        res.write(`event: ${event.type}\ndata: ${JSON.stringify({ content: event.content })}\n\n`);
      }
    } catch (e) {
      res.write(`event: error\ndata: ${JSON.stringify({ code: 9001, message: "AI 生成失败" })}\n\n`);
      res.end();
      return;
    }

    // 保存总结结果到数据库
    const [saved] = await db
      .insert(summaries)
      .values({
        userId: user.id,
        url: url || "",
        title: title || null,
        originalTextHash: contentHash,
        originalTextLength: content.length,
        summaryText,
        summaryMode: mode,
        outputLang: outputLang,
      })
      .returning({ id: summaries.id });

    // 获取剩余配额
    const quota = await getDailyQuota(user.id, user.quotaLimit);

    res.write(`event: done\ndata: ${JSON.stringify({ summaryId: saved.id, quotaRemaining: quota.remaining, paragraphRefs })}\n\n`);
    res.end();
  } catch (e) {
    console.error(e);
    res.writeHead(500);
    res.write(`event: error\ndata: ${JSON.stringify({ code: 9999, message: "服务器内部错误" })}\n\n`);
    res.end();
  }
});

// POST /api/summarize/selection — 选中文字总结（流式）
router.post("/selection", async (req: Request, res: Response) => {
  try {
    const deviceId = (req as any).deviceId as string;
    const { text, mode = "brief", outputLang = "zh" } = req.body;

    if (!text || text.length < 50) {
      return res.status(400).json({ code: 1002, message: "选中的文字内容过短" });
    }

    const user = await findOrCreateUser(deviceId);
    const hasQuota = await checkQuota(user.id, user.quotaLimit);
    if (!hasQuota) {
      return res.status(429).json({ code: 3001, message: "今日配额已用完" });
    }

    await consumeQuota(user.id, user.quotaLimit);

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    let summaryText = "";

    try {
      for await (const event of streamSummary(text, mode as SummaryMode, outputLang as OutputLang)) {
        if (event.type === "error") {
          res.write(`event: error\ndata: ${JSON.stringify({ code: 9001, message: event.content })}\n\n`);
          res.end();
          return;
        }

        if (event.type === "token") {
          summaryText += event.content;
        }

        res.write(`event: ${event.type}\ndata: ${JSON.stringify({ content: event.content })}\n\n`);
      }
    } catch (e) {
      res.write(`event: error\ndata: ${JSON.stringify({ code: 9001, message: "AI 生成失败" })}\n\n`);
      res.end();
      return;
    }

    const quota = await getDailyQuota(user.id, user.quotaLimit);
    res.write(`event: done\ndata: ${JSON.stringify({ quotaRemaining: quota.remaining })}\n\n`);
    res.end();
  } catch (e) {
    console.error(e);
    res.writeHead(500);
    res.write(`event: error\ndata: ${JSON.stringify({ code: 9999, message: "服务器内部错误" })}\n\n`);
    res.end();
  }
});

export default router;