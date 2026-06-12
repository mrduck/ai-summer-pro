import { useAppContext } from "../store/AppContext";
import { useI18n } from "../i18n/I18nContext";

export default function SummarizeButton({ onSummarize }: { onSummarize: () => void }) {
  const { state } = useAppContext();
  const { t } = useI18n();
  const { isLoading } = state.summarize;
  const { remaining } = state.quota;

  const disabled = remaining <= 0 && !isLoading;

  return (
    <button
      onClick={onSummarize}
      disabled={disabled || isLoading}
      className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${
        disabled
          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
          : isLoading
          ? "bg-blue-400 text-white cursor-wait"
          : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
      }`}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {t.generating}
        </span>
      ) : disabled ? (
        t.quotaExhausted
      ) : (
        t.summarizePage
      )}
    </button>
  );
}