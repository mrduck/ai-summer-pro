import { useEffect } from "react";
import { useAppContext } from "../store/AppContext";
import { useI18n } from "../i18n/I18nContext";
import type { ExtractedParagraph, ParagraphRef } from "../store/AppContext";
import { fetchSSE, apiRequest } from "../api";
import ModeSelector from "../components/ModeSelector";
import SummarizeButton from "../components/SummarizeButton";
import SummaryResult from "../components/SummaryResult";
import QuotaBar from "../components/QuotaBar";

async function injectAndExtractContent(tabId: number): Promise<{
  title: string;
  content: string;
  url: string;
  paragraphs: ExtractedParagraph[];
} | null> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        function getXPath(element: HTMLElement): string {
          if (!element || element.nodeType !== Node.ELEMENT_NODE) return "";
          const parts: string[] = [];
          let current: HTMLElement | null = element;
          while (current && current.nodeType === Node.ELEMENT_NODE) {
            let count = 1;
            let sibling = current.previousElementSibling;
            while (sibling) {
              if (sibling.tagName === current.tagName) count++;
              sibling = sibling.previousElementSibling;
            }
            const tagName = current.tagName.toLowerCase();
            parts.unshift(count > 1 ? `${tagName}[${count}]` : tagName);
            if (current.tagName === "HTML") break;
            current = current.parentElement;
          }
          return `/${parts.join("/")}`;
        }

        function findMainElement(): HTMLElement | null {
          const selectors = [
            "article",
            "main",
            "[role='main']",
            ".post-content",
            ".article-content",
            ".article-body",
            ".entry-content",
            ".markdown-body",
            ".post-detail",
            ".post-body",
            "#content",
            "#article",
            ".post",
            ".content",
            ".container",
            "#__next",
            "#app",
          ];

          for (const sel of selectors) {
            const el = document.querySelector(sel) as HTMLElement | null;
            if (el) {
              const text = (el.innerText || "").trim();
              if (text.length > 200) return el;
            }
          }

          const candidates = Array.from(
            document.querySelectorAll("div, section, article, main")
          ) as HTMLElement[];
          let best = "";
          let bestEl: HTMLElement | null = null;
          for (const el of candidates) {
            const t = (el.innerText || "").trim();
            if (t.length > best.length && t.length < 50000) {
              best = t;
              bestEl = el;
            }
          }
          return bestEl;
        }

        const mainElement = findMainElement();
        if (!mainElement) {
          return { title: document.title || "", content: "", url: window.location.href, paragraphs: [] };
        }

        // 只提取 p, h1-h6, li 元素（过滤掉导航、评论等 div 噪音）
        const pElements = mainElement.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li");
        const paragraphs: { text: string; xpath: string }[] = [];

        pElements.forEach((el) => {
          const text = (el.textContent || "").trim();
          if (text.length > 30) {
            paragraphs.push({ text, xpath: getXPath(el as HTMLElement) });
          }
        });

        const content = paragraphs.map((p) => p.text).join("\n\n");

        return {
          title: document.title || "",
          content,
          url: window.location.href,
          paragraphs,
        };
      },
    });

    if (results?.[0]?.result) {
      return results[0].result as {
        title: string;
        content: string;
        url: string;
        paragraphs: ExtractedParagraph[];
      };
    }
    return null;
  } catch (e) {
    console.error("injectAndExtractContent error:", e);
    return null;
  }
}

async function scrollToParagraph(tabId: number, xpath: string) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (xp: string) => {
        const element = document.evaluate(
          xp,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue as HTMLElement;
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          const origBg = element.style.backgroundColor;
          element.style.backgroundColor = "#fef3c7";
          element.style.transition = "background-color 0.5s";
          setTimeout(() => {
            element.style.backgroundColor = origBg;
          }, 2500);
        }
      },
      args: [xpath],
    });
  } catch (e) {
    console.error("scrollToParagraph error:", e);
  }
}

export default function SummarizePage() {
  const { state, dispatch } = useAppContext();
  const { t } = useI18n();

  // 提取当前标签页内容并更新到全局状态
  async function fetchPageContent() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    const result = await injectAndExtractContent(tab.id);
    if (result?.content) {
      dispatch({
        type: "SET_PAGE_CONTENT",
        payload: {
          title: result.title || tab.title || "",
          content: result.content,
          url: result.url || tab.url || "",
          paragraphs: result.paragraphs || [],
        },
      });
    }
  }

  useEffect(() => {
    fetchPageContent();
    fetchQuota();

    // 监听标签页切换：当用户切到新标签页或当前标签页 URL 变化时，自动刷新提取的内容
    const handleTabActivated = () => {
      fetchPageContent();
    };
    const handleTabUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      // 只在 URL 变化且页面加载完成时刷新
      if (changeInfo.status === "complete" || changeInfo.url) {
        chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
          if (activeTab?.id === tabId) {
            fetchPageContent();
          }
        });
      }
    };

    chrome.tabs.onActivated.addListener(handleTabActivated);
    chrome.tabs.onUpdated.addListener(handleTabUpdated);

    return () => {
      chrome.tabs.onActivated.removeListener(handleTabActivated);
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
    };
  }, []);

  async function fetchQuota() {
    try {
      const res = await apiRequest<{
        code: number;
        data: { plan: string; dailyLimit: number; dailyUsed: number; remaining: number };
      }>("/user/quota");
      dispatch({ type: "SET_QUOTA", payload: res.data });
    } catch (_) {}
  }

  async function handleSummarize() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      dispatch({ type: "SET_SUMMARIZE_ERROR", payload: t.cannotGetPage });
      return;
    }

    const result = await injectAndExtractContent(tab.id);
    if (!result?.content) {
      dispatch({
        type: "SET_SUMMARIZE_ERROR",
        payload: t.cannotExtractContent,
      });
      return;
    }

    dispatch({
      type: "SET_PAGE_CONTENT",
      payload: {
        title: result.title || tab.title || "",
        content: result.content,
        url: result.url || tab.url || "",
        paragraphs: result.paragraphs || [],
      },
    });

    dispatch({ type: "CLEAR_RESULT" });
    dispatch({ type: "SET_LOADING", payload: true });

    await fetchSSE(
      "/summarize",
      {
        url: result.url || tab.url || "",
        title: result.title || tab.title || "",
        content: result.content,
        mode: state.summarize.selectedMode,
        outputLang: state.settings.defaultOutputLang,
      },
      (token) => dispatch({ type: "APPEND_RESULT", payload: token }),
      (data) => {
        dispatch({ type: "SET_LOADING", payload: false });
        if (data.paragraphRefs) {
          dispatch({ type: "SET_PARAGRAPH_REFS", payload: data.paragraphRefs });
        }
        if (data.quotaRemaining !== undefined) {
          dispatch({
            type: "SET_QUOTA",
            payload: {
              ...state.quota,
              remaining: data.quotaRemaining,
              dailyUsed: state.quota.dailyLimit - data.quotaRemaining,
            },
          });
        }
      },
      (message) => dispatch({ type: "SET_SUMMARIZE_ERROR", payload: message })
    );
  }

  async function handleParagraphClick(paragraphIndex: number) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    // paragraphIndex 是 1-based，对应提取的段落编号
    const paragraphs = state.summarize.pageContent?.paragraphs || [];
    if (paragraphIndex > 0 && paragraphIndex <= paragraphs.length) {
      await scrollToParagraph(tab.id, paragraphs[paragraphIndex - 1].xpath);
    }
  }

  const { pageContent } = state.summarize;

  return (
    <div className="p-4 flex flex-col h-full">
      <div className="mb-3">
        {pageContent?.title && (
          <p className="text-sm font-medium text-gray-800 line-clamp-2 mb-0.5">
            {pageContent.title}
          </p>
        )}
        {pageContent?.url && (
          <p className="text-xs text-gray-400 truncate">{getDomain(pageContent.url)}</p>
        )}
        {pageContent?.content && (
          <p className="text-xs text-gray-300 mt-1">
            {t.extractedInfo(pageContent.paragraphs?.length || 0, pageContent.content.length)}
          </p>
        )}
      </div>

      <ModeSelector />

      <div className="mt-3">
        <SummarizeButton onSummarize={handleSummarize} />
      </div>

      <SummaryResult onParagraphClick={handleParagraphClick} />

      <div className="mt-auto">
        <QuotaBar />
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