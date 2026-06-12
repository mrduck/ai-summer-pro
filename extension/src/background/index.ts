import ExtPay from "extpay";

// ===== ExtensionPay 初始化 =====
// 注册后替换为 https://extensionpay.com 上创建的扩展 ID
const EXTPAY_ID = "ai-summarize-pro";
const extpay = ExtPay(EXTPAY_ID);
extpay.startBackground();

// 用户付费后自动刷新付费状态
extpay.onPaid.addListener(() => {
  console.log("用户已付费");
});

// 安装/更新时注册右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "summarize-selection",
    title: "AI 总结选中内容",
    contexts: ["selection"],
  });
});

// 打开 Side Panel
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// 右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "summarize-selection" && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: "GET_SELECTION" }, (response) => {
      const selectedText = response?.text || "";

      chrome.sidePanel.open({ windowId: tab.windowId }).then(() => {
        setTimeout(() => {
          chrome.runtime.sendMessage({
            type: "SUMMARIZE_SELECTION",
            payload: { text: selectedText },
          });
        }, 500);
      });
    });
  }
});

// 处理来自 Side Panel 的消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "OPEN_PAYMENT_PAGE") {
    extpay.openPaymentPage();
    sendResponse({ success: true });
  } else if (message.type === "OPEN_LOGIN_PAGE") {
    extpay.openLoginPage();
    sendResponse({ success: true });
  } else if (message.type === "GET_USER_PAID_STATUS") {
    extpay.getUser().then((user) => {
      sendResponse({ paid: user.paid, trialStartedAt: user.trialStartedAt });
    });
    return true; // 保持异步通道
  }
});