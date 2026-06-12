import { useAppContext } from "../store/AppContext";
import { useI18n } from "../i18n/I18nContext";

export default function SearchBar({ onSearch }: { onSearch: (query: string) => void }) {
  const { state, dispatch } = useAppContext();
  const { t } = useI18n();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: "SET_SEARCH_QUERY", payload: e.target.value });
    onSearch(e.target.value);
  };

  return (
    <div className="px-4 py-2">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={state.history.searchQuery}
          onChange={handleChange}
          placeholder={t.searchPlaceholder}
          className="w-full pl-10 pr-3 py-2 text-sm bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
        />
      </div>
    </div>
  );
}