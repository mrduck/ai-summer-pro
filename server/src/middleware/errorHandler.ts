import type { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../types/index.js";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(err);
  const response: ApiResponse = {
    code: 9999,
    message: "服务器内部错误",
  };
  res.status(500).json(response);
}