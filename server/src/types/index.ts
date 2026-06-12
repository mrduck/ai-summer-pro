export interface ApiResponse<T = unknown> {
  code: number;
  data?: T;
  message?: string;
}

export interface HistoryItem {
  id: number;
  title: string | null;
  url: string;
  summaryMode: string | null;
  createdAt: string;
  summaryPreview: string | null;
}

export interface HistoryDetail {
  id: number;
  title: string | null;
  url: string;
  summaryMode: string | null;
  summaryText: string | null;
  sourceLang: string | null;
  outputLang: string | null;
  createdAt: string;
}

export interface QuotaInfo {
  plan: string;
  dailyLimit: number;
  dailyUsed: number;
  remaining: number;
}

export type SummaryMode = "brief" | "paragraph" | "bullet";
export type OutputLang = "zh" | "en" | "ja";