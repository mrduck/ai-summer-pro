import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { translations, UILang } from "./translations";

const STORAGE_KEY = "ui_lang";

function detectBrowserLang(): UILang {
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("zh")) return "zh";
  if (lang.startsWith("ja")) return "ja";
  return "en";
}

function getStoredLang(): UILang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "zh" || stored === "en" || stored === "ja") return stored;
  } catch {}
  return detectBrowserLang();
}

interface I18nContextType {
  lang: UILang;
  setLang: (lang: UILang) => void;
  t: (typeof translations)["zh"];
}

const I18nContext = createContext<I18nContextType>({
  lang: "zh",
  setLang: () => {},
  t: translations.zh,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<UILang>(getStoredLang);

  const setLang = useCallback((newLang: UILang) => {
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch {}
  }, []);

  // 监听 storage 变化（其他 tab 切换语言时同步）
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === "zh" || e.newValue === "en" || e.newValue === "ja")) {
        setLangState(e.newValue);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const value: I18nContextType = {
    lang,
    setLang,
    t: translations[lang],
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}