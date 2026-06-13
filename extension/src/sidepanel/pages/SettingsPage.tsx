import { useState } from "react";
import { useAppContext } from "../store/AppContext";
import { useI18n } from "../i18n/I18nContext";
import type { UILang } from "../i18n/translations";
import type { SummaryMode, OutputLang } from "../store/AppContext";

export default function SettingsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const { state, dispatch } = useAppContext();
  const { t, lang, setLang } = useI18n();

  return (
    <>
      {/* 设置齿轮按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`absolute bottom-3 right-3 p-2 rounded-full transition-colors z-10 ${
          isOpen ? "bg-gray-200" : "hover:bg-gray-100"
        }`}
      >
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {/* 设置面板 */}
      {isOpen && (
        <div className="absolute bottom-12 right-3 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-20">
          <h3 className="text-sm font-medium text-gray-800 mb-3">{t.settings}</h3>

          {/* 界面语言 */}
          <div className="mb-3">
            <label className="text-xs text-gray-500 mb-1 block">{t.uiLanguage}</label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as UILang)}
              className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400"
            >
              <option value="zh">{t.langZH}</option>
              <option value="en">{t.langEN}</option>
              <option value="ja">{t.langJA}</option>
            </select>
          </div>

          {/* 默认输出模式 */}
          <div className="mb-3">
            <label className="text-xs text-gray-500 mb-1 block">{t.defaultMode}</label>
            <select
              value={state.settings.defaultMode}
              onChange={(e) =>
                dispatch({
                  type: "UPDATE_SETTINGS",
                  payload: { defaultMode: e.target.value as SummaryMode },
                })
              }
              className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400"
            >
              <option value="brief">{t.modeBrief}</option>
              <option value="paragraph">{t.modeParagraph}</option>
              <option value="bullet">{t.modeBullet}</option>
            </select>
          </div>

          {/* 默认输出语言 */}
          <div className="mb-3">
            <label className="text-xs text-gray-500 mb-1 block">{t.defaultOutputLang}</label>
            <select
              value={state.settings.defaultOutputLang}
              onChange={(e) =>
                dispatch({
                  type: "UPDATE_SETTINGS",
                  payload: { defaultOutputLang: e.target.value as OutputLang },
                })
              }
              className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400"
            >
              <option value="zh">{t.langZH}</option>
              <option value="en">{t.langEN}</option>
              <option value="ja">{t.langJA}</option>
              <option value="auto">{t.langAuto}</option>
            </select>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="w-full py-1.5 text-sm text-gray-500 hover:text-gray-700 bg-gray-50 rounded-lg"
          >
            {t.close}
          </button>
        </div>
      )}
    </>
  );
}