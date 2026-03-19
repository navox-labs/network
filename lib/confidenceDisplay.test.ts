import { describe, it, expect } from "vitest";
import {
  getConfidenceBadgeStyle,
  buildDataSourceString,
} from "./confidenceDisplay";

// ── getConfidenceBadgeStyle ─────────────────────────────────────────────

describe("getConfidenceBadgeStyle", () => {
  it("returns green badge for high confidence", () => {
    const style = getConfidenceBadgeStyle("high");
    expect(style.label).toBe("high confidence");
    expect(style.color).toBe("#22c55e");
    expect(style.background).toBe("rgba(34,197,94,0.08)");
  });

  it("returns amber badge for medium confidence", () => {
    const style = getConfidenceBadgeStyle("medium");
    expect(style.label).toBe("medium confidence");
    expect(style.color).toBe("var(--warning)");
    expect(style.background).toBe("rgba(217,150,10,0.08)");
  });

  it("returns gray badge for low confidence", () => {
    const style = getConfidenceBadgeStyle("low");
    expect(style.label).toBe("connections only");
    expect(style.color).toBe("var(--text-muted)");
    expect(style.background).toBe("rgba(255,255,255,0.06)");
  });
});

// ── buildDataSourceString ───────────────────────────────────────────────

describe("buildDataSourceString", () => {
  it("returns 'connection date only' when no enrichment data present", () => {
    expect(buildDataSourceString({})).toBe("connection date only");
  });

  it("returns 'connection date only' when messageCount is 0", () => {
    expect(buildDataSourceString({ messageCount: 0 })).toBe("connection date only");
  });

  it("returns 'connection date only' when messageCount is undefined", () => {
    expect(buildDataSourceString({ messageCount: undefined })).toBe("connection date only");
  });

  it("shows message count", () => {
    expect(buildDataSourceString({ messageCount: 14 })).toBe("14 messages");
  });

  it("shows bidirectional with message count", () => {
    const result = buildDataSourceString({ messageCount: 14, messageBidirectional: true });
    expect(result).toBe("14 messages (bidirectional)");
  });

  it("does not show bidirectional without messages", () => {
    const result = buildDataSourceString({ messageBidirectional: true });
    expect(result).toBe("connection date only");
  });

  it("shows endorsed", () => {
    expect(buildDataSourceString({ endorsementReceived: true })).toBe("endorsed");
  });

  it("shows recommended", () => {
    expect(buildDataSourceString({ recommendationReceived: true })).toBe("recommended");
  });

  it("combines all enrichment signals", () => {
    const result = buildDataSourceString({
      messageCount: 14,
      messageBidirectional: true,
      endorsementReceived: true,
      recommendationReceived: true,
    });
    expect(result).toBe("14 messages (bidirectional) + endorsed + recommended");
  });

  it("combines messages and endorsement without recommendation", () => {
    const result = buildDataSourceString({
      messageCount: 5,
      endorsementReceived: true,
    });
    expect(result).toBe("5 messages + endorsed");
  });

  it("combines endorsement and recommendation without messages", () => {
    const result = buildDataSourceString({
      endorsementReceived: true,
      recommendationReceived: true,
    });
    expect(result).toBe("endorsed + recommended");
  });

  it("handles single message correctly", () => {
    expect(buildDataSourceString({ messageCount: 1 })).toBe("1 messages");
  });

  it("ignores false boolean fields", () => {
    const result = buildDataSourceString({
      messageCount: 3,
      messageBidirectional: false,
      endorsementReceived: false,
      recommendationReceived: false,
    });
    expect(result).toBe("3 messages");
  });
});
