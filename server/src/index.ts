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

// 隐私政策页面（内联 HTML，确保 Vercel 也能正常访问）
app.get("/privacy", (_req, res) => {
  res.type("html").send(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>隐私政策 | AI 网页总结助手</title>
  <style>
    body { max-width: 720px; margin: 40px auto; padding: 0 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.8; color: #333; }
    h1 { font-size: 24px; border-bottom: 2px solid #2563eb; padding-bottom: 12px; }
    h2 { font-size: 18px; margin-top: 28px; }
    p { margin: 12px 0; }
    ul { padding-left: 20px; }
    li { margin: 6px 0; }
  </style>
</head>
<body>
  <h1>隐私政策</h1>
  <p>最后更新日期：2026年6月12日</p>

  <h2>1. 数据收集</h2>
  <p><strong>AI 网页总结助手</strong>（以下简称"本扩展"）仅在用户主动点击"总结"按钮时，将当前网页的文本内容发送至后端服务器进行 AI 总结处理。</p>
  <p>本扩展<strong>不会</strong>自动采集、上传或存储以下数据：</p>
  <ul>
    <li>浏览历史记录</li>
    <li>个人身份信息</li>
    <li>Cookie 或登录凭证</li>
    <li>地理位置信息</li>
  </ul>

  <h2>2. 数据使用</h2>
  <p>发送的网页内容仅用于调用 DeepSeek AI 接口生成摘要，处理完成后不会长期存储原始网页内容。生成的摘要会保存在数据库中供用户回顾历史记录。</p>

  <h2>3. 数据存储</h2>
  <p>本扩展在用户本地存储中保存设备标识符（随机 UUID），用于区分不同用户以管理每日免费配额。该标识符不包含任何个人信息。</p>

  <h2>4. 第三方服务</h2>
  <p>本扩展使用以下第三方服务：</p>
  <ul>
    <li><strong>DeepSeek API</strong>：用于生成 AI 摘要，网页内容会传输至 DeepSeek 服务器进行处理</li>
    <li><strong>ExtensionPay</strong>：用于处理付费订阅，由 ExtensionPay 独立管理支付数据</li>
  </ul>

  <h2>5. 数据安全</h2>
  <p>所有数据传输均通过 HTTPS 加密进行。我们不向任何第三方出售、分享或泄露用户数据。</p>

  <h2>6. 免责声明</h2>
  <p>AI 生成的摘要可能存在不准确之处，仅供参考，不应作为专业建议的依据。</p>

  <h2>7. 联系我们</h2>
  <p>如有疑问，请通过 GitHub Issues 联系我们：<a href="https://github.com/mrduck/ai-summer-pro/issues">https://github.com/mrduck/ai-summer-pro/issues</a></p>
</body>
</html>`);
});

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