import { Router, Request, Response } from "express";
import { findOrCreateUser, getDailyQuota } from "../services/quota.js";
import { ApiResponse } from "../types/index.js";

const router = Router();

// GET /api/user/quota — 查询配额
router.get("/quota", async (req: Request, res: Response<ApiResponse>) => {
  try {
    const deviceId = req.headers["x-device-id"] as string;
    if (!deviceId) {
      return res.status(401).json({ code: 2001, message: "缺少 X-Device-Id" });
    }

    const user = await findOrCreateUser(deviceId);
    const quota = await getDailyQuota(user.id, user.quotaLimit);

    return res.json({ code: 0, data: quota });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ code: 9999, message: "查询失败" });
  }
});

// POST /api/user/register — 设备注册
router.post("/register", async (req: Request, res: Response<ApiResponse>) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({ code: 1001, message: "deviceId 不能为空" });
    }

    const user = await findOrCreateUser(deviceId);

    return res.json({
      code: 0,
      data: {
        deviceId: user.deviceId,
        plan: user.plan,
        dailyLimit: user.quotaLimit,
        dailyUsed: 0,
        createdAt: user.createdAt,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ code: 9999, message: "注册失败" });
  }
});

export default router;