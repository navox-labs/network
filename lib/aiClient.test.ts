import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  detectProvider,
  getAIConfig,
  saveAIConfig,
  clearAIConfig,
  streamAIResponse,
  proxyStreamAIResponse,
  type AIConfig,
} from "./aiClient";

// ---------------------------------------------------------------------------
// Mock localStorage
// ---------------------------------------------------------------------------
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get _store() { return store; },
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });
// Ensure `window` is defined so the SSR guard passes
Object.defineProperty(globalThis, "window", { value: globalThis });

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// detectProvider
// ---------------------------------------------------------------------------
describe("detectProvider", () => {
  it("returns 'anthropic' for sk-ant- prefix", () => {
    expect(detectProvider("sk-ant-api03-abc123")).toBe("anthropic");
  });

  it("returns 'openai' for sk- prefix (not sk-ant-)", () => {
    expect(detectProvider("sk-proj-abc123")).toBe("openai");
    expect(detectProvider("sk-abc123")).toBe("openai");
  });

  it("returns null for empty string", () => {
    expect(detectProvider("")).toBeNull();
  });

  it("returns null for unrecognized prefix", () => {
    expect(detectProvider("xai-abc123")).toBeNull();
    expect(detectProvider("random-key")).toBeNull();
  });

  it("returns null for non-string input", () => {
    expect(detectProvider(null as unknown as string)).toBeNull();
    expect(detectProvider(undefined as unknown as string)).toBeNull();
  });

  it("trims whitespace before detecting", () => {
    expect(detectProvider("  sk-ant-abc  ")).toBe("anthropic");
    expect(detectProvider("  sk-abc  ")).toBe("openai");
  });
});

// ---------------------------------------------------------------------------
// getAIConfig / saveAIConfig / clearAIConfig
// ---------------------------------------------------------------------------
describe("getAIConfig", () => {
  it("returns null when nothing is stored", () => {
    expect(getAIConfig()).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    localStorageMock.setItem("navox-ai-config", "not-json");
    expect(getAIConfig()).toBeNull();
  });

  it("returns null when provider is invalid", () => {
    localStorageMock.setItem("navox-ai-config", JSON.stringify({ provider: "gemini", apiKey: "abc" }));
    expect(getAIConfig()).toBeNull();
  });

  it("returns null when apiKey is empty", () => {
    localStorageMock.setItem("navox-ai-config", JSON.stringify({ provider: "openai", apiKey: "" }));
    expect(getAIConfig()).toBeNull();
  });

  it("returns config when valid", () => {
    const config: AIConfig = { provider: "openai", apiKey: "sk-test123" };
    localStorageMock.setItem("navox-ai-config", JSON.stringify(config));
    expect(getAIConfig()).toEqual(config);
  });
});

describe("saveAIConfig", () => {
  it("persists config with savedAt timestamp to localStorage", () => {
    const now = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    const config: AIConfig = { provider: "anthropic", apiKey: "sk-ant-test" };
    saveAIConfig(config);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "navox-ai-config",
      JSON.stringify({ ...config, savedAt: now })
    );
    expect(getAIConfig()).toEqual(config);
    vi.restoreAllMocks();
  });

  it("expires key after 30 days", () => {
    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
    localStorageMock.setItem(
      "navox-ai-config",
      JSON.stringify({ provider: "openai", apiKey: "sk-test", savedAt: thirtyOneDaysAgo })
    );
    expect(getAIConfig()).toBeNull();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("navox-ai-config");
  });

  it("keeps key within 30 days", () => {
    const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
    localStorageMock.setItem(
      "navox-ai-config",
      JSON.stringify({ provider: "openai", apiKey: "sk-test", savedAt: tenDaysAgo })
    );
    expect(getAIConfig()).toEqual({ provider: "openai", apiKey: "sk-test" });
  });

  it("treats legacy keys without savedAt as valid", () => {
    localStorageMock.setItem(
      "navox-ai-config",
      JSON.stringify({ provider: "openai", apiKey: "sk-legacy" })
    );
    expect(getAIConfig()).toEqual({ provider: "openai", apiKey: "sk-legacy" });
  });
});

describe("clearAIConfig", () => {
  it("removes config from localStorage", () => {
    saveAIConfig({ provider: "openai", apiKey: "sk-abc" });
    clearAIConfig();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("navox-ai-config");
    expect(getAIConfig()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// streamAIResponse
// ---------------------------------------------------------------------------
describe("streamAIResponse", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createSSEStream(lines: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    const text = lines.join("\n") + "\n";
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(text));
        controller.close();
      },
    });
  }

  it("streams OpenAI responses", async () => {
    const sseLines = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}',
      'data: {"choices":[{"delta":{"content":" world"}}]}',
      "data: [DONE]",
    ];

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(createSSEStream(sseLines), { status: 200 })
    );

    const config: AIConfig = { provider: "openai", apiKey: "sk-test" };
    const chunks: string[] = [];
    for await (const chunk of streamAIResponse(config, [{ role: "user", content: "hi" }], "system")) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["Hello", " world"]);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer sk-test",
        }),
      })
    );
  });

  it("streams Anthropic responses", async () => {
    const sseLines = [
      'data: {"type":"content_block_start","content_block":{"type":"text","text":""}}',
      'data: {"type":"content_block_delta","delta":{"text":"Hi"}}',
      'data: {"type":"content_block_delta","delta":{"text":" there"}}',
      'data: {"type":"message_stop"}',
    ];

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(createSSEStream(sseLines), { status: 200 })
    );

    const config: AIConfig = { provider: "anthropic", apiKey: "sk-ant-test" };
    const chunks: string[] = [];
    for await (const chunk of streamAIResponse(config, [{ role: "user", content: "hi" }], "system")) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["Hi", " there"]);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-api-key": "sk-ant-test",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        }),
      })
    );
  });

  it("throws on OpenAI API error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Unauthorized", { status: 401 })
    );

    const config: AIConfig = { provider: "openai", apiKey: "sk-bad" };
    const gen = streamAIResponse(config, [{ role: "user", content: "hi" }], "system");

    await expect(gen.next()).rejects.toThrow("Invalid API key. Check your OpenAI key");
  });

  it("throws on Anthropic API error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Invalid key", { status: 401 })
    );

    const config: AIConfig = { provider: "anthropic", apiKey: "sk-ant-bad" };
    const gen = streamAIResponse(config, [{ role: "user", content: "hi" }], "system");

    await expect(gen.next()).rejects.toThrow("Invalid API key. Check your Anthropic key");
  });

  it("sends correct model for OpenAI (gpt-4o)", async () => {
    const sseLines = ["data: [DONE]"];
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(createSSEStream(sseLines), { status: 200 })
    );

    const config: AIConfig = { provider: "openai", apiKey: "sk-test" };
    // Consume generator
    for await (const _ of streamAIResponse(config, [{ role: "user", content: "hi" }], "system")) {}

    const call = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(call[1]!.body as string);
    expect(body.model).toBe("gpt-4o");
    expect(body.stream).toBe(true);
  });

  it("sends correct model for Anthropic (claude-sonnet-4-20250514)", async () => {
    const sseLines = ['data: {"type":"message_stop"}'];
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(createSSEStream(sseLines), { status: 200 })
    );

    const config: AIConfig = { provider: "anthropic", apiKey: "sk-ant-test" };
    for await (const _ of streamAIResponse(config, [{ role: "user", content: "hi" }], "sys")) {}

    const call = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(call[1]!.body as string);
    expect(body.model).toBe("claude-sonnet-4-20250514");
    expect(body.stream).toBe(true);
    expect(body.system).toBe("sys");
  });

  it("passes system prompt as first message for OpenAI", async () => {
    const sseLines = ["data: [DONE]"];
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(createSSEStream(sseLines), { status: 200 })
    );

    const config: AIConfig = { provider: "openai", apiKey: "sk-test" };
    for await (const _ of streamAIResponse(config, [{ role: "user", content: "hello" }], "Be helpful")) {}

    const call = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(call[1]!.body as string);
    expect(body.messages[0]).toEqual({ role: "system", content: "Be helpful" });
    expect(body.messages[1]).toEqual({ role: "user", content: "hello" });
  });

  it("handles empty SSE content gracefully", async () => {
    const sseLines = [
      'data: {"choices":[{"delta":{}}]}',
      'data: {"choices":[{"delta":{"content":""}}]}',
      'data: {"choices":[{"delta":{"content":"ok"}}]}',
      "data: [DONE]",
    ];

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(createSSEStream(sseLines), { status: 200 })
    );

    const config: AIConfig = { provider: "openai", apiKey: "sk-test" };
    const chunks: string[] = [];
    for await (const chunk of streamAIResponse(config, [{ role: "user", content: "hi" }], "sys")) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["ok"]);
  });

  // -------------------------------------------------------------------------
  // D-08: Anthropic CORS TypeError produces correct error message
  // -------------------------------------------------------------------------
  it("throws CORS-specific error when Anthropic fetch throws TypeError", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const config: AIConfig = { provider: "anthropic", apiKey: "sk-ant-test" };
    const gen = streamAIResponse(config, [{ role: "user", content: "hi" }], "system");

    await expect(gen.next()).rejects.toThrow("Anthropic API blocked by browser (CORS)");
  });

  // -------------------------------------------------------------------------
  // D-09: TypeError with aborted signal does NOT trigger CORS message
  // -------------------------------------------------------------------------
  it("rethrows original TypeError when signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    const typeError = new TypeError("Failed to fetch");
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(typeError);

    const config: AIConfig = { provider: "anthropic", apiKey: "sk-ant-test" };
    const gen = streamAIResponse(config, [{ role: "user", content: "hi" }], "system", controller.signal);

    await expect(gen.next()).rejects.toThrow(typeError);
    await expect(gen.next().catch((e: Error) => e.message)).resolves.not.toContain("CORS");
  });

  // -------------------------------------------------------------------------
  // C-10: Abort mid-stream for OpenAI — generator stops
  // -------------------------------------------------------------------------
  it("stops OpenAI generator when aborted mid-stream", async () => {
    const controller = new AbortController();
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      start(ctrl) {
        ctrl.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'));
      },
      pull() {
        // Hang on second read until abort
        return new Promise((_, reject) => {
          controller.signal.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        });
      },
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(stream, { status: 200 })
    );

    const config: AIConfig = { provider: "openai", apiKey: "sk-test" };
    const chunks: string[] = [];

    await expect(async () => {
      for await (const chunk of streamAIResponse(config, [{ role: "user", content: "hi" }], "sys", controller.signal)) {
        chunks.push(chunk);
        controller.abort();
      }
    }).rejects.toThrow("aborted");

    expect(chunks).toEqual(["Hello"]);
  });

  // -------------------------------------------------------------------------
  // D-14: Abort mid-stream for Anthropic -- generator stops
  // -------------------------------------------------------------------------
  it("stops Anthropic generator when aborted mid-stream", async () => {
    const controller = new AbortController();
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      start(ctrl) {
        ctrl.enqueue(encoder.encode('data: {"type":"content_block_delta","delta":{"text":"Hi"}}\n\n'));
      },
      pull() {
        // Hang on second read until abort
        return new Promise((_, reject) => {
          controller.signal.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        });
      },
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(stream, { status: 200 })
    );

    const config: AIConfig = { provider: "anthropic", apiKey: "sk-ant-test" };
    const chunks: string[] = [];

    await expect(async () => {
      for await (const chunk of streamAIResponse(config, [{ role: "user", content: "hi" }], "sys", controller.signal)) {
        chunks.push(chunk);
        controller.abort();
      }
    }).rejects.toThrow("aborted");

    expect(chunks).toEqual(["Hi"]);
  });
});

// ---------------------------------------------------------------------------
// proxyStreamAIResponse
// ---------------------------------------------------------------------------
describe("proxyStreamAIResponse", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createSSEStream(lines: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    const text = lines.join("\n") + "\n";
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(text));
        controller.close();
      },
    });
  }

  it("streams Anthropic SSE responses from proxy", async () => {
    const sseLines = [
      'data: {"type":"content_block_delta","delta":{"text":"Hello"}}',
      'data: {"type":"content_block_delta","delta":{"text":" proxy"}}',
      'data: {"type":"message_stop"}',
    ];

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(createSSEStream(sseLines), { status: 200 })
    );

    const chunks: string[] = [];
    for await (const chunk of proxyStreamAIResponse(
      "NAVOX-ABCD-1234-EF56",
      [{ role: "user", content: "hi" }],
      "system prompt",
      "draft"
    )) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["Hello", " proxy"]);
    expect(fetch).toHaveBeenCalledWith(
      "/network/api/ai/draft",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-license-key": "NAVOX-ABCD-1234-EF56",
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("uses correct endpoint path for coach", async () => {
    const sseLines = [
      'data: {"type":"content_block_delta","delta":{"text":"advice"}}',
      'data: {"type":"message_stop"}',
    ];

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(createSSEStream(sseLines), { status: 200 })
    );

    const chunks: string[] = [];
    for await (const chunk of proxyStreamAIResponse(
      "NAVOX-ABCD-1234-EF56",
      [{ role: "user", content: "help" }],
      "coach prompt",
      "coach"
    )) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["advice"]);
    expect(fetch).toHaveBeenCalledWith(
      "/network/api/ai/coach",
      expect.anything()
    );
  });

  it("throws error on non-ok response with JSON error body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Invalid license key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    );

    const gen = proxyStreamAIResponse(
      "BAD-KEY",
      [{ role: "user", content: "hi" }],
      "system",
      "draft"
    );

    await expect(gen.next()).rejects.toThrow("Invalid license key");
  });

  it("throws error on non-ok response without JSON body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Internal Server Error", { status: 500 })
    );

    const gen = proxyStreamAIResponse(
      "NAVOX-ABCD-1234-EF56",
      [{ role: "user", content: "hi" }],
      "system",
      "draft"
    );

    // Non-JSON body falls through to catch, yielding "Unknown error"
    await expect(gen.next()).rejects.toThrow("Unknown error");
  });

  it("throws when response has no body", async () => {
    const mockResponse = new Response(null, { status: 200 });
    // Override body to null
    Object.defineProperty(mockResponse, "body", { value: null });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockResponse);

    const gen = proxyStreamAIResponse(
      "NAVOX-ABCD-1234-EF56",
      [{ role: "user", content: "hi" }],
      "system",
      "draft"
    );

    await expect(gen.next()).rejects.toThrow("No response stream");
  });

  it("sends messages and systemPrompt in request body", async () => {
    const sseLines = ['data: {"type":"message_stop"}'];
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(createSSEStream(sseLines), { status: 200 })
    );

    const messages = [{ role: "user", content: "test message" }];
    const systemPrompt = "test system prompt";

    for await (const _ of proxyStreamAIResponse(
      "NAVOX-ABCD-1234-EF56",
      messages,
      systemPrompt,
      "draft"
    )) {}

    const call = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(call[1]!.body as string);
    expect(body.messages).toEqual(messages);
    expect(body.systemPrompt).toBe(systemPrompt);
  });

  it("handles [DONE] sentinel in SSE stream", async () => {
    const sseLines = [
      'data: {"type":"content_block_delta","delta":{"text":"before"}}',
      "data: [DONE]",
      'data: {"type":"content_block_delta","delta":{"text":"after"}}',
    ];

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(createSSEStream(sseLines), { status: 200 })
    );

    const chunks: string[] = [];
    for await (const chunk of proxyStreamAIResponse(
      "NAVOX-ABCD-1234-EF56",
      [{ role: "user", content: "hi" }],
      "system",
      "draft"
    )) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["before"]);
  });

  it("passes abort signal to fetch", async () => {
    const controller = new AbortController();
    const sseLines = ['data: {"type":"message_stop"}'];

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(createSSEStream(sseLines), { status: 200 })
    );

    for await (const _ of proxyStreamAIResponse(
      "NAVOX-ABCD-1234-EF56",
      [{ role: "user", content: "hi" }],
      "system",
      "draft",
      controller.signal
    )) {}

    const call = vi.mocked(fetch).mock.calls[0];
    expect(call[1]!.signal).toBe(controller.signal);
  });
});
