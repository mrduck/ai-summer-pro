import { config } from "../config.js";
import type { SummaryMode, OutputLang } from "../types/index.js";

// 段落引用类型
interface ParagraphRef {
  text: string;
  index: number;
}

function getSystemPrompt(mode: SummaryMode, outputLang: OutputLang) {
  const langInstruction =
    outputLang === "zh"
      ? "请使用中文输出。"
      : outputLang === "en"
        ? "Please output in English."
        : "日本語で出力してください。";

  switch (mode) {
    case "brief":
      return `你是一个专业的文章总结助手。用户会提供带编号的原文段落（格式为 [段N]）。请用一句话总结文章核心内容（不超过100字），并在总结末尾加上引用原文的段落编号，格式为 (参考: 段X,段Y)。${langInstruction}`;
    case "paragraph":
      return `你是一个专业的文章总结助手。用户会提供带编号的原文段落（格式为 [段N]）。请用一段简洁的文字总结文章内容（约150-200字），保留核心观点，并在总结末尾列出所参考的段落编号，格式为 (参考: 段X,段Y,段Z)。${langInstruction}`;
    case "bullet":
      return `你是一个专业的文章总结助手。请将以下内容总结为结构化的要点列表。

【重要规则】
1. 用户提供的内容中，每段前面都有 [段N] 标记，这是段落编号
2. 每个总结要点后面必须标注引用了哪些原文段落，格式为 (段X,段Y)
3. 只提取核心观点，忽略无关细节
4. 用 "- " 开头列出每个要点

【输出格式】
- 要点内容一 (段1,段3)
- 要点内容二 (段4,段5)
- 要点内容三 (段7,段9,段10)

${langInstruction} 请严格按照上述格式输出。`;
    default:
      return `你是一个专业的文章总结助手。${langInstruction}`;
  }
}

/**
 * 解析 AI 返回的总结内容，提取段落引用
 * 输入: "要点内容 (段1,段3,段5)"
 * 输出: { text: "要点内容", refs: [1, 3, 5] }
 */
function parseParagraphRefs(summaryText: string): {
  text: string;
  refs: number[];
}[] {
  // 去掉结尾的 (参考: 段X,段Y)
  const cleanText = summaryText.replace(/\(参考\s*:\s*段[\d,\s]+\)\s*$/g, "").trim();

  // 按行分割
  const lines = cleanText.split("\n").filter((l) => l.trim());

  return lines.map((line) => {
    const match = line.match(/\(段([\d,\s]+)\)\s*$/);
    if (match) {
      const refs = match[1]
        .split(/[,，\s]+/)
        .filter(Boolean)
        .map(Number)
        .filter((n) => !isNaN(n));
      const text = line.slice(0, match.index).trim().replace(/- /, "");
      return { text, refs };
    }
    return { text: line.replace(/- /, "").trim(), refs: [] };
  });
}

/**
 * 构建带编号的用户内容
 */
function buildNumberedContent(content: string): {
  numbered: string;
  paragraphs: { index: number; text: string }[];
} {
  const rawParagraphs = content
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20);

  // 限制段落总字符数
  let totalChars = 0;
  const limited: string[] = [];
  const paragraphs: { index: number; text: string }[] = [];

  for (let i = 0; i < rawParagraphs.length && totalChars < 12000; i++) {
    limited.push(`[段${i + 1}] ${rawParagraphs[i]}`);
    paragraphs.push({ index: i + 1, text: rawParagraphs[i] });
    totalChars += rawParagraphs[i].length;
  }

  return {
    numbered: limited.join("\n\n"),
    paragraphs,
  };
}

/**
 * 调用 DeepSeek API 生成总结，返回流式响应
 */
export async function* streamSummary(
  content: string,
  mode: SummaryMode,
  outputLang: OutputLang
): AsyncGenerator<{
  type: "start" | "token" | "done" | "error";
  content?: string;
  summaryId?: number;
  paragraphRefs?: { index: number; text: string }[];
}> {
  if (!config.deepseek.apiKey) {
    yield { type: "error", content: "DEEPSEEK_API_KEY not configured" };
    return;
  }

  if (!content || content.length < 50) {
    yield { type: "error", content: "内容过短，无法生成有意义的总结" };
    return;
  }

  const { numbered, paragraphs } = buildNumberedContent(content);
  const systemPrompt = getSystemPrompt(mode, outputLang);

  console.log(`[AI] 发送 ${paragraphs.length} 个段落，共 ${numbered.length} 字符`);

  try {
    const response = await fetch(`${config.deepseek.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.deepseek.apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: numbered },
        ],
        stream: true,
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      yield {
        type: "error",
        content: `AI API error: ${response.status} ${response.statusText}`,
      };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: "error", content: "Failed to read response" };
      return;
    }

    yield { type: "start" };

    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (trimmed.startsWith("data: ")) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const token = json.choices[0]?.delta?.content;
            if (token) {
              fullText += token;
              yield { type: "token", content: token };
            }
          } catch (e) {
            // ignore
          }
        }
      }
    }

    // 解析段落引用
    const refs = parseParagraphRefs(fullText);

    yield {
      type: "done",
      content: fullText,
      paragraphRefs: refs
        .filter((r) => r.refs.length > 0)
        .flatMap((r) =>
          r.refs.map((idx) => {
            const p = paragraphs.find((p) => p.index === idx);
            return p ? { index: idx, text: p.text } : null;
          })
        )
        .filter(Boolean) as { index: number; text: string }[],
    };
  } catch (e) {
    console.error("AI API error:", e);
    yield {
      type: "error",
      content: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

export { parseParagraphRefs, buildNumberedContent };