import { useState } from "react";
import { useAppContext } from "../store/AppContext";
import { useI18n } from "../i18n/I18nContext";

interface SummaryResultProps {
  onParagraphClick?: (index: number) => void;
}

/** 从总结文本中解析出 (段X,段Y) 引用并分割为可渲染的片段 */
interface TextSegment {
  type: "text" | "ref";
  content: string;
  refs?: number[];
}

function parseSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  // 匹配 (段1,段2 ,段3) 或 (段1,2,3)
  const regex = /\(段([\d,\s，]+)\)|\(参考\s*:\s*段([\d,\s，]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // 前面的纯文本
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }

    const raw = match[1] || match[2];
    const nums = raw
      .split(/[,，\s]+/)
      .filter(Boolean)
      .map(Number)
      .filter((n) => !isNaN(n) && n > 0);

    segments.push({ type: "ref", content: match[0], refs: nums });
    lastIndex = match.index + match[0].length;
  }

  // 剩余文本
  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments;
}

export default function SummaryResult({ onParagraphClick }: SummaryResultProps) {
  const { state } = useAppContext();
  const { t } = useI18n();
  const { result, isLoading, error } = state.summarize;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (result) {
      // 复制时去掉引用标记，输入干净文本
      const clean = result.replace(/\(段[\d,\s，]+\)|\(参考\s*:\s*段[\d,\s，]+\)/g, "");
      await navigator.clipboard.writeText(clean.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRefClick = (refs: number[]) => {
    if (onParagraphClick) {
      refs.forEach((r) => onParagraphClick(r));
    }
  };

  const renderLine = (line: string, lineIdx: number) => {
    const trimmed = line.trim();
    if (!trimmed) return null;

    const segments = parseSegments(trimmed);
    const isBullet = trimmed.startsWith("- ");

    return (
      <div key={lineIdx} className="flex items-start gap-2 text-sm leading-relaxed group">
        {isBullet && (
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
        )}
        <p className="text-gray-700 flex-1">
          {segments.map((seg, i) => {
            if (seg.type === "ref" && seg.refs && seg.refs.length > 0) {
              return (
                <button
                  key={i}
                  onClick={() => handleRefClick(seg.refs!)}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer align-middle"
                  title={seg.refs.map((r) => t.refTooltip(`段${r}`)).join("\n")}
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  {seg.refs.map((r) => `段${r}`).join(" ")}
                </button>
              );
            }
            return <span key={i}>{seg.content}</span>;
          })}
        </p>
      </div>
    );
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4 shadow-sm">
        <div className="flex items-start gap-2">
          <svg
            className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!result && !isLoading) return null;

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-4 mt-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
            <svg
              className="w-4 h-4 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-800">{t.aiSummary}</span>
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            copied
              ? "bg-green-100 text-green-600"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {copied ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            )}
          </svg>
          {copied ? t.copied : t.copy}
        </button>
      </div>

      {/* Result Content */}
      <div className="min-h-[100px]">
        {result ? (
          <div className="space-y-2">
            {result.split("\n").map((line, i) => renderLine(line, i))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-[100px]">
            <div className="flex items-center gap-2 text-gray-400">
              <svg
                className="animate-spin h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-sm">{t.generatingSummary}</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {result && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{result.length} {t.characters}</span>
            <span className="flex items-center gap-1 text-xs text-green-500">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {t.savedToHistory}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}