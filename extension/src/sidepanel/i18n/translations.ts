export type UILang = "zh" | "en" | "ja";

export type TranslationKey = keyof typeof translations.zh;

export const translations = {
  zh: {
    // Tab
    tabSummarize: "总结",
    tabHistory: "历史",

    // ModeSelector
    modeBrief: "一句话",
    modeParagraph: "段落",
    modeBullet: "结构化要点",

    // SummarizeButton
    summarizePage: "总结本页",
    generating: "生成中...",
    quotaExhausted: "今日次数已用完",

    // SummarizePage
    extractedInfo: (count: number, chars: number) =>
      `已提取 ${count} 个段落，共 ${chars} 字`,
    cannotGetPage: "无法获取当前页面",
    cannotExtractContent: "无法提取页面内容，请尝试手动选中文字后使用右键菜单总结",

    // SummaryResult
    aiSummary: "AI 总结",
    copy: "复制",
    copied: "已复制",
    generatingSummary: "正在生成总结...",
    characters: "字",
    savedToHistory: "已保存到历史记录",
    refTooltip: (refs: string) => `${refs} — 点击跳转到原文`,

    // QuotaBar
    todayRemaining: "今日剩余",
    times: "次",
    upgradePro: "升级 Pro",

    // SettingsPage
    settings: "设置",
    defaultMode: "默认输出模式",
    defaultOutputLang: "默认输出语言",
    close: "关闭",
    langZH: "中文",
    langEN: "English",
    langJA: "日本語",
    uiLanguage: "界面语言",

    // HistoryPage
    noTitle: "无标题",
    loading: "加载中...",
    noRecords: "暂无历史记录",
    noMatch: "未找到匹配记录",
    loadMore: "加载更多",

    // SearchBar
    searchPlaceholder: "搜索历史记录...",

    // TimeAgo
    justNow: "刚刚",
    minutesAgo: (n: number) => `${n} 分钟前`,
    hoursAgo: (n: number) => `${n} 小时前`,
    daysAgo: (n: number) => `${n} 天前`,
  },

  en: {
    // Tab
    tabSummarize: "Summary",
    tabHistory: "History",

    // ModeSelector
    modeBrief: "One-liner",
    modeParagraph: "Paragraph",
    modeBullet: "Bullet Points",

    // SummarizeButton
    summarizePage: "Summarize",
    generating: "Generating...",
    quotaExhausted: "Daily quota used up",

    // SummarizePage
    extractedInfo: (count: number, chars: number) =>
      `Extracted ${count} paragraphs, ${chars} chars`,
    cannotGetPage: "Cannot access current page",
    cannotExtractContent:
      "Cannot extract page content. Try selecting text manually and use the context menu.",

    // SummaryResult
    aiSummary: "AI Summary",
    copy: "Copy",
    copied: "Copied",
    generatingSummary: "Generating summary...",
    characters: "chars",
    savedToHistory: "Saved to history",
    refTooltip: (refs: string) => `${refs} — Click to jump to source`,

    // QuotaBar
    todayRemaining: "Today",
    times: "",
    upgradePro: "Upgrade",

    // SettingsPage
    settings: "Settings",
    defaultMode: "Default Output Mode",
    defaultOutputLang: "Default Output Language",
    close: "Close",
    langZH: "中文",
    langEN: "English",
    langJA: "日本語",
    uiLanguage: "UI Language",

    // HistoryPage
    noTitle: "Untitled",
    loading: "Loading...",
    noRecords: "No history",
    noMatch: "No matching records",
    loadMore: "Load More",

    // SearchBar
    searchPlaceholder: "Search history...",

    // TimeAgo
    justNow: "just now",
    minutesAgo: (n: number) => `${n}m ago`,
    hoursAgo: (n: number) => `${n}h ago`,
    daysAgo: (n: number) => `${n}d ago`,
  },

  ja: {
    // Tab
    tabSummarize: "要約",
    tabHistory: "履歴",

    // ModeSelector
    modeBrief: "一文",
    modeParagraph: "段落",
    modeBullet: "箇条書き",

    // SummarizeButton
    summarizePage: "要約する",
    generating: "生成中...",
    quotaExhausted: "本日の利用回数終了",

    // SummarizePage
    extractedInfo: (count: number, chars: number) =>
      `${count}段落を抽出、${chars}文字`,
    cannotGetPage: "ページにアクセスできません",
    cannotExtractContent:
      "コンテンツを抽出できません。テキストを選択して右クリックメニューをお試しください。",

    // SummaryResult
    aiSummary: "AI 要約",
    copy: "コピー",
    copied: "コピー済み",
    generatingSummary: "要約を生成中...",
    characters: "文字",
    savedToHistory: "履歴に保存済み",
    refTooltip: (refs: string) => `${refs} — クリックで原文にジャンプ`,

    // QuotaBar
    todayRemaining: "本日残り",
    times: "回",
    upgradePro: "アップグレード",

    // SettingsPage
    settings: "設定",
    defaultMode: "デフォルト出力モード",
    defaultOutputLang: "デフォルト出力言語",
    close: "閉じる",
    langZH: "中文",
    langEN: "English",
    langJA: "日本語",
    uiLanguage: "UI言語",

    // HistoryPage
    noTitle: "無題",
    loading: "読み込み中...",
    noRecords: "履歴がありません",
    noMatch: "一致するレコードがありません",
    loadMore: "もっと読み込む",

    // SearchBar
    searchPlaceholder: "履歴を検索...",

    // TimeAgo
    justNow: "たった今",
    minutesAgo: (n: number) => `${n}分前`,
    hoursAgo: (n: number) => `${n}時間前`,
    daysAgo: (n: number) => `${n}日前`,
  },
};