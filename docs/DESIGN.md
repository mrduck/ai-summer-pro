# AI 网页总结助手 — 详细设计文档

> 版本：v1.0  
> 状态：MVP 阶段  
> 更新日期：2026-06-11

---

## 一、产品形态确认

```
┌────────────────────────────────────────────┐
│             Chrome 插件 (主入口)            │
│  浏览网页 → Side Panel → 一键总结 → 结果  │
│  选中文字 → 右键菜单 → AI 总结             │
└──────────────────┬─────────────────────────┘
                   │ 同一后端 API
                   ▼
┌────────────────────────────────────────────┐
│           Web 管理端 (V2, 辅助)             │
│  查看历史 / 全文搜索 / 导出 / 账号管理     │
└────────────────────────────────────────────┘
```

- **V1 (MVP)**：只做 Chrome 插件 + 后端 API
- **V2**：加上 Web 管理端

---

## 二、API 接口契约

### 2.1 设备注册

```
POST /api/user/register
```

**Request**
```json
{
  "deviceId": "uuid-from-extension"
}
```

**Response** `200`
```json
{
  "code": 0,
  "data": {
    "deviceId": "a1b2c3d4-...",
    "plan": "free",
    "dailyLimit": 5,
    "dailyUsed": 0,
    "createdAt": "2026-06-11T10:00:00Z"
  }
}
```

---

### 2.2 查询配额

```
GET /api/user/quota
Header: X-Device-Id: a1b2c3d4-...
```

**Response** `200`
```json
{
  "code": 0,
  "data": {
    "plan": "free",
    "dailyLimit": 5,
    "dailyUsed": 2,
    "remaining": 3
  }
}
```

---

### 2.3 生成摘要（流式）

```
POST /api/summarize
Header: X-Device-Id: a1b2c3d4-...
```

**Request**
```json
{
  "url": "https://example.com/article/123",
  "title": "如何学习 TypeScript",
  "content": "TypeScript 是 JavaScript 的超集... (全文，截断至 8000 字)",
  "mode": "bullet",
  "outputLang": "zh"
}
```

**Response** `200` — SSE (Server-Sent Events)

```
event: start
data: {"summaryId": 42}

event: token
data: {"content": "本"}

event: token
data: {"content": "文"}

... (逐 token 推送)

event: done
data: {"summaryId": 42, "quotaRemaining": 3}

event: error
data: {"code": 429, "message": "今日配额已用完，请升级 Pro"}
```

**mode 枚举**: `brief` | `paragraph` | `bullet`

---

### 2.4 选中文字总结

```
POST /api/summarize/selection
Header: X-Device-Id: a1b2c3d4-...
```

**Request**
```json
{
  "text": "用户选中的文字内容...",
  "context": "选中的文字 (可选，提供上下文)",
  "mode": "brief",
  "outputLang": "zh"
}
```

**Response**: 同 2.3，SSE 流式

---

### 2.5 获取历史列表

```
GET /api/history?page=1&limit=20&q=typescript
Header: X-Device-Id: a1b2c3d4-...
```

**Response** `200`
```json
{
  "code": 0,
  "data": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "items": [
      {
        "id": 42,
        "title": "如何学习 TypeScript",
        "url": "https://example.com/article/123",
        "summaryMode": "bullet",
        "createdAt": "2026-06-11T10:30:00Z",
        "summaryPreview": "本文介绍了 TypeScript 的核心概念..."
      }
    ]
  }
}
```

---

### 2.6 获取历史详情

```
GET /api/history/:id
Header: X-Device-Id: a1b2c3d4-...
```

**Response** `200`
```json
{
  "code": 0,
  "data": {
    "id": 42,
    "title": "如何学习 TypeScript",
    "url": "https://example.com/article/123",
    "summaryMode": "bullet",
    "summaryText": "- 类型系统是 TS 的核心...",
    "sourceLang": "zh",
    "outputLang": "zh",
    "createdAt": "2026-06-11T10:30:00Z"
  }
}
```

---

### 2.7 删除历史记录

```
DELETE /api/history/:id
Header: X-Device-Id: a1b2c3d4-...
```

**Response** `200`
```json
{
  "code": 0,
  "message": "ok"
}
```

---

### 2.8 错误码汇总

| HTTP 状态码 | code | 说明 |
|------------|------|------|
| 200 | 0 | 成功 |
| 400 | 1001 | 参数缺失 |
| 400 | 1002 | content 为空或过短 |
| 400 | 1003 | mode 值无效 |
| 401 | 2001 | 缺少 X-Device-Id |
| 429 | 3001 | 今日配额用完 |
| 429 | 3002 | 请求过于频繁（每秒限 1 次） |
| 500 | 9001 | AI API 调用失败 |
| 500 | 9999 | 服务器内部错误 |

---

## 三、组件树 & UI 设计

### 3.1 Side Panel 页面结构

```
SidePanel
├── TabBar                         # 顶部 Tab 切换
│   ├── Tab("总结")
│   └── Tab("历史")
│
├── SummarizePage                  # [Tab: 总结]
│   ├── UrlDisplay                 # 当前页面 URL + 标题
│   ├── ModeSelector               # 输出模式：一句话 | 段落 | 要点
│   ├── SummarizeButton            # 「总结本页」按钮
│   ├── SummaryResult              # 结果展示区
│   │   ├── Typewriter             # 打字机流式渲染
│   │   ├── CopyButton             # 复制按钮
│   │   └── SaveIndicator         # 「已保存到历史」
│   └── QuotaBar                   # 底部配额显示：今日剩余 3/5 次
│
├── HistoryPage                    # [Tab: 历史]
│   ├── SearchBar                  # 搜索框
│   ├── HistoryList                # 历史列表 (虚拟滚动)
│   │   └── HistoryItem * N       # 每条记录
│   │       ├── Title
│   │       ├── Url
│   │       ├── SummaryPreview
│   │       ├── TimeAgo
│   │       └── DeleteButton
│   └── Pagination / LoadMore     # 分页
│
└── SettingsButton (⚙️)            # 右下角齿轮 → SettingsPage
    └── SettingsPage
        ├── DefaultModeSelector
        ├── DefaultLangSelector
        └── ApiKeyInput (可选)
```

### 3.2 组件规格

#### SummarizeButton

| 属性 | 说明 |
|------|------|
| 状态 | idle / loading / disabled(配额耗尽) |
| idle | 蓝色按钮，文字「总结本页」 |
| loading | 显示旋转动画 + 「生成中...」 |
| disabled | 灰色，文字「今日次数已用完」，点击跳转升级提示 |

#### ModeSelector

```
[ 一句话 ]  [ 段落 ]  [ 结构化要点 ]
    ▲
  选中态：蓝色高亮，其他灰色
```

- 默认值从 Settings 读取
- 切换立即生效，不会重新生成（除非用户再次点击总结）

#### SummaryResult

```
┌─────────────────────────────────┐
│  📋 总结结果          [📋 复制] │
│                                 │
│  - 核心观点一                    │
│  - 核心观点二                    │
│  - 核心观点三                    │
│                                 │
│  ✓ 已保存到历史记录              │
└─────────────────────────────────┘
```

- Typewriter 效果：逐 token 渲染，模拟打字
- 完成后显示「复制」和「已保存」指示
- 复制时 toast 提示「已复制」

#### QuotaBar

```
┌─────────────────────────────────┐
│  今日剩余 3/5 次    [升级 Pro]  │
└─────────────────────────────────┘
```

- 进度条样式，视觉展示用量
- 点击「升级 Pro」弹出付费页面（V2）

#### HistoryItem

```
┌─────────────────────────────────┐
│  如何学习 TypeScript        🗑  │
│  example.com/article/123        │
│  本文介绍了 TypeScript 的...     │
│  2 小时前                       │
└─────────────────────────────────┘
```

- 点击：跳转到详情展示完整摘要
- 🗑 按钮：确认后删除

---

## 四、数据流

### 4.1 总结流程（完整数据流）

```
用户点击「总结本页」
    │
    ▼
SummarizePage.onSummarize()
    │
    ├── 1. 向 Content Script 发送消息: GET_PAGE_CONTENT
    │       │
    │       └── Content Script 收到消息
    │           ├── Readability.js 解析 DOM → { title, content, textLength }
    │           └── 返回给 Side Panel
    │
    ├── 2. Side Panel 收到页面内容
    │       ├── setLoading(true)
    │       └── POST /api/summarize { url, title, content, mode, outputLang }
    │
    ├── 3. 后端处理
    │       ├── 检查 X-Device-Id → 查 users 表 → 查 daily_quotas 表
    │       ├── 配额检查通过
    │       ├── 计算 content hash → 查 summaries 缓存
    │       │   ├── 命中 → 直接返回已有结果
    │       │   └── 未命中 → 调用 DeepSeek API (SSE)
    │       ├── AI 返回 → 写入 summaries 表
    │       └── daily_quotas.used_count + 1
    │
    ├── 4. Side Panel 接收 SSE
    │       ├── event:start  → 显示加载态
    │       ├── event:token  → Typewriter 追加文字
    │       └── event:done   → setLoading(false), 更新 QuotaBar
    │
    └── 5. 完成
            ├── 结果展示在 SummaryResult
            └── QuotaBar 刷新剩余次数
```

### 4.2 选中文字总结流程

```
用户选中文字 → 右键 → 「AI 总结选中内容」
    │
    ▼
Background SW 收到 contextMenus.onClicked
    │
    ├── 获取选中文字
    └── 打开 Side Panel + 传递 { text, contextUrl }
            │
            ▼
Side Panel 收到 → 自动填充模式为「一句话」
    │
    └── POST /api/summarize/selection → 同 4.1 的 SSE 流程
```

### 4.3 扩展内部通信

```
Side Panel ───chrome.runtime.sendMessage───→ Content Script
                                              (获取页面内容)

Content Script ───chrome.runtime.sendMessage───→ Side Panel
                                                  (返回正文)

Background SW ───chrome.runtime.sendMessage───→ Side Panel
  (右键菜单触发)                                 (通知总结选中文字)

Side Panel ───chrome.storage.local───→ 本地存储
  (保存用户设置)
```

---

## 五、状态管理 (Side Panel)

### 5.1 状态结构

```typescript
interface AppState {
  // 总结页
  summarize: {
    pageContent: { title: string; content: string } | null;
    isLoading: boolean;
    result: string | null;
    resultMode: "brief" | "paragraph" | "bullet";
    selectedMode: "brief" | "paragraph" | "bullet";
    error: string | null;
  };

  // 历史页
  history: {
    items: HistoryItem[];
    total: number;
    page: number;
    searchQuery: string;
    isLoading: boolean;
    selectedItem: HistoryItem | null;   // 查看详情
    isDeleting: number | null;           // 正在删除的 id
  };

  // 配额
  quota: {
    dailyLimit: number;
    dailyUsed: number;
    plan: "free" | "pro";
  };

  // 用户设置
  settings: {
    defaultMode: "brief" | "paragraph" | "bullet";
    defaultOutputLang: "zh" | "en" | "ja";
  };

  // 全局
  activeTab: "summarize" | "history";
  deviceId: string;
}
```

### 5.2 状态管理方案

不做 Redux/Zustand，MVP 用 **React Context + useReducer**，够用且零依赖。

```typescript
// extension/src/sidepanel/store/AppContext.tsx
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}>(/* ... */);
```

---

## 六、扩展端关键交互细节

### 6.1 Side Panel 打开时自动获取页面内容

```typescript
// Side Panel 加载时
useEffect(() => {
  // 获取当前激活标签页的页面信息
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    // 注入 Content Script 提取正文
    chrome.tabs.sendMessage(tab.id!, { type: "GET_PAGE_CONTENT" }, (response) => {
      if (response) {
        dispatch({ type: "SET_PAGE_CONTENT", payload: response });
      }
    });
  });
}, []);
```

### 6.2 缓存逻辑

```
相同 URL + 相同 mode → 直接返回历史结果，不消耗 AI API
    │
    判断依据: summaries.original_text_hash
```

### 6.3 文本截断策略

```
Readability.js 提取正文
    │
    ├── textLength ≤ 8000 字符 → 全文发送
    ├── textLength > 8000   → 截取前 8000 字符
    └── textLength < 100    → 提示「页面内容过短，无法总结」
```

---

## 七、项目初始化顺序

```
1. 初始化 monorepo 根目录
   npm init → package.json (workspaces)

2. 创建 server/ 
   Express + TypeScript + Drizzle + SQLite

3. 创建 extension/
   Vite + CRXJS + React + TailwindCSS

4. 联调：扩展 → 后端 API → DeepSeek
```

---

## 八、文件清单（MVP 完成后应包含）

```
pro-v3/
├── package.json                  # monorepo 根
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   └── DESIGN.md                 # 本文件
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts
│   │   ├── config.ts
│   │   ├── db/
│   │   │   ├── index.ts
│   │   │   ├── schema.ts
│   │   │   └── seed.ts
│   │   ├── routes/
│   │   │   ├── summarize.ts
│   │   │   ├── history.ts
│   │   │   └── user.ts
│   │   ├── services/
│   │   │   ├── ai.ts
│   │   │   └── quota.ts
│   │   ├── middleware/
│   │   │   ├── deviceAuth.ts
│   │   │   ├── rateLimit.ts
│   │   │   └── errorHandler.ts
│   │   └── types/
│   │       └── index.ts
│   └── data/                     # gitignore
│       └── summarize.db
├── extension/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── manifest.json
│   ├── public/
│   │   └── icons/
│   └── src/
│       ├── sidepanel/
│       │   ├── index.html
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── store/
│       │   │   └── AppContext.tsx
│       │   ├── pages/
│       │   │   ├── SummarizePage.tsx
│       │   │   ├── HistoryPage.tsx
│       │   │   └── SettingsPage.tsx
│       │   ├── components/
│       │   │   ├── ModeSelector.tsx
│       │   │   ├── SummarizeButton.tsx
│       │   │   ├── SummaryResult.tsx
│       │   │   ├── Typewriter.tsx
│       │   │   ├── QuotaBar.tsx
│       │   │   ├── HistoryItem.tsx
│       │   │   └── SearchBar.tsx
│       │   └── hooks/
│       │       ├── useQuota.ts
│       │       └── useSSE.ts
│       ├── content/
│       │   └── index.ts
│       └── background/
│           └── index.ts
└── web/                          # V2
    └── ...
```