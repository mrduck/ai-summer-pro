// 开发环境默认 localhost，生产构建时通过 VITE_API_BASE 环境变量覆盖
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000/api";

// 获取或生成 deviceId
export async function getOrCreateDeviceId(): Promise<string> {
  const result = await chrome.storage.local.get("deviceId");
  if (result.deviceId) return result.deviceId;

  const deviceId = crypto.randomUUID();
  await chrome.storage.local.set({ deviceId });
  return deviceId;
}

// 发送 API 请求（非流式）
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const deviceId = await getOrCreateDeviceId();
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Device-Id": deviceId,
      ...(options.headers || {}),
    },
    body: options.body,
  });

  const data = await res.json();

  if (data.code !== 0) {
    throw new Error(data.message || "请求失败");
  }

  return data;
}

// 发送 SSE 流式请求
export async function fetchSSE(
  path: string,
  body: unknown,
  onToken: (content: string) => void,
  onDone: (data: any) => void,
  onError: (message: string) => void
): Promise<void> {
  const deviceId = await getOrCreateDeviceId();
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Device-Id": deviceId,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json();
    onError(errorData.message || "请求失败");
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    onError("无法读取响应");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    let currentEvent = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        const data = JSON.parse(line.slice(6));
        if (currentEvent === "token") {
          onToken(data.content);
        } else if (currentEvent === "done") {
          onDone(data);
        } else if (currentEvent === "error") {
          onError(data.message);
          return;
        }
      }
    }
  }
}