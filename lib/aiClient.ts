/**
 * Unified AI abstraction layer.
 * Supports OpenAI and Anthropic providers via direct browser-to-API calls.
 * Keys are stored in localStorage only — never sent to our servers.
 */

export type AIProvider = "openai" | "anthropic";

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
}

const STORAGE_KEY = "navox-ai-config";
const KEY_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Sentinel value used in draftMessages to indicate no API key is configured. */
export const DRAFT_NO_KEY = "__NO_KEY__" as const;

/**
 * Detect provider from API key prefix.
 * sk-ant- => Anthropic, sk- => OpenAI, otherwise null.
 */
export function detectProvider(key: string): AIProvider | null {
  if (!key || typeof key !== "string") return null;
  const trimmed = key.trim();
  if (trimmed.startsWith("sk-ant-")) return "anthropic";
  if (trimmed.startsWith("sk-")) return "openai";
  return null;
}

/** Read saved AI config from localStorage. Returns null if not set, invalid, or expired. */
export function getAIConfig(): AIConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      (parsed.provider === "openai" || parsed.provider === "anthropic") &&
      typeof parsed.apiKey === "string" &&
      parsed.apiKey.length > 0
    ) {
      // Check expiry if savedAt exists
      if (typeof parsed.savedAt === "number") {
        if (Date.now() - parsed.savedAt > KEY_MAX_AGE_MS) {
          localStorage.removeItem(STORAGE_KEY);
          return null;
        }
      }
      // Legacy keys without savedAt are treated as valid
      return { provider: parsed.provider, apiKey: parsed.apiKey };
    }
    return null;
  } catch {
    return null;
  }
}

/** Persist AI config to localStorage with a timestamp for expiry tracking. */
export function saveAIConfig(config: AIConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...config, savedAt: Date.now() })
  );
}

/** Remove AI config from localStorage. */
export function clearAIConfig(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export interface ChatMessage {
  role: string;
  content: string;
}

/**
 * Stream AI responses from either OpenAI or Anthropic.
 * Yields incremental text chunks as they arrive.
 */
export async function* streamAIResponse(
  config: AIConfig,
  messages: ChatMessage[],
  systemPrompt: string,
  signal?: AbortSignal
): AsyncGenerator<string> {
  if (config.provider === "openai") {
    yield* streamOpenAI(config.apiKey, messages, systemPrompt, signal);
  } else {
    yield* streamAnthropic(config.apiKey, messages, systemPrompt, signal);
  }
}

/**
 * Stream AI responses via the Navox server-side proxy.
 * Used by licensed users — Navox's API key is used server-side.
 * No user API key is needed.
 */
export async function* proxyStreamAIResponse(
  licenseKey: string,
  messages: ChatMessage[],
  systemPrompt: string,
  endpoint: "draft" | "coach",
  signal?: AbortSignal
): AsyncGenerator<string> {
  const response = await fetch(`/network/api/ai/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-license-key": licenseKey,
    },
    body: JSON.stringify({ messages, systemPrompt }),
    signal,
  });

  if (!response.ok) {
    const err = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `Proxy error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response stream");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") return;

      try {
        const parsed = JSON.parse(data);
        if (parsed.type === "content_block_delta" && parsed.delta?.text) {
          yield parsed.delta.text;
        }
      } catch {
        // Skip malformed JSON lines
      }
    }
  }

  // Process remaining buffer
  if (buffer.trim()) {
    const trimmed = buffer.trim();
    if (trimmed.startsWith("data:")) {
      const data = trimmed.slice(5).trim();
      if (data !== "[DONE]") {
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "content_block_delta" && parsed.delta?.text) {
            yield parsed.delta.text;
          }
        } catch {
          // Skip
        }
      }
    }
  }
}

async function* streamOpenAI(
  apiKey: string,
  messages: ChatMessage[],
  systemPrompt: string,
  signal?: AbortSignal
): AsyncGenerator<string> {
  const allMessages = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: allMessages,
      stream: true,
    }),
    signal,
  });

  if (!res.ok) {
    const status = res.status;
    if (status === 401) throw new Error("Invalid API key. Check your OpenAI key and try again.");
    if (status === 429) throw new Error("Rate limited by OpenAI. Wait a moment and try again.");
    if (status === 403) throw new Error("Access denied. Your OpenAI key may lack required permissions.");
    throw new Error(`OpenAI returned error ${status}. Try again later.`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    // Keep the last (possibly incomplete) line in the buffer
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") return;

      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch {
        // Skip malformed JSON lines
      }
    }
  }

  // Process any remaining buffer
  if (buffer.trim()) {
    const trimmed = buffer.trim();
    if (trimmed.startsWith("data:")) {
      const data = trimmed.slice(5).trim();
      if (data !== "[DONE]") {
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // Skip
        }
      }
    }
  }
}

async function* streamAnthropic(
  apiKey: string,
  messages: ChatMessage[],
  systemPrompt: string,
  signal?: AbortSignal
): AsyncGenerator<string> {
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages,
        stream: true,
      }),
      signal,
    });
  } catch (err) {
    // CORS preflight failures surface as TypeError in browsers
    if (err instanceof TypeError && !signal?.aborted) {
      throw new Error(
        "Anthropic API blocked by browser (CORS). Enable 'Allow browser access' for this key at console.anthropic.com."
      );
    }
    throw err;
  }

  if (!res.ok) {
    const status = res.status;
    if (status === 401) throw new Error("Invalid API key. Check your Anthropic key and try again.");
    if (status === 429) throw new Error("Rate limited by Anthropic. Wait a moment and try again.");
    if (status === 403) throw new Error("Access denied. Your Anthropic key may lack required permissions.");
    throw new Error(`Anthropic returned error ${status}. Try again later.`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();

      try {
        const parsed = JSON.parse(data);
        if (parsed.type === "content_block_delta" && parsed.delta?.text) {
          yield parsed.delta.text;
        }
      } catch {
        // Skip malformed JSON lines
      }
    }
  }

  // Process remaining buffer
  if (buffer.trim()) {
    const trimmed = buffer.trim();
    if (trimmed.startsWith("data:")) {
      const data = trimmed.slice(5).trim();
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === "content_block_delta" && parsed.delta?.text) {
          yield parsed.delta.text;
        }
      } catch {
        // Skip
      }
    }
  }
}
