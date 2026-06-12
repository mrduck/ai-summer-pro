import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3000"),
  nodeEnv: process.env.NODE_ENV || "development",
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || "",
    baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  },
  database: {
    url: process.env.TURSO_DATABASE_URL || "file:./data/summarize.db",
    authToken: process.env.TURSO_AUTH_TOKEN || "",
  },
};