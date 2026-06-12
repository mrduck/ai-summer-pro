import type { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../types/index.js";

export function deviceAuth() {
  return (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
    const deviceId = req.headers["x-device-id"];

    if (!deviceId || typeof deviceId !== "string") {
      return res.status(401).json({
        code: 2001,
        message: "缺少 X-Device-Id 请求头",
      });
    }

    (req as any).deviceId = deviceId;
    next();
  };
}