import { useAppContext } from "../store/AppContext";
import { useI18n } from "../i18n/I18nContext";
import type { SummaryMode } from "../store/AppContext";

export default function ModeSelector() {
  const { state, dispatch } = useAppContext();
  const { t } = useI18n();

  const modes: { key: SummaryMode; label: string }[] = [
    { key: "brief", label: t.modeBrief },
    { key: "paragraph", label: t.modeParagraph },
    { key: "bullet", label: t.modeBullet },
  ];

  return (
    <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
      {modes.map((m) => (
        <button
          key={m.key}
          onClick={() => dispatch({ type: "SET_SELECTED_MODE", payload: m.key })}
          className={`flex-1 py-1.5 px-2 text-xs rounded-md transition-colors ${
            state.summarize.selectedMode === m.key
              ? "bg-white text-blue-600 shadow-sm font-medium"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}