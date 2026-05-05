import { describe, it, expect } from "vitest";
import {
  matchByEmail,
  matchByNameAndCompany,
  contactsMatch,
  mergeMultiSourceContacts,
  findLatentTies,
} from "./setLogic";
import type { Connection } from "./tieStrength";

// ── Helper: minimal Connection factory ──────────────────────────────────

function makeConnection(overrides: Partial<Connection> = {}): Connection {
  return {
    id: "conn-0",
    name: "Test User",
    firstName: "Test",
    lastName: "User",
    company: "TestCo",
    position: "Engineer",
    connectedOn: "2025-01-01",
    tieStrength: 0.5,
    tieCategory: "moderate",
    roleCategory: "Engineers/Devs",
    daysSinceConnected: 100,
    industryCluster: "Tech",
    isBridge: false,
    networkPosition: "anchor",
    confidenceLevel: "low",
    activationPriority: 0.3,
    ...overrides,
  };
}

// ── matchByEmail ────────────────────────────────────────────────────────

describe("matchByEmail", () => {
  it("matches emails case-insensitively", () => {
    const a = makeConnection({ email: "Alice@Example.com" });
    const b = makeConnection({ email: "alice@example.com" });
    expect(matchByEmail(a, b)).toBe(true);
  });

  it("matches emails with whitespace trimmed", () => {
    const a = makeConnection({ email: " alice@test.com " });
    const b = makeConnection({ email: "alice@test.com" });
    expect(matchByEmail(a, b)).toBe(true);
  });

  it("does not match different emails", () => {
    const a = makeConnection({ email: "alice@test.com" });
    const b = makeConnection({ email: "bob@test.com" });
    expect(matchByEmail(a, b)).toBe(false);
  });

  it("does not match when either email is missing", () => {
    const a = makeConnection({ email: "alice@test.com" });
    const b = makeConnection({ email: undefined });
    expect(matchByEmail(a, b)).toBe(false);
  });

  it("does not match when both emails are empty strings", () => {
    const a = makeConnection({ email: "" });
    const b = makeConnection({ email: "" });
    expect(matchByEmail(a, b)).toBe(false);
  });
});

// ── matchByNameAndCompany ───────────────────────────────────────────────

describe("matchByNameAndCompany", () => {
  it("matches case-insensitively on all three fields", () => {
    const a = makeConnection({ firstName: "Alice", lastName: "Smith", company: "Google" });
    const b = makeConnection({ firstName: "alice", lastName: "smith", company: "google" });
    expect(matchByNameAndCompany(a, b)).toBe(true);
  });

  it("does not match when company differs", () => {
    const a = makeConnection({ firstName: "Alice", lastName: "Smith", company: "Google" });
    const b = makeConnection({ firstName: "Alice", lastName: "Smith", company: "Meta" });
    expect(matchByNameAndCompany(a, b)).toBe(false);
  });

  it("does not match when firstName is empty", () => {
    const a = makeConnection({ firstName: "", lastName: "Smith", company: "Google" });
    const b = makeConnection({ firstName: "", lastName: "Smith", company: "Google" });
    expect(matchByNameAndCompany(a, b)).toBe(false);
  });

  it("does not match when lastName is empty", () => {
    const a = makeConnection({ firstName: "Alice", lastName: "", company: "Google" });
    const b = makeConnection({ firstName: "Alice", lastName: "", company: "Google" });
    expect(matchByNameAndCompany(a, b)).toBe(false);
  });

  it("does not match when company is empty", () => {
    const a = makeConnection({ firstName: "Alice", lastName: "Smith", company: "" });
    const b = makeConnection({ firstName: "Alice", lastName: "Smith", company: "" });
    expect(matchByNameAndCompany(a, b)).toBe(false);
  });

  it("trims whitespace before matching", () => {
    const a = makeConnection({ firstName: " Alice ", lastName: " Smith ", company: " Google " });
    const b = makeConnection({ firstName: "Alice", lastName: "Smith", company: "Google" });
    expect(matchByNameAndCompany(a, b)).toBe(true);
  });
});

// ── contactsMatch ───────────────────────────────────────────────────────

describe("contactsMatch", () => {
  it("matches by email even when name/company differ", () => {
    const a = makeConnection({ email: "alice@test.com", firstName: "Alice", lastName: "A", company: "X" });
    const b = makeConnection({ email: "alice@test.com", firstName: "Bob", lastName: "B", company: "Y" });
    expect(contactsMatch(a, b)).toBe(true);
  });

  it("matches by name+company when emails differ", () => {
    const a = makeConnection({ email: "alice@old.com", firstName: "Alice", lastName: "Smith", company: "Google" });
    const b = makeConnection({ email: "alice@new.com", firstName: "Alice", lastName: "Smith", company: "Google" });
    expect(contactsMatch(a, b)).toBe(true);
  });

  it("does not match when neither email nor name+company match", () => {
    const a = makeConnection({ email: "alice@test.com", firstName: "Alice", lastName: "Smith", company: "Google" });
    const b = makeConnection({ email: "bob@test.com", firstName: "Bob", lastName: "Jones", company: "Meta" });
    expect(contactsMatch(a, b)).toBe(false);
  });
});

// ── mergeMultiSourceContacts ────────────────────────────────────────────

describe("mergeMultiSourceContacts", () => {
  it("adds non-matching incoming contacts as new entries", () => {
    const existing = [makeConnection({ id: "conn-0", firstName: "Alice", email: "alice@test.com" })];
    const incoming = [makeConnection({ id: "conn-1", firstName: "Bob", email: "bob@test.com" })];

    const merged = mergeMultiSourceContacts(existing, incoming, "generic_csv");
    expect(merged).toHaveLength(2);
    expect(merged[1].firstName).toBe("Bob");
    expect(merged[1].source).toBe("generic_csv");
    expect(merged[1].sources).toEqual(["generic_csv"]);
  });

  it("merges matching contacts by email — adds source and keeps higher tie strength", () => {
    const existing = [
      makeConnection({
        id: "conn-0",
        email: "alice@test.com",
        tieStrength: 0.3,
        source: "linkedin_csv",
        sources: ["linkedin_csv"],
      }),
    ];
    const incoming = [
      makeConnection({
        id: "new-0",
        email: "alice@test.com",
        tieStrength: 0.7,
      }),
    ];

    const merged = mergeMultiSourceContacts(existing, incoming, "generic_csv");
    expect(merged).toHaveLength(1);
    expect(merged[0].sources).toContain("linkedin_csv");
    expect(merged[0].sources).toContain("generic_csv");
    expect(merged[0].tieStrength).toBe(0.7);
  });

  it("merges matching contacts by name+company", () => {
    const existing = [
      makeConnection({
        id: "conn-0",
        firstName: "Alice",
        lastName: "Smith",
        company: "Google",
        email: undefined,
        sources: ["linkedin_csv"],
      }),
    ];
    const incoming = [
      makeConnection({
        id: "new-0",
        firstName: "alice",
        lastName: "smith",
        company: "google",
        email: "alice@google.com",
      }),
    ];

    const merged = mergeMultiSourceContacts(existing, incoming, "generic_csv");
    expect(merged).toHaveLength(1);
    expect(merged[0].sources).toContain("generic_csv");
    // Backfills email from incoming
    expect(merged[0].email).toBe("alice@google.com");
  });

  it("does not duplicate source if already present", () => {
    const existing = [
      makeConnection({
        id: "conn-0",
        email: "alice@test.com",
        sources: ["linkedin_csv", "generic_csv"],
      }),
    ];
    const incoming = [makeConnection({ id: "new-0", email: "alice@test.com" })];

    const merged = mergeMultiSourceContacts(existing, incoming, "generic_csv");
    expect(merged[0].sources!.filter((s) => s === "generic_csv")).toHaveLength(1);
  });

  it("does not mutate existing array", () => {
    const existing = [makeConnection({ id: "conn-0", email: "alice@test.com", sources: ["linkedin_csv"] })];
    const originalSources = [...existing[0].sources!];

    mergeMultiSourceContacts(existing, [makeConnection({ email: "alice@test.com" })], "generic_csv");
    expect(existing[0].sources).toEqual(originalSources);
  });

  it("handles empty incoming array", () => {
    const existing = [makeConnection({ id: "conn-0" })];
    const merged = mergeMultiSourceContacts(existing, [], "generic_csv");
    expect(merged).toHaveLength(1);
  });

  it("handles empty existing array", () => {
    const incoming = [makeConnection({ id: "conn-0" })];
    const merged = mergeMultiSourceContacts([], incoming, "manual_entry");
    expect(merged).toHaveLength(1);
    expect(merged[0].source).toBe("manual_entry");
  });

  it("keeps existing tie strength when it is higher", () => {
    const existing = [
      makeConnection({ email: "a@b.com", tieStrength: 0.8, sources: ["linkedin_csv"] }),
    ];
    const incoming = [makeConnection({ email: "a@b.com", tieStrength: 0.3 })];

    const merged = mergeMultiSourceContacts(existing, incoming, "generic_csv");
    expect(merged[0].tieStrength).toBe(0.8);
  });
});

// ── findLatentTies ──────────────────────────────────────────────────────

describe("findLatentTies", () => {
  it("returns contacts in secondary that have no match in primary", () => {
    const primary = [makeConnection({ id: "p1", email: "alice@test.com" })];
    const secondary = [
      makeConnection({ id: "s1", email: "alice@test.com" }),
      makeConnection({ id: "s2", email: "bob@test.com", firstName: "Bob" }),
    ];

    const latent = findLatentTies(primary, secondary);
    expect(latent).toHaveLength(1);
    expect(latent[0].email).toBe("bob@test.com");
    expect(latent[0].isLatentTie).toBe(true);
  });

  it("returns empty array when all secondary contacts match primary", () => {
    const primary = [makeConnection({ email: "alice@test.com" })];
    const secondary = [makeConnection({ email: "alice@test.com" })];

    expect(findLatentTies(primary, secondary)).toHaveLength(0);
  });

  it("returns all secondary contacts when none match primary", () => {
    const primary = [makeConnection({ email: "alice@test.com" })];
    const secondary = [
      makeConnection({ id: "s1", email: "bob@test.com", firstName: "Bob" }),
      makeConnection({ id: "s2", email: "carol@test.com", firstName: "Carol" }),
    ];

    const latent = findLatentTies(primary, secondary);
    expect(latent).toHaveLength(2);
    expect(latent.every((c) => c.isLatentTie === true)).toBe(true);
  });

  it("handles empty primary — all secondary are latent", () => {
    const secondary = [makeConnection({ id: "s1" })];
    const latent = findLatentTies([], secondary);
    expect(latent).toHaveLength(1);
  });

  it("handles empty secondary — returns empty", () => {
    const primary = [makeConnection({ id: "p1" })];
    expect(findLatentTies(primary, [])).toHaveLength(0);
  });

  it("does not mutate input arrays", () => {
    const primary = [makeConnection({ email: "a@b.com" })];
    const secondary = [makeConnection({ email: "c@d.com" })];
    const origLen = secondary.length;

    findLatentTies(primary, secondary);
    expect(secondary).toHaveLength(origLen);
    expect(secondary[0].isLatentTie).toBeUndefined();
  });
});
