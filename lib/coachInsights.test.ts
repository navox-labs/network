import { describe, it, expect } from "vitest";
import { getDraftPrompt } from "./coachInsights";
import type { Connection } from "./tieStrength";
import type { OutreachVoice } from "./types";

// ── Helper: minimal Connection for testing ────────────────────────────────

function makeConn(overrides: Partial<Connection> = {}): Connection {
  return {
    id: "test-1",
    name: "Jane Doe",
    firstName: "Jane",
    lastName: "Doe",
    company: "Acme Corp",
    position: "VP Engineering",
    connectedOn: "2024-06-01",
    tieStrength: 0.35,
    tieCategory: "weak",
    roleCategory: "Leadership",
    daysSinceConnected: 300,
    industryCluster: "Tech",
    isBridge: true,
    networkPosition: "bridge",
    confidenceLevel: "high",
    activationPriority: 0.8,
    ...overrides,
  };
}

// ── getDraftPrompt ────────────────────────────────────────────────────────

describe("getDraftPrompt", () => {
  it("generates a prompt without voice when voice is undefined", () => {
    const prompt = getDraftPrompt(makeConn());
    expect(prompt).toContain("Jane Doe");
    expect(prompt).toContain("Acme Corp");
    expect(prompt).toContain("VP Engineering");
    expect(prompt).toContain("weak");
    expect(prompt).not.toContain("VOICE STYLE");
  });

  it("generates a prompt without voice when voice is explicitly omitted", () => {
    const prompt = getDraftPrompt(makeConn(), undefined);
    expect(prompt).not.toContain("VOICE STYLE");
  });

  it("includes voice sample in prompt when provided", () => {
    const voice: OutreachVoice = {
      sample: "Hey, quick note — I noticed your work on X and think there's an interesting overlap.",
    };
    const prompt = getDraftPrompt(makeConn(), voice);
    expect(prompt).toContain("VOICE STYLE");
    expect(prompt).toContain(voice.sample);
    expect(prompt).not.toContain("Additional instructions");
  });

  it("includes additional notes when voice has additionalNotes", () => {
    const voice: OutreachVoice = {
      sample: "Hey, saw your post about scaling teams.",
      additionalNotes: "Keep it under 3 sentences. Never use exclamation marks.",
    };
    const prompt = getDraftPrompt(makeConn(), voice);
    expect(prompt).toContain("VOICE STYLE");
    expect(prompt).toContain(voice.sample);
    expect(prompt).toContain("Additional instructions: Keep it under 3 sentences.");
  });

  it("does not include voice section when sample is empty string", () => {
    const voice: OutreachVoice = { sample: "" };
    const prompt = getDraftPrompt(makeConn(), voice);
    expect(prompt).not.toContain("VOICE STYLE");
  });

  it("includes correct tie category tone calibration for strong ties", () => {
    const conn = makeConn({ tieCategory: "strong", tieStrength: 0.8 });
    const prompt = getDraftPrompt(conn);
    expect(prompt).toContain("Direct and friendly");
  });

  it("includes correct tie category tone calibration for moderate ties", () => {
    const conn = makeConn({ tieCategory: "moderate", tieStrength: 0.5 });
    const prompt = getDraftPrompt(conn);
    expect(prompt).toContain("Warm reconnection");
  });

  it("includes correct tie category tone calibration for dormant ties", () => {
    const conn = makeConn({ tieCategory: "dormant", tieStrength: 0.05 });
    const prompt = getDraftPrompt(conn);
    expect(prompt).toContain("dormant connection");
  });

  it("preserves all rules section after voice injection", () => {
    const voice: OutreachVoice = {
      sample: "Some sample text",
      additionalNotes: "Be casual",
    };
    const prompt = getDraftPrompt(makeConn(), voice);
    expect(prompt).toContain("Write ONLY the message body");
    expect(prompt).toContain("Keep it under 100 words");
    expect(prompt).toContain("No emojis");
    // Voice section should come before Rules
    const voiceIdx = prompt.indexOf("VOICE STYLE");
    const rulesIdx = prompt.indexOf("Rules:");
    expect(voiceIdx).toBeLessThan(rulesIdx);
  });

  it("uses firstName field for first name placeholder", () => {
    const prompt = getDraftPrompt(makeConn({ firstName: "Jane" }));
    expect(prompt).toContain("Use their first name (Jane)");
  });

  it("falls back to split name if firstName is empty", () => {
    const prompt = getDraftPrompt(makeConn({ firstName: "", name: "Jane Doe" }));
    expect(prompt).toContain("Use their first name (Jane)");
  });

  it("includes bridge information", () => {
    const prompt = getDraftPrompt(makeConn({ isBridge: true }));
    expect(prompt).toContain("yes");
    expect(prompt).toContain("rare cluster");
  });

  it("shows non-bridge correctly", () => {
    const prompt = getDraftPrompt(makeConn({ isBridge: false }));
    expect(prompt).toContain("Bridge connection: no");
  });
});
