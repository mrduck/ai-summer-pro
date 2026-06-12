import { Readability } from "@mozilla/readability";

function extractText(): string {
  // 移除隐藏元素
  const clone = document.cloneNode(true) as Document;
  const hiddenElements = clone.querySelectorAll(
    'style, script, noscript, [hidden], [aria-hidden="true"], svg, img, iframe, video, audio, canvas, object, embed, nav, header, footer'
  );
  hiddenElements.forEach((el) => el.remove());

  // 优先使用 Readability
  try {
    const article = new Readability(clone).parse();
    if (article && article.textContent && article.textContent.length > 100) {
      return article.textContent.trim();
    }
  } catch (e) {
    // ignore
  }

  // 备用：提取可见文本
  const mainContent =
    document.querySelector("main") ||
    document.querySelector("article") ||
    document.querySelector("[role='main']") ||
    document.querySelector("#main-content") ||
    document.querySelector(".post-content") ||
    document.body;

  if (mainContent) {
    const text = mainContent.innerText?.trim() || "";
    if (text.length > 100) return text;
  }

  return (document.body?.innerText || "").trim();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_PAGE_CONTENT") {
    try {
      const content = extractText();
      sendResponse({
        title: document.title || "",
        content,
        url: window.location.href,
      });
    } catch (e) {
      console.error("Content extraction error:", e);
      sendResponse({
        title: document.title || "",
        content: "",
        url: window.location.href,
      });
    }
    return true;
  }

  if (message.type === "GET_SELECTION") {
    const selection = window.getSelection()?.toString() || "";
    sendResponse({ text: selection });
    return true;
  }
});