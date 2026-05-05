import { describe, it, expect } from "vitest";
import { STATUS_CONFIG, ALL_STATUSES, NOTES_MAX_CHARS } from "./statusConfig";
import type { ConnectionStatus } from "./types";

// ── StatusPill config tests ───────────────────────────────────────────────

describe("STATUS_CONFIG", () => {
  it("has config for every ConnectionStatus value", () => {
    const allStatuses: ConnectionStatus[] = [
      "new", "researching", "drafted", "sent", "replied",
      "meeting_scheduled", "converted", "archived",
    ];
    for (const status of allStatuses) {
      expect(STATUS_CONFIG[status]).toBeDefined();
      expect(STATUS_CONFIG[status].label).toBeTruthy();
      expect(STATUS_CONFIG[status].bg).toBeTruthy();
      expect(STATUS_CONFIG[status].text).toBeTruthy();
    }
  });

  it("each status has a unique label", () => {
    const labels = ALL_STATUSES.map((s) => STATUS_CONFIG[s].label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("default status 'new' has gray color", () => {
    expect(STATUS_CONFIG["new"].label).toBe("New");
    expect(STATUS_CONFIG["new"].text).toContain("9ca3af");
  });

  it("researching has blue color", () => {
    expect(STATUS_CONFIG["researching"].text).toContain("60a5fa");
  });

  it("drafted has yellow color", () => {
    expect(STATUS_CONFIG["drafted"].text).toContain("facc15");
  });

  it("sent has orange color", () => {
    expect(STATUS_CONFIG["sent"].text).toContain("fb923c");
  });

  it("replied has green color", () => {
    expect(STATUS_CONFIG["replied"].text).toContain("4ade80");
  });

  it("meeting_scheduled has purple color", () => {
    expect(STATUS_CONFIG["meeting_scheduled"].text).toContain("c084fc");
  });

  it("converted has emerald color", () => {
    expect(STATUS_CONFIG["converted"].text).toContain("34d399");
  });

  it("archived has muted gray color", () => {
    expect(STATUS_CONFIG["archived"].text).toContain("6b7280");
  });
});

describe("ALL_STATUSES", () => {
  it("contains exactly 8 statuses", () => {
    expect(ALL_STATUSES).toHaveLength(8);
  });

  it("matches the ConnectionStatus union in expected order", () => {
    const expected: ConnectionStatus[] = [
      "new", "researching", "drafted", "sent", "replied",
      "meeting_scheduled", "converted", "archived",
    ];
    expect(ALL_STATUSES).toEqual(expected);
  });

  it("every entry has a corresponding STATUS_CONFIG entry", () => {
    for (const s of ALL_STATUSES) {
      expect(STATUS_CONFIG[s]).toBeDefined();
    }
  });
});

// ── NotesPanel config tests ───────────────────────────────────────────────

describe("NOTES_MAX_CHARS", () => {
  it("is 2000", () => {
    expect(NOTES_MAX_CHARS).toBe(2000);
  });

  it("is a positive integer", () => {
    expect(NOTES_MAX_CHARS).toBeGreaterThan(0);
    expect(Number.isInteger(NOTES_MAX_CHARS)).toBe(true);
  });
});
