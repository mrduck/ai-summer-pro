import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { errorHandler } from "./middleware/errorHandler.js";
import summarizeRoutes from "./routes/summarize.js";
import historyRoutes from "./routes/history.js";
import userRoutes from "./routes/user.js";

const app = express();

// 中间件
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// 路由
app.use("/api/summarize", summarizeRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/user", userRoutes);

// 健康检查
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 错误处理
app.use(errorHandler);

// 仅在非 Vercel 环境监听端口（Vercel 自动管理）
if (process.env.VERCEL !== "1") {
  app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`DeepSeek API: ${config.deepseek.apiKey ? "Configured" : "NOT configured"}`);
    console.log(`Database: ${config.database.url}`);
  });
}

export default app;