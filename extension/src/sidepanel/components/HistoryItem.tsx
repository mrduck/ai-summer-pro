import { useAppContext, HistoryItem as HistoryItemType, HistoryDetail } from "../store/AppContext";
import { useI18n } from "../i18n/I18nContext";
import { apiRequest } from "../api";

export default function HistoryItem({
  item,
  onDelete,
}: {
  item: HistoryItemType;
  onDelete: (id: number) => void;
}) {
  const { dispatch } = useAppContext();
  const { t } = useI18n();

  const handleClick = async () => {
    try {
      const res = await apiRequest<{ code: number; data: HistoryDetail }>(`/history/${item.id}`);
      dispatch({ type: "SET_SELECTED_ITEM", payload: res.data });
    } catch (e) {
      // ignore
    }
  };

  const timeAgo = (() => {
    const date = new Date(item.createdAt);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t.justNow;
    if (minutes < 60) return t.minutesAgo(minutes);
    if (hours < 24) return t.hoursAgo(hours);
    if (days < 30) return t.daysAgo(days);
    return date.toLocaleDateString();
  })();
  const domain = getDomain(item.url);

  return (
    <div className="border-b border-gray-100 py-3 px-4 hover:bg-gray-50 cursor-pointer transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0" onClick={handleClick}>
          <p className="text-sm font-medium text-gray-800 truncate">{item.title || t.noTitle}</p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{domain}</p>
          {item.summaryPreview && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.summaryPreview}</p>
          )}
          <p className="text-xs text-gray-300 mt-1">{timeAgo}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          className="text-gray-300 hover:text-red-500 transition-colors p-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}