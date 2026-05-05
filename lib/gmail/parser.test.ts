import { describe, it, expect, vi, beforeEach } from "vitest";
import type { EmailContact } from "./types";

// Mock the tieStrength module so tests don't depend on date calculations
vi.mock("@/lib/tieStrength", () => ({
  calculateTieStrength: vi.fn(() => 0.5),
  tieCategoryFromStrength: vi.fn(() => "moderate"),
  classifyIndustry: vi.fn(() => "Other"),
  classifyRole: vi.fn(() => "Other"),
  activationPriority: vi.fn(() => 0.35),
  assignConfidenceLevel: vi.fn(() => "low"),
}));

import { emailContactsToConnections } from "./parser";

describe("emailContactsToConnections", () => {
  const baseContact: EmailContact = {
    email: "alice@example.com",
    name: "Alice Smith",
    frequency: 5,
    lastDate: "2026-01-15T10:00:00.000Z",
    direction: "both",
  };

  it("converts an email contact to a Connection", () => {
    const result = emailContactsToConnections([baseContact]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "email-0",
      name: "Alice Smith",
      firstName: "Alice",
      lastName: "Smith",
      company: "",
      position: "",
      email: "alice@example.com",
      source: "email_import",
      sources: ["email_import"],
      isLatentTie: true,
    });
  });

  it("filters out contacts with fewer than 2 emails", () => {
    const lowFrequency: EmailContact = {
      ...baseContact,
      frequency: 1,
    };
    const result = emailContactsToConnections([lowFrequency]);
    expect(result).toHaveLength(0);
  });

  it("includes contacts with exactly 2 emails", () => {
    const minFrequency: EmailContact = {
      ...baseContact,
      frequency: 2,
    };
    const result = emailContactsToConnections([minFrequency]);
    expect(result).toHaveLength(1);
  });

  it("filters out contacts with empty email", () => {
    const noEmail: EmailContact = {
      ...baseContact,
      email: "",
      frequency: 5,
    };
    const result = emailContactsToConnections([noEmail]);
    expect(result).toHaveLength(0);
  });

  it("derives name from email when name is missing", () => {
    const noName: EmailContact = {
      email: "jane.doe@company.com",
      frequency: 3,
      lastDate: "2026-01-15T10:00:00.000Z",
      direction: "sent",
    };
    const result = emailContactsToConnections([noName]);
    expect(result[0].firstName).toBe("jane.doe");
    expect(result[0].lastName).toBe("");
  });

  it("uses startId offset for id generation", () => {
    const result = emailContactsToConnections([baseContact], 100);
    expect(result[0].id).toBe("email-100");
  });

  it("generates sequential IDs for multiple contacts", () => {
    const contacts: EmailContact[] = [
      { ...baseContact, email: "a@x.com" },
      { ...baseContact, email: "b@x.com" },
      { ...baseContact, email: "c@x.com" },
    ];
    const result = emailContactsToConnections(contacts, 5);
    expect(result.map((c) => c.id)).toEqual([
      "email-5",
      "email-6",
      "email-7",
    ]);
  });

  it("sets connectedOn from lastDate", () => {
    const result = emailContactsToConnections([baseContact]);
    expect(result[0].connectedOn).toBe("2026-01-15T10:00:00.000Z");
  });

  it("sets networkPosition to explorer for email contacts", () => {
    const result = emailContactsToConnections([baseContact]);
    expect(result[0].networkPosition).toBe("explorer");
  });

  it("sets isBridge to false for email contacts", () => {
    const result = emailContactsToConnections([baseContact]);
    expect(result[0].isBridge).toBe(false);
  });

  it("handles name with multiple spaces", () => {
    const multiName: EmailContact = {
      ...baseContact,
      name: "Alice van der Smith",
    };
    const result = emailContactsToConnections([multiName]);
    expect(result[0].firstName).toBe("Alice");
    expect(result[0].lastName).toBe("van der Smith");
    expect(result[0].name).toBe("Alice van der Smith");
  });

  it("returns empty array for empty input", () => {
    const result = emailContactsToConnections([]);
    expect(result).toEqual([]);
  });
});
