import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractEmail, extractName } from "./client";

// ── extractEmail ──────────────────────────────────────────────────────────

describe("extractEmail", () => {
  it("extracts email from angle bracket format", () => {
    expect(extractEmail("Jane Doe <jane@example.com>")).toBe("jane@example.com");
  });

  it("extracts email from quoted name format", () => {
    expect(extractEmail('"Jane Doe" <jane@example.com>')).toBe(
      "jane@example.com"
    );
  });

  it("returns plain email when no angle brackets", () => {
    expect(extractEmail("jane@example.com")).toBe("jane@example.com");
  });

  it("trims whitespace from plain email", () => {
    expect(extractEmail("  jane@example.com  ")).toBe("jane@example.com");
  });

  it("returns null when no email present", () => {
    expect(extractEmail("Jane Doe")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractEmail("")).toBeNull();
  });

  it("handles email with subaddressing", () => {
    expect(extractEmail("Test <user+tag@example.com>")).toBe(
      "user+tag@example.com"
    );
  });

  it("handles email with dots in local part", () => {
    expect(extractEmail("Test <first.last@example.com>")).toBe(
      "first.last@example.com"
    );
  });
});

// ── extractName ───────────────────────────────────────────────────────────

describe("extractName", () => {
  it("extracts name from standard format", () => {
    expect(extractName("Jane Doe <jane@example.com>")).toBe("Jane Doe");
  });

  it("extracts name from quoted format", () => {
    expect(extractName('"Jane Doe" <jane@example.com>')).toBe("Jane Doe");
  });

  it("returns null when only email is present", () => {
    expect(extractName("jane@example.com")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractName("")).toBeNull();
  });

  it("trims whitespace from extracted name", () => {
    expect(extractName("  Jane Doe  <jane@example.com>")).toBe("Jane Doe");
  });

  it("handles single name before angle brackets", () => {
    expect(extractName("Jane <jane@example.com>")).toBe("Jane");
  });
});

// ── Auth state management ─────────────────────────────────────────────────
// These tests mock localDB to verify auth state logic without IndexedDB.

describe("auth state management", () => {
  let mockStorage: Record<string, unknown>;

  beforeEach(() => {
    mockStorage = {};
    vi.resetModules();
  });

  async function loadModuleWithMocks() {
    vi.doMock("@/lib/localDB", () => ({
      getSetting: vi.fn(async (key: string) => mockStorage[key] ?? undefined),
      setSetting: vi.fn(async (key: string, value: unknown) => {
        mockStorage[key] = value;
      }),
      deleteSetting: vi.fn(async (key: string) => {
        delete mockStorage[key];
      }),
    }));

    return await import("./client");
  }

  it("getGmailAuth returns null when no auth stored", async () => {
    const { getGmailAuth } = await loadModuleWithMocks();
    const result = await getGmailAuth();
    expect(result).toBeNull();
  });

  it("saveGmailAuth persists auth state", async () => {
    const { saveGmailAuth, getGmailAuth } = await loadModuleWithMocks();
    const state = {
      accessToken: "test-token",
      refreshToken: "test-refresh",
      expiresAt: Date.now() + 3600000,
    };
    await saveGmailAuth(state);
    const result = await getGmailAuth();
    expect(result).toEqual(state);
  });

  it("clearGmailAuth removes auth state", async () => {
    const { saveGmailAuth, clearGmailAuth, getGmailAuth } =
      await loadModuleWithMocks();
    await saveGmailAuth({
      accessToken: "test",
      refreshToken: "test",
      expiresAt: Date.now() + 3600000,
    });
    await clearGmailAuth();
    const result = await getGmailAuth();
    expect(result).toBeNull();
  });

  it("isGmailConnected returns true when token is not expired", async () => {
    const { saveGmailAuth, isGmailConnected } = await loadModuleWithMocks();
    await saveGmailAuth({
      accessToken: "test",
      refreshToken: "test",
      expiresAt: Date.now() + 3600000, // 1 hour from now
    });
    const result = await isGmailConnected();
    expect(result).toBe(true);
  });

  it("isGmailConnected returns false when token is expired", async () => {
    const { saveGmailAuth, isGmailConnected } = await loadModuleWithMocks();
    await saveGmailAuth({
      accessToken: "test",
      refreshToken: "test",
      expiresAt: Date.now() - 1000, // 1 second ago
    });
    const result = await isGmailConnected();
    expect(result).toBe(false);
  });

  it("isGmailConnected returns false when no auth stored", async () => {
    const { isGmailConnected } = await loadModuleWithMocks();
    const result = await isGmailConnected();
    expect(result).toBe(false);
  });
});

// ── fetchEmailContacts ────────────────────────────────────────────────────

describe("fetchEmailContacts", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("throws on non-200 list response", async () => {
    vi.doMock("@/lib/localDB", () => ({
      getSetting: vi.fn(),
      setSetting: vi.fn(),
      deleteSetting: vi.fn(),
    }));

    const { fetchEmailContacts } = await import("./client");

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    await expect(fetchEmailContacts("bad-token")).rejects.toThrow(
      "Gmail API error: 401"
    );
  });

  it("returns empty array when no messages", async () => {
    vi.doMock("@/lib/localDB", () => ({
      getSetting: vi.fn(),
      setSetting: vi.fn(),
      deleteSetting: vi.fn(),
    }));

    const { fetchEmailContacts } = await import("./client");

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [] }),
    });

    const result = await fetchEmailContacts("test-token");
    expect(result).toEqual([]);
  });

  it("extracts contacts from message headers", async () => {
    vi.doMock("@/lib/localDB", () => ({
      getSetting: vi.fn(),
      setSetting: vi.fn(),
      deleteSetting: vi.fn(),
    }));

    const { fetchEmailContacts } = await import("./client");

    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    // List response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        messages: [{ id: "msg-1" }, { id: "msg-2" }],
      }),
    });

    // Message 1: sent email
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        payload: {
          headers: [
            { name: "From", value: "me@example.com" },
            { name: "To", value: "Alice Smith <alice@example.com>" },
            { name: "Date", value: "2026-01-15T10:00:00Z" },
          ],
        },
        labelIds: ["SENT"],
      }),
    });

    // Message 2: received email from same person
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        payload: {
          headers: [
            { name: "From", value: "Alice Smith <alice@example.com>" },
            { name: "To", value: "me@example.com" },
            { name: "Date", value: "2026-01-16T10:00:00Z" },
          ],
        },
        labelIds: ["INBOX"],
      }),
    });

    const result = await fetchEmailContacts("test-token");

    expect(result).toHaveLength(1);
    expect(result[0].email).toBe("alice@example.com");
    expect(result[0].name).toBe("Alice Smith");
    expect(result[0].frequency).toBe(2);
    expect(result[0].direction).toBe("both");
    expect(result[0].lastDate).toBe("2026-01-16T10:00:00.000Z");
  });

  it("handles multiple distinct contacts", async () => {
    vi.doMock("@/lib/localDB", () => ({
      getSetting: vi.fn(),
      setSetting: vi.fn(),
      deleteSetting: vi.fn(),
    }));

    const { fetchEmailContacts } = await import("./client");

    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        messages: [{ id: "msg-1" }, { id: "msg-2" }],
      }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        payload: {
          headers: [
            { name: "From", value: "me@example.com" },
            { name: "To", value: "Alice <alice@a.com>" },
            { name: "Date", value: "2026-01-15T10:00:00Z" },
          ],
        },
        labelIds: ["SENT"],
      }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        payload: {
          headers: [
            { name: "From", value: "Bob <bob@b.com>" },
            { name: "To", value: "me@example.com" },
            { name: "Date", value: "2026-01-16T10:00:00Z" },
          ],
        },
        labelIds: ["INBOX"],
      }),
    });

    const result = await fetchEmailContacts("test-token");

    expect(result).toHaveLength(2);
    const emails = result.map((c) => c.email).sort();
    expect(emails).toEqual(["alice@a.com", "bob@b.com"]);
  });

  it("skips messages with failed individual fetches", async () => {
    vi.doMock("@/lib/localDB", () => ({
      getSetting: vi.fn(),
      setSetting: vi.fn(),
      deleteSetting: vi.fn(),
    }));

    const { fetchEmailContacts } = await import("./client");

    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        messages: [{ id: "msg-1" }, { id: "msg-2" }],
      }),
    });

    // First message fails
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    // Second message succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        payload: {
          headers: [
            { name: "From", value: "Bob <bob@b.com>" },
            { name: "To", value: "me@example.com" },
            { name: "Date", value: "2026-01-16T10:00:00Z" },
          ],
        },
        labelIds: ["INBOX"],
      }),
    });

    const result = await fetchEmailContacts("test-token");

    expect(result).toHaveLength(1);
    expect(result[0].email).toBe("bob@b.com");
  });

  it("normalizes email to lowercase", async () => {
    vi.doMock("@/lib/localDB", () => ({
      getSetting: vi.fn(),
      setSetting: vi.fn(),
      deleteSetting: vi.fn(),
    }));

    const { fetchEmailContacts } = await import("./client");

    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        messages: [{ id: "msg-1" }],
      }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        payload: {
          headers: [
            { name: "From", value: "me@example.com" },
            { name: "To", value: "Alice <ALICE@Example.COM>" },
            { name: "Date", value: "2026-01-15T10:00:00Z" },
          ],
        },
        labelIds: ["SENT"],
      }),
    });

    const result = await fetchEmailContacts("test-token");
    expect(result[0].email).toBe("alice@example.com");
  });
});
