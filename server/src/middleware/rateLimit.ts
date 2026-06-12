import type { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../types/index.js";

// 简单内存限流，每个用户每秒 1 次请求
const requestTimestamps = new Map<string, number>();

export function rateLimit(windowMs = 1000, maxPerWindow = 1) {
  return (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
    const deviceId = (req as any).deviceId as string;

    if (!deviceId) {
      return next();
    }

    const now = Date.now();
    const lastTime = requestTimestamps.get(deviceId) || 0;

    if (now - lastTime < windowMs / maxPerWindow) {
      return res.status(429).json({
        code: 3002,
        message: "请求过于频繁，请稍后再试",
      });
    }

    requestTimestamps.set(deviceId, now);
    next();
  };
}