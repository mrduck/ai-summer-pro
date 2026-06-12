import { useAppContext } from "../store/AppContext";
import { useI18n } from "../i18n/I18nContext";

export default function QuotaBar() {
  const { state } = useAppContext();
  const { t } = useI18n();
  const { dailyLimit, dailyUsed, remaining, plan } = state.quota;

  const usedPercent = dailyLimit > 0 ? (dailyUsed / dailyLimit) * 100 : 0;

  const handleUpgrade = () => {
    // 通过 background 打开 ExtensionPay 支付页面
    chrome.runtime.sendMessage({ type: "OPEN_PAYMENT_PAGE" });
  };

  return (
    <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-500">
          {t.todayRemaining} <span className="font-medium text-gray-700">{remaining}/{dailyLimit}</span>{t.times ? ` ${t.times}` : ""}
        </span>
        {plan === "free" && (
          <button
            onClick={handleUpgrade}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
          >
            {t.upgradePro}
          </button>
        )}
      </div>
      {/* 进度条：未使用部分白色，已使用部分蓝色 */}
      <div className="w-full h-1.5 bg-white rounded-full overflow-hidden border border-gray-200">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(usedPercent, 100)}%` }}
        />
      </div>
    </div>
  );
}