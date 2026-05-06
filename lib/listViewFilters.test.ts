import { describe, it, expect } from "vitest";
import {
  filterConnections,
  countByView,
  LIST_VIEW_DEFS,
  type ListViewId,
} from "./listViewFilters";
import type { Connection } from "./tieStrength";

// ── Test Helpers ──────────────────────────────────────────────────────────

function makeConnection(overrides: Partial<Connection> = {}): Connection {
  return {
    id: overrides.id || "test-1",
    name: overrides.name || "Test User",
    firstName: overrides.firstName || "Test",
    lastName: overrides.lastName || "User",
    company: overrides.company || "Acme Inc",
    position: overrides.position || "Engineer",
    connectedOn: overrides.connectedOn || "2024-01-15",
    email: overrides.email,
    tieStrength: overrides.tieStrength ?? 0.5,
    tieCategory: overrides.tieCategory || "moderate",
    roleCategory: overrides.roleCategory || "Engineers/Devs",
    daysSinceConnected: overrides.daysSinceConnected ?? 100,
    industryCluster: overrides.industryCluster || "Tech",
    isBridge: overrides.isBridge ?? false,
    networkPosition: overrides.networkPosition || "anchor",
    confidenceLevel: overrides.confidenceLevel || "low",
    activationPriority: overrides.activationPriority ?? 0.5,
    source: overrides.source,
    sources: overrides.sources,
    status: overrides.status,
    isLatentTie: overrides.isLatentTie,
  };
}

const SAMPLE_CONNECTIONS: Connection[] = [
  makeConnection({ id: "1", name: "Alice", tieCategory: "weak", isBridge: true, source: "linkedin_csv", status: undefined }),
  makeConnection({ id: "2", name: "Bob", tieCategory: "strong", isBridge: false, source: "linkedin_csv", status: "researching" }),
  makeConnection({ id: "3", name: "Carol", tieCategory: "moderate", isBridge: false, source: "email_import", status: "new" }),
  makeConnection({ id: "4", name: "Dave", tieCategory: "dormant", isBridge: true, source: "generic_csv", status: "drafted" }),
  makeConnection({ id: "5", name: "Eve", tieCategory: "weak", isBridge: false, source: "manual_entry", status: "sent" }),
  makeConnection({ id: "6", name: "Frank", tieCategory: "moderate", isBridge: false, source: "linkedin_csv", status: "replied" }),
  makeConnection({ id: "7", name: "Grace", tieCategory: "weak", isBridge: false, source: "email_import", isLatentTie: true, status: "meeting_scheduled" }),
  makeConnection({ id: "8", name: "Hank", tieCategory: "strong", isBridge: false, source: "linkedin_csv", status: "converted" }),
  makeConnection({ id: "9", name: "Ivy", tieCategory: "dormant", isBridge: false, source: "linkedin_csv", status: "archived" }),
];

// ── filterConnections ─────────────────────────────────────────────────────

describe("filterConnections", () => {
  it("'all' returns all connections", () => {
    const result = filterConnections(SAMPLE_CONNECTIONS, "all");
    expect(result).toHaveLength(SAMPLE_CONNECTIONS.length);
  });

  it("'weak_ties' filters to only weak ties", () => {
    const result = filterConnections(SAMPLE_CONNECTIONS, "weak_ties");
    expect(result.every((c) => c.tieCategory === "weak")).toBe(true);
    expect(result).toHaveLength(3); // Alice, Eve, Grace
  });

  it("'bridges' filters to only bridge connections", () => {
    const result = filterConnections(SAMPLE_CONNECTIONS, "bridges");
    expect(result.every((c) => c.isBridge)).toBe(true);
    expect(result).toHaveLength(2); // Alice, Dave
  });

  it("'new_uncontacted' includes undefined and 'new' status", () => {
    const result = filterConnections(SAMPLE_CONNECTIONS, "new_uncontacted");
    expect(result.every((c) => !c.status || c.status === "new")).toBe(true);
    expect(result).toHaveLength(2); // Alice (undefined), Carol (new)
  });

  it("'in_progress' includes researching, drafted, sent", () => {
    const result = filterConnections(SAMPLE_CONNECTIONS, "in_progress");
    const validStatuses = new Set(["researching", "drafted", "sent"]);
    expect(result.every((c) => validStatuses.has(c.status!))).toBe(true);
    expect(result).toHaveLength(3); // Bob, Dave, Eve
  });

  it("'linkedin' filters by source linkedin_csv", () => {
    const result = filterConnections(SAMPLE_CONNECTIONS, "linkedin");
    expect(result.every((c) => c.source === "linkedin_csv")).toBe(true);
    expect(result).toHaveLength(5);
  });

  it("'gmail' filters by source email_import", () => {
    const result = filterConnections(SAMPLE_CONNECTIONS, "gmail");
    expect(result.every((c) => c.source === "email_import")).toBe(true);
    expect(result).toHaveLength(2); // Carol, Grace
  });

  it("'latent' filters by isLatentTie", () => {
    const result = filterConnections(SAMPLE_CONNECTIONS, "latent");
    expect(result.every((c) => c.isLatentTie)).toBe(true);
    expect(result).toHaveLength(1); // Grace
  });

  it("returns empty array when no connections match", () => {
    const conns = SAMPLE_CONNECTIONS.filter((c) => c.id !== "7");
    const result = filterConnections(conns, "latent");
    expect(result).toHaveLength(0);
  });

  it("handles empty connections array for all views", () => {
    const views: ListViewId[] = [
      "all", "weak_ties", "bridges", "new_uncontacted",
      "in_progress", "linkedin", "gmail", "latent",
    ];
    for (const view of views) {
      expect(filterConnections([], view)).toHaveLength(0);
    }
  });
});

// ── countByView ───────────────────────────────────────────────────────────

describe("countByView", () => {
  it("counts all views in a single pass", () => {
    const counts = countByView(SAMPLE_CONNECTIONS);
    expect(counts.all).toBe(9);
    expect(counts.weak_ties).toBe(3);
    expect(counts.bridges).toBe(2);
    expect(counts.new_uncontacted).toBe(2);
    expect(counts.in_progress).toBe(3);
    expect(counts.linkedin).toBe(5);
    expect(counts.gmail).toBe(2);
    expect(counts.latent).toBe(1);
  });

  it("returns all zeros for empty array", () => {
    const counts = countByView([]);
    expect(counts.all).toBe(0);
    expect(counts.weak_ties).toBe(0);
    expect(counts.bridges).toBe(0);
  });

  it("counts match filterConnections results", () => {
    const counts = countByView(SAMPLE_CONNECTIONS);
    const views: ListViewId[] = [
      "all", "weak_ties", "bridges", "new_uncontacted",
      "in_progress", "linkedin", "gmail", "latent",
    ];
    for (const view of views) {
      expect(counts[view]).toBe(filterConnections(SAMPLE_CONNECTIONS, view).length);
    }
  });
});

// ── LIST_VIEW_DEFS ────────────────────────────────────────────────────────

describe("LIST_VIEW_DEFS", () => {
  it("has 8 view definitions", () => {
    expect(LIST_VIEW_DEFS).toHaveLength(8);
  });

  it("each definition has unique id and non-empty label", () => {
    const ids = LIST_VIEW_DEFS.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const def of LIST_VIEW_DEFS) {
      expect(def.label.length).toBeGreaterThan(0);
    }
  });

  it("starts with 'all'", () => {
    expect(LIST_VIEW_DEFS[0].id).toBe("all");
  });
});
