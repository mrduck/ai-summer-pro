# AI 网页总结助手 — 技术架构文档

> 版本：v1.1  
> 状态：MVP 阶段  
> 更新日期：2026-06-11

**产品形态：Chrome 插件（主入口）+ Web 管理端（辅助）**

---

## 一、技术选型

### 1.1 整体技术栈

| 层级 | 技术 | 理由 |
|------|------|------|
| 扩展前端 | React 18 + TypeScript | 类型安全、生态成熟 |
| UI 框架 | TailwindCSS + Radix UI | 轻量、开发快、设计感好 |
| 构建工具 | Vite + CRXJS | 热更新开发体验好 |
| 后端框架 | Express + TypeScript | 你熟悉的 Node.js 技术栈 |
| ORM | Drizzle ORM | TypeScript-first、轻量、SQL-like 语法 |
| 数据库 | SQLite (better-sqlite3) | 免费、零部署、文件即数据库 |
| AI API | DeepSeek API | 性价比最高，中文能力好 |
| 缓存 | node-cache (内存缓存) | MVP 够用，后续换 Redis |

### 1.2 数据库选型详解：SQLite

#### 为什么选 SQLite

| 维度 | SQLite | Supabase (PG) | Turso |
|------|--------|--------------|-------|
| 费用 | **永久免费** | 免费 500MB | 免费 9GB |
| 部署 | **零部署，文件即数据库** | 需要注册第三方 | 需要注册 |
| 性能 (MVP) | 每秒万次读取 | 优秀 | 优秀 |
| 并发写入 | 串行写入（MVP 够用） | 高并发 | 高并发 |
| 迁移成本 | **Drizzle 一键切 PG** | 无 | 无 |
| 备份 | 复制文件即可 | 需配置 | 需配置 |

#### 技术细节

```
数据库文件位置: server/data/summarize.db
Node.js 驱动:   better-sqlite3 (同步 API，性能最好)
ORM:            Drizzle ORM (定义 schema → 自动迁移)
```

#### 后续升级路径

```
MVP 阶段:           SQLite (当前)
      ↓ 用户量 > 1000
过渡阶段:           Turso (基于 libsql，兼容 SQLite，Edge 部署)
      ↓ 需要更高并发
规模化阶段:         PostgreSQL (Drizzle 只需改 connection，schema 不动)
```

---

## 二、系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Extension                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Side Panel   │  │ Popup        │  │ Content Script    │  │
│  │ (主界面)     │  │ (快捷操作)   │  │ (网页正文提取)    │  │
│  │ - 总结/历史  │  │ - 快速总结   │  │ - Readability.js  │  │
│  │ - 设置       │  │ - 配额显示   │  │ - 选中文字捕获   │  │
│  └──────┬───────┘  └──────┬───────┘  └─────────┬─────────┘  │
│         │                 │                     │             │
│         └─────────────────┼─────────────────────┘             │
│                           │                                   │
│              ┌────────────┴────────────┐                      │
│              │  Background SW         │                      │
│              │  - API 请求代理       │                      │
│              │  - 配额管理           │                      │
│              │  - 右键菜单注册       │                      │
│              │  - 本地缓存           │                      │
│              └────────────┬────────────┘                      │
└───────────────────────────┼──────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Express Server (Node.js)                  │
│                                                              │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────┐ │
│  │ 路由层    │  │ 中间件层  │  │ 服务层    │  │ 数据层   │ │
│  │           │  │           │  │           │  │          │ │
│  │ /summarize│  │ auth      │  │ summarize │  │ SQLite   │ │
│  │ /history  │  │ ratelimit │  │ history   │  │ Drizzle   │ │
│  │ /user     │  │ validate  │  │ user      │  │ ORM      │ │
│  └───────────┘  └───────────┘  └─────┬─────┘  └──────────┘ │
│                                      │                        │
│                              ┌───────────────┐               │
│                              │  AI Adapter   │               │
│                              │  - DeepSeek   │               │
│                              │  - 流式响应   │               │
│                              │  - 重试/降级  │               │
│                              └───────────────┘               │
└─────────────────────────────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               Web 管理端 (React SPA, V2 上线)                │
│                                                              │
│  ┌──────────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ 历史记录管理     │  │ 知识库搜索   │  │ 账号 & 订阅   │  │
│  │ - 时间线浏览     │  │ - 全文搜索   │  │ - 设备绑定    │  │
│  │ - 批量导出       │  │ - 标签管理   │  │ - 升级 Pro    │  │
│  └──────────────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Chrome Extension 内部结构

```
extension/
├── manifest.json              # Manifest V3 配置
├── src/
│   ├── sidepanel/             # Side Panel 主界面 (React)
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Summarize.tsx       # 总结页面
│   │   │   ├── History.tsx         # 历史记录
│   │   │   └── Settings.tsx        # 设置页面
│   │   └── components/
│   │       ├── SummaryResult.tsx   # 结果展示组件
│   │       ├── ModeSelector.tsx    # 输出模式切换
│   │       └── Typewriter.tsx      # 打字机效果
│   ├── content/               # Content Script
│   │   ├── index.ts
│   │   └── extractor.ts       # Readability.js 封装
│   └── background/            # Service Worker
│       ├── index.ts
│       └── contextMenu.ts     # 右键菜单逻辑
├── public/
│   └── icons/                 # 扩展图标
└── vite.config.ts
```

### 2.3 后端项目结构

```
server/
├── src/
│   ├── index.ts               # 入口，Express 启动
│   ├── config.ts              # 环境变量配置
│   ├── db/
│   │   ├── index.ts           # 数据库连接
│   │   ├── schema.ts          # Drizzle Schema 定义
│   │   └── migrate.ts         # 迁移脚本
│   ├── routes/
│   │   ├── summarize.ts       # POST /api/summarize
│   │   ├── history.ts         # GET/DELETE /api/history
│   │   └── user.ts            # 用户相关
│   ├── services/
│   │   ├── ai.ts              # AI API 调用封装
│   │   ├── extractor.ts       # 网页内容提取
│   │   └── quota.ts           # 配额检查
│   ├── middleware/
│   │   ├── auth.ts            # 简易认证
│   │   ├── rateLimit.ts       # 频率限制
│   │   └── errorHandler.ts    # 统一错误处理
│   └── types/
│       └── index.ts           # 类型定义
├── data/
│   └── summarize.db           # SQLite 数据库文件 (gitignore)
├── package.json
└── vite.config.ts
```

### 2.4 Web 管理端项目结构 (V2)

```
web/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── pages/
│   │   ├── History.tsx         # 历史记录时间线
│   │   ├── Search.tsx          # 全文搜索
│   │   └── Account.tsx         # 账号 & 订阅管理
│   └── components/
│       ├── SummaryCard.tsx     # 摘要卡片
│       └── ExportButton.tsx    # 导出按钮
├── index.html
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

---

## 三、数据库设计 (SQLite + Drizzle ORM)

### 3.1 ER 图

```
┌──────────────┐       ┌──────────────────┐
│    user      │       │    summary       │
├──────────────┤       ├──────────────────┤
│ id (PK)      │──┐    │ id (PK)          │
│ device_id    │  │    │ user_id (FK)     │
│ quota_used   │  │    │ url              │
│ quota_limit  │  │    │ title            │
│ plan         │  │    │ original_text    │
│ created_at   │  │    │ summary_text     │
│ updated_at   │  │    │ summary_mode     │
└──────────────┘  │    │ source_lang      │
                  ├───▶│ output_lang      │
                  │    │ created_at       │
                  │    └──────────────────┘
                  │
                  │    ┌──────────────────┐
                  │    │   daily_quota    │
                  │    ├──────────────────┤
                  └───▶│ id (PK)          │
                       │ user_id (FK)     │
                       │ date             │
                       │ used_count       │
                       │ limit_count      │
                       └──────────────────┘
```

### 3.2 Drizzle Schema 定义

```typescript
// server/src/db/schema.ts

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// 用户表
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  deviceId: text("device_id").notNull().unique(),
  quotaLimit: integer("quota_limit").notNull().default(5),   // 默认免费 5 次/天
  plan: text("plan").notNull().default("free"),               // free | pro
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// 总结记录表
export const summaries = sqliteTable("summaries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  url: text("url").notNull(),
  title: text("title"),
  originalTextHash: text("original_text_hash"),     // 原文 hash，用于缓存去重
  originalTextLength: integer("original_text_length"),
  summaryText: text("summary_text"),
  summaryMode: text("summary_mode").default("brief"), // brief | paragraph | bullet
  sourceLang: text("source_lang").default("auto"),
  outputLang: text("output_lang").default("zh"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// 每日配额记录表
export const dailyQuotas = sqliteTable("daily_quotas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  date: text("date").notNull(),                     // YYYY-MM-DD
  usedCount: integer("used_count").notNull().default(0),
  limitCount: integer("limit_count").notNull().default(5),
});
```

### 3.3 索引设计

```sql
-- 按用户查历史，按时间排序（最常用查询）
CREATE INDEX idx_summaries_user_time ON summaries(user_id, created_at DESC);

-- 按 URL 查找是否已有缓存（缓存去重）
CREATE INDEX idx_summaries_url ON summaries(url);

-- 每日配额查询（高频读写）
CREATE INDEX idx_daily_quotas_user_date ON daily_quotas(user_id, date);
```

---

## 四、API 设计

### 4.1 接口列表

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/summarize` | 生成摘要 | 需要 |
| POST | `/api/summarize/selection` | 选中文字总结 | 需要 |
| GET | `/api/history` | 获取历史列表 | 需要 |
| GET | `/api/history/:id` | 获取历史详情 | 需要 |
| DELETE | `/api/history/:id` | 删除历史记录 | 需要 |
| GET | `/api/user/quota` | 查询配额 | 需要 |
| POST | `/api/user/register` | 设备注册 | 不需要 |

### 4.2 核心接口详情

#### POST /api/summarize

```
Request:
{
  "url": "https://example.com/article",
  "content": "网页正文内容...",        // 由客户端提取后传入
  "mode": "bullet",                    // brief | paragraph | bullet
  "outputLang": "zh"                   // zh | en | ja
}

Response (SSE 流式):
data: {"type": "start"}
data: {"type": "token", "content": "本"}
data: {"type": "token", "content": "文"}
...
data: {"type": "done", "summary_id": 42, "quota_remaining": 3}
```

#### GET /api/history?page=1&limit=20&q=关键词

```
Response:
{
  "total": 100,
  "page": 1,
  "items": [
    {
      "id": 42,
      "title": "如何学习 TypeScript",
      "url": "https://...",
      "summaryMode": "bullet",
      "createdAt": "2026-06-11 10:30:00"
    }
  ]
}
```

---

## 五、关键流程

### 5.1 总结流程（含缓存策略）

```
用户点击「总结」
    │
    ▼
1. Content Script 使用 Readability.js 提取网页正文
    │
    ▼
2. 计算正文 hash，查 SQLite 缓存
    │
    ├── 命中缓存 → 直接返回结果（零 AI 成本）
    │
    └── 未命中
        │
        ├── 检查每日配额
        │   └── 超限 → 返回 429 + 提示升级
        │
        ├── 调用 DeepSeek API（流式）
        │   ├── 生成中 → SSE 逐字推送给前端
        │   └── 完成 → 结果写入 summaries 表
        │
        └── 每日配额 +1
```

### 5.2 用户识别方案（无需注册登录）

```
首次安装扩展 → 生成 UUID → 存储到 chrome.storage.local
                              │
每次 API 请求 → 请求头附带 device-id
                              │
服务端 → 查 users 表，不存在则自动注册
                              │
配额管理 → 基于 device-id
```

---

## 七、部署方案

| 产品 | 部署方式 | 技术 |
|------|---------|------|
| Chrome 插件 | Chrome Store 上架 | 打包 zip 上传 |
| 后端 API | 阿里云轻量服务器 | Node.js + PM2 |
| Web 管理端 | 同后端服务，静态托管 | Express 托管 dist |

---

## 七、扩展端关键配置 (manifest.json)

```json
{
  "manifest_version": 3,
  "name": "AI 网页总结助手",
  "version": "1.0.0",
  "permissions": ["sidePanel", "contextMenus", "storage", "activeTab"],
  "host_permissions": ["https://your-server.com/*"],
  "side_panel": {
    "default_path": "src/sidepanel/index.html"
  },
  "background": {
    "service_worker": "src/background/index.ts"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/index.ts"]
    }
  ]
}
```