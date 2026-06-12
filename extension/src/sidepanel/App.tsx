import { useEffect } from "react";
import { AppProvider, useAppContext } from "./store/AppContext";
import { useI18n } from "./i18n/I18nContext";
import { getOrCreateDeviceId } from "./api";
import SummarizePage from "./pages/SummarizePage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";

function AppContent() {
  const { state, dispatch } = useAppContext();
  const { t } = useI18n();

  useEffect(() => {
    // 初始化 deviceId 和配额
    async function init() {
      const deviceId = await getOrCreateDeviceId();
      dispatch({ type: "SET_DEVICE_ID", payload: deviceId });

      try {
        const { defaultMode, defaultOutputLang } = state.settings;
        dispatch({
          type: "UPDATE_SETTINGS",
          payload: { defaultMode, defaultOutputLang },
        });
      } catch (e) {
        // ignore
      }
    }
    init();
  }, []);

  return (
    <div className="relative flex flex-col h-screen bg-white">
      {/* Tab Bar */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => dispatch({ type: "SET_ACTIVE_TAB", payload: "summarize" })}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            state.activeTab === "summarize"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {t.tabSummarize}
        </button>
        <button
          onClick={() => dispatch({ type: "SET_ACTIVE_TAB", payload: "history" })}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            state.activeTab === "history"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {t.tabHistory}
        </button>
      </div>

      {/* Content - pb-12 为底部设置按钮留出空间 */}
      <div className="flex-1 overflow-y-auto pb-12">
        {state.activeTab === "summarize" && <SummarizePage />}
        {state.activeTab === "history" && <HistoryPage />}
      </div>

      {/* Settings */}
      <SettingsPage />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}