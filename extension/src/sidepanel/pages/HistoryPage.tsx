import { useEffect, useCallback } from "react";
import { useAppContext } from "../store/AppContext";
import { useI18n } from "../i18n/I18nContext";
import { apiRequest } from "../api";
import SearchBar from "../components/SearchBar";
import HistoryItem from "../components/HistoryItem";
import type { HistoryItem as HistoryItemType } from "../store/AppContext";

export default function HistoryPage() {
  const { state, dispatch } = useAppContext();
  const { t } = useI18n();
  const { items, page, searchQuery, isLoading, selectedItem } = state.history;

  const fetchHistory = useCallback(
    async (pageNum: number, query: string) => {
      dispatch({ type: "SET_HISTORY_LOADING", payload: true });
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: "20",
        });
        if (query) params.set("q", query);
        const res = await apiRequest<{
          code: number;
          data: { total: number; items: HistoryItemType[] };
        }>(`/history?${params.toString()}`);
        dispatch({ type: "SET_HISTORY_ITEMS", payload: res.data });
      } catch (e) {
        dispatch({ type: "SET_HISTORY_LOADING", payload: false });
      }
    },
    [dispatch]
  );

  useEffect(() => {
    fetchHistory(page, searchQuery);
  }, [page, searchQuery, fetchHistory]);

  const handleSearch = (query: string) => {
    fetchHistory(1, query);
  };

  const handleDelete = async (id: number) => {
    try {
      await apiRequest(`/history/${id}`, { method: "DELETE" });
      dispatch({ type: "REMOVE_HISTORY_ITEM", payload: id });
    } catch (e) {
      // ignore
    }
  };

  const handleBack = () => {
    dispatch({ type: "SET_SELECTED_ITEM", payload: null });
  };

  // 详情视图
  if (selectedItem) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <button onClick={handleBack} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-medium text-gray-800 truncate flex-1">
            {selectedItem.title || t.noTitle}
          </span>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          <p className="text-xs text-gray-400 mb-3">{selectedItem.url}</p>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {selectedItem.summaryText}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <SearchBar onSearch={handleSearch} />
      <div className="flex-1 overflow-y-auto">
        {isLoading && items.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            {t.loading}
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            {searchQuery ? t.noMatch : t.noRecords}
          </div>
        ) : (
          items.map((item) => (
            <HistoryItem key={item.id} item={item} onDelete={handleDelete} />
          ))
        )}
      </div>
      {state.history.total > items.length && (
        <div className="p-3 text-center">
          <button
            onClick={() => dispatch({ type: "SET_HISTORY_PAGE", payload: page + 1 })}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {t.loadMore}
          </button>
        </div>
      )}
    </div>
  );
}