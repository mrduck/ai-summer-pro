import React, { createContext, useContext, useReducer, ReactNode } from "react";

// ============ 状态类型 ============

export type SummaryMode = "brief" | "paragraph" | "bullet";
export type OutputLang = "zh" | "en" | "ja" | "auto";

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

export interface ExtractedParagraph {
  text: string;
  xpath: string;
}

export interface ParagraphRef {
  index: number;
  text: string;
}

export interface PageContent {
  title: string;
  content: string;
  url: string;
  paragraphs?: ExtractedParagraph[];
}

interface SummarizeState {
  pageContent: PageContent | null;
  isLoading: boolean;
  result: string | null;
  selectedMode: SummaryMode;
  error: string | null;
  paragraphRefs: ParagraphRef[];   // AI 返回的段落引用
}

interface HistoryState {
  items: HistoryItem[];
  total: number;
  page: number;
  searchQuery: string;
  isLoading: boolean;
  selectedItem: HistoryDetail | null;
}

interface QuotaState {
  dailyLimit: number;
  dailyUsed: number;
  remaining: number;
  plan: string;
}

interface SettingsState {
  defaultMode: SummaryMode;
  defaultOutputLang: OutputLang;
}

export interface AppState {
  activeTab: "summarize" | "history";
  deviceId: string;
  summarize: SummarizeState;
  history: HistoryState;
  quota: QuotaState;
  settings: SettingsState;
}

// ============ Action 类型 ============

type AppAction =
  | { type: "SET_ACTIVE_TAB"; payload: "summarize" | "history" }
  | { type: "SET_DEVICE_ID"; payload: string }
  // 总结
  | { type: "SET_PAGE_CONTENT"; payload: PageContent }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "APPEND_RESULT"; payload: string }
  | { type: "SET_RESULT"; payload: string }
  | { type: "CLEAR_RESULT" }
  | { type: "SET_SUMMARIZE_ERROR"; payload: string }
  | { type: "SET_SELECTED_MODE"; payload: SummaryMode }
  | { type: "SET_PARAGRAPH_REFS"; payload: ParagraphRef[] }
  // 历史
  | { type: "SET_HISTORY_ITEMS"; payload: { items: HistoryItem[]; total: number } }
  | { type: "SET_HISTORY_LOADING"; payload: boolean }
  | { type: "SET_SEARCH_QUERY"; payload: string }
  | { type: "SET_SELECTED_ITEM"; payload: HistoryDetail | null }
  | { type: "REMOVE_HISTORY_ITEM"; payload: number }
  | { type: "SET_HISTORY_PAGE"; payload: number }
  // 配额
  | { type: "SET_QUOTA"; payload: QuotaState }
  // 设置
  | { type: "UPDATE_SETTINGS"; payload: Partial<SettingsState> };

// ============ 初始状态 ============

const initialState: AppState = {
  activeTab: "summarize",
  deviceId: "",
  summarize: {
    pageContent: null,
    isLoading: false,
    result: null,
    selectedMode: "bullet",
    error: null,
    paragraphRefs: [],
  },
  history: {
    items: [],
    total: 0,
    page: 1,
    searchQuery: "",
    isLoading: false,
    selectedItem: null,
  },
  quota: {
    dailyLimit: 5,
    dailyUsed: 0,
    remaining: 5,
    plan: "free",
  },
  settings: {
    defaultMode: "bullet",
    defaultOutputLang: "auto",
  },
};

// ============ Reducer ============

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_ACTIVE_TAB":
      return { ...state, activeTab: action.payload };
    case "SET_DEVICE_ID":
      return { ...state, deviceId: action.payload };
    case "SET_PAGE_CONTENT":
      return {
        ...state,
        summarize: { ...state.summarize, pageContent: action.payload, error: null },
      };
    case "SET_LOADING":
      return { ...state, summarize: { ...state.summarize, isLoading: action.payload } };
    case "APPEND_RESULT":
      return {
        ...state,
        summarize: {
          ...state.summarize,
          result: (state.summarize.result || "") + action.payload,
        },
      };
    case "SET_RESULT":
      return { ...state, summarize: { ...state.summarize, result: action.payload } };
    case "CLEAR_RESULT":
      return {
        ...state,
        summarize: { ...state.summarize, result: null, error: null, paragraphRefs: [] },
      };
    case "SET_SUMMARIZE_ERROR":
      return {
        ...state,
        summarize: { ...state.summarize, isLoading: false, error: action.payload },
      };
    case "SET_SELECTED_MODE":
      return { ...state, summarize: { ...state.summarize, selectedMode: action.payload } };
    case "SET_PARAGRAPH_REFS":
      return { ...state, summarize: { ...state.summarize, paragraphRefs: action.payload } };
    case "SET_HISTORY_ITEMS":
      return {
        ...state,
        history: {
          ...state.history,
          items: action.payload.items,
          total: action.payload.total,
          isLoading: false,
        },
      };
    case "SET_HISTORY_LOADING":
      return { ...state, history: { ...state.history, isLoading: action.payload } };
    case "SET_SEARCH_QUERY":
      return { ...state, history: { ...state.history, searchQuery: action.payload, page: 1 } };
    case "SET_SELECTED_ITEM":
      return { ...state, history: { ...state.history, selectedItem: action.payload } };
    case "REMOVE_HISTORY_ITEM":
      return {
        ...state,
        history: {
          ...state.history,
          items: state.history.items.filter((i) => i.id !== action.payload),
        },
      };
    case "SET_HISTORY_PAGE":
      return { ...state, history: { ...state.history, page: action.payload } };
    case "SET_QUOTA":
      return { ...state, quota: action.payload };
    case "UPDATE_SETTINGS":
      return { ...state, settings: { ...state.settings, ...action.payload } };
    default:
      return state;
  }
}

// ============ Context ============

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType>({
  state: initialState,
  dispatch: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  return useContext(AppContext);
}