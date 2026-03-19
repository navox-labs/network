import { describe, it, expect } from "vitest";
import {
  shouldShowBanner,
  getMissingEnrichmentFiles,
} from "./enrichBannerLogic";
import type { EnrichmentSummary } from "./enrichment";

// ── Helper ──────────────────────────────────────────────────────────────

const makeSummary = (
  filesLoaded: string[],
  overrides: Partial<EnrichmentSummary> = {}
): EnrichmentSummary => ({
  filesLoaded,
  messageStats: { totalMatched: 0, totalUnmatched: 0, uniqueUnmatchedSenders: 0 },
  endorsementCount: 0,
  recommendationCount: 0,
  invitationStats: { sentByUser: 0, receivedByUser: 0 },
  ...overrides,
});

// ── getMissingEnrichmentFiles ───────────────────────────────────────────

describe("getMissingEnrichmentFiles", () => {
  it("returns all enrichment files when summary is null", () => {
    const missing = getMissingEnrichmentFiles(null);
    expect(missing).toEqual([
      "messages.csv",
      "endorsement_received_info.csv",
      "endorsement_given_info.csv",
      "recommendations_received.csv",
      "invitations.csv",
    ]);
  });

  it("returns all enrichment files when only connections loaded", () => {
    const summary = makeSummary(["connections.csv"]);
    const missing = getMissingEnrichmentFiles(summary);
    expect(missing).toHaveLength(5);
    expect(missing).toContain("messages.csv");
    expect(missing).toContain("invitations.csv");
  });

  it("excludes loaded files from missing list", () => {
    const summary = makeSummary(["connections.csv", "messages.csv", "invitations.csv"]);
    const missing = getMissingEnrichmentFiles(summary);
    expect(missing).toHaveLength(3);
    expect(missing).not.toContain("messages.csv");
    expect(missing).not.toContain("invitations.csv");
    expect(missing).toContain("endorsement_received_info.csv");
    expect(missing).toContain("endorsement_given_info.csv");
    expect(missing).toContain("recommendations_received.csv");
  });

  it("returns empty when all enrichment files are loaded", () => {
    const summary = makeSummary([
      "connections.csv",
      "messages.csv",
      "endorsement_received_info.csv",
      "endorsement_given_info.csv",
      "recommendations_received.csv",
      "invitations.csv",
    ]);
    const missing = getMissingEnrichmentFiles(summary);
    expect(missing).toHaveLength(0);
  });

  it("handles case-insensitive file names", () => {
    const summary = makeSummary(["Messages.csv", "INVITATIONS.CSV"]);
    const missing = getMissingEnrichmentFiles(summary);
    expect(missing).not.toContain("messages.csv");
    expect(missing).not.toContain("invitations.csv");
  });
});

// ── shouldShowBanner ────────────────────────────────────────────────────

describe("shouldShowBanner", () => {
  it("shows banner when connections exist and enrichment files are missing", () => {
    const summary = makeSummary(["connections.csv"]);
    expect(shouldShowBanner(true, summary, false)).toBe(true);
  });

  it("hides banner when no connections loaded", () => {
    expect(shouldShowBanner(false, null, false)).toBe(false);
  });

  it("hides banner when dismissed", () => {
    const summary = makeSummary(["connections.csv"]);
    expect(shouldShowBanner(true, summary, true)).toBe(false);
  });

  it("hides banner when all enrichment files are loaded", () => {
    const summary = makeSummary([
      "connections.csv",
      "messages.csv",
      "endorsement_received_info.csv",
      "endorsement_given_info.csv",
      "recommendations_received.csv",
      "invitations.csv",
    ]);
    expect(shouldShowBanner(true, summary, false)).toBe(false);
  });

  it("shows banner when enrichment summary is null but connections exist", () => {
    expect(shouldShowBanner(true, null, false)).toBe(true);
  });

  it("shows banner when some enrichment files are loaded but not all", () => {
    const summary = makeSummary(["connections.csv", "messages.csv"]);
    expect(shouldShowBanner(true, summary, false)).toBe(true);
  });
});
