/**
 * POST /api/ai/draft
 *
 * Stateless AI proxy for draft message generation.
 * Licensed users hit this endpoint instead of calling Anthropic directly from the browser.
 *
 * STATELESS: No prompts, responses, or user data are logged, stored, or cached.
 */
import { NextRequest } from "next/server";
import { isValidLicenseKey } from "@/lib/licenseValidator";
import { checkRateLimit } from "@/lib/rateLimiter";

export async function POST(req: NextRequest) {
  // 1. Validate license key from header
  const licenseKey = req.headers.get("x-license-key");
  if (!licenseKey) {
    return new Response(
      JSON.stringify({ error: "License key required" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!isValidLicenseKey(licenseKey)) {
    return new Response(
      JSON.stringify({ error: "Invalid license key" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2. Rate limit check
  const rateResult = checkRateLimit(licenseKey);
  if (!rateResult.allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((rateResult.retryAfterMs || 60000) / 1000)),
        },
      }
    );
  }

  // 3. Parse and validate request body
  let messages: { role: string; content: string }[];
  let systemPrompt: string;
  try {
    const body = await req.json();
    messages = body.messages;
    systemPrompt = body.systemPrompt;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (typeof systemPrompt !== "string" || systemPrompt.length === 0) {
      return new Response(
        JSON.stringify({ error: "systemPrompt is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 4. Check server-side API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "AI service not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  // 5. Forward to Anthropic Claude API — stream response back
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
    }),
  });

  if (!response.ok) {
    return new Response(
      JSON.stringify({ error: "AI service error" }),
      { status: response.status, headers: { "Content-Type": "application/json" } }
    );
  }

  // Stream the SSE response body through — no buffering, no logging
  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
