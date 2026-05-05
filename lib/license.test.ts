import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock localDB — must be hoisted before import
// ---------------------------------------------------------------------------
const mockStore: Record<string, unknown> = {};

vi.mock("./localDB", () => ({
  getSetting: vi.fn(async (key: string) => mockStore[key]),
  setSetting: vi.fn(async (key: string, value: unknown) => {
    mockStore[key] = value;
  }),
  deleteSetting: vi.fn(async (key: string) => {
    delete mockStore[key];
  }),
}));

// Mock fetch globally
const mockFetch = vi.fn();
Object.defineProperty(globalThis, "fetch", { value: mockFetch, writable: true });

import {
  getLicenseKey,
  saveLicenseKey,
  removeLicenseKey,
  isLicensed,
  validateLicense,
  isValidKeyFormat,
  LICENSE_KEY_PATTERN,
} from "./license";

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(mockStore).forEach((k) => delete mockStore[k]);
});

// ---------------------------------------------------------------------------
// isValidKeyFormat
// ---------------------------------------------------------------------------
describe("isValidKeyFormat", () => {
  it("accepts valid key format", () => {
    expect(isValidKeyFormat("NAVOX-AB12-CD34-EF56")).toBe(true);
  });

  it("accepts lowercase input (auto-uppercases)", () => {
    expect(isValidKeyFormat("navox-ab12-cd34-ef56")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isValidKeyFormat("")).toBe(false);
  });

  it("rejects wrong prefix", () => {
    expect(isValidKeyFormat("XNAVOX-AB12-CD34-EF56")).toBe(false);
  });

  it("rejects too few segments", () => {
    expect(isValidKeyFormat("NAVOX-AB12-CD34")).toBe(false);
  });

  it("rejects too many segments", () => {
    expect(isValidKeyFormat("NAVOX-AB12-CD34-EF56-GH78")).toBe(false);
  });

  it("rejects segments with wrong length", () => {
    expect(isValidKeyFormat("NAVOX-AB1-CD34-EF56")).toBe(false);
  });

  it("rejects special characters in segments", () => {
    expect(isValidKeyFormat("NAVOX-AB!2-CD34-EF56")).toBe(false);
  });

  it("handles whitespace padding", () => {
    expect(isValidKeyFormat("  NAVOX-AB12-CD34-EF56  ")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// LICENSE_KEY_PATTERN
// ---------------------------------------------------------------------------
describe("LICENSE_KEY_PATTERN", () => {
  it("matches all-letter segments", () => {
    expect(LICENSE_KEY_PATTERN.test("NAVOX-ABCD-EFGH-IJKL")).toBe(true);
  });

  it("matches all-number segments", () => {
    expect(LICENSE_KEY_PATTERN.test("NAVOX-1234-5678-9012")).toBe(true);
  });

  it("matches mixed segments", () => {
    expect(LICENSE_KEY_PATTERN.test("NAVOX-A1B2-C3D4-E5F6")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getLicenseKey / saveLicenseKey / removeLicenseKey
// ---------------------------------------------------------------------------
describe("getLicenseKey", () => {
  it("returns null when no key stored", async () => {
    const result = await getLicenseKey();
    expect(result).toBeNull();
  });

  it("returns stored key", async () => {
    mockStore["licenseKey"] = "NAVOX-TEST-KEY1-AAAA";
    const result = await getLicenseKey();
    expect(result).toBe("NAVOX-TEST-KEY1-AAAA");
  });
});

describe("saveLicenseKey", () => {
  it("stores key in settings", async () => {
    await saveLicenseKey("NAVOX-SAVE-TEST-BBBB");
    expect(mockStore["licenseKey"]).toBe("NAVOX-SAVE-TEST-BBBB");
  });
});

describe("removeLicenseKey", () => {
  it("removes key and status", async () => {
    mockStore["licenseKey"] = "NAVOX-DEL1-DEL2-DEL3";
    mockStore["licenseStatus"] = { valid: true, status: "active" };
    await removeLicenseKey();
    expect(mockStore["licenseKey"]).toBeUndefined();
    expect(mockStore["licenseStatus"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// isLicensed
// ---------------------------------------------------------------------------
describe("isLicensed", () => {
  it("returns false when no key exists", async () => {
    expect(await isLicensed()).toBe(false);
  });

  it("returns false when key exists but no cached status", async () => {
    mockStore["licenseKey"] = "NAVOX-TEST-KEY1-AAAA";
    expect(await isLicensed()).toBe(false);
  });

  it("returns false when status is expired", async () => {
    mockStore["licenseKey"] = "NAVOX-TEST-KEY1-AAAA";
    mockStore["licenseStatus"] = { valid: false, status: "expired" };
    expect(await isLicensed()).toBe(false);
  });

  it("returns false when status is cancelled", async () => {
    mockStore["licenseKey"] = "NAVOX-TEST-KEY1-AAAA";
    mockStore["licenseStatus"] = { valid: false, status: "cancelled" };
    expect(await isLicensed()).toBe(false);
  });

  it("returns true when status is active and valid", async () => {
    mockStore["licenseKey"] = "NAVOX-TEST-KEY1-AAAA";
    mockStore["licenseStatus"] = { valid: true, status: "active" };
    expect(await isLicensed()).toBe(true);
  });

  it("returns false when valid is true but status is not active", async () => {
    mockStore["licenseKey"] = "NAVOX-TEST-KEY1-AAAA";
    mockStore["licenseStatus"] = { valid: true, status: "expired" };
    expect(await isLicensed()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateLicense
// ---------------------------------------------------------------------------
describe("validateLicense", () => {
  it("returns valid result on successful validation", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true, status: "active", expiresAt: null }),
    });

    const result = await validateLicense("NAVOX-TEST-KEY1-AAAA");
    expect(result).toEqual({
      valid: true,
      status: "active",
      expiresAt: null,
    });
    // Should cache the result
    expect(mockStore["licenseStatus"]).toEqual({
      valid: true,
      status: "active",
      expiresAt: null,
    });
  });

  it("returns expired when server returns non-ok", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    const result = await validateLicense("BAD-KEY");
    expect(result).toEqual({ valid: false, status: "expired" });
  });

  it("returns invalid result for expired key", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        valid: false,
        status: "expired",
        expiresAt: "2025-01-01T00:00:00Z",
      }),
    });

    const result = await validateLicense("NAVOX-EXPI-RED1-KEY1");
    expect(result.valid).toBe(false);
    expect(result.status).toBe("expired");
  });

  it("sends correct request to validate endpoint", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true, status: "active", expiresAt: null }),
    });

    await validateLicense("NAVOX-AB12-CD34-EF56");

    expect(mockFetch).toHaveBeenCalledWith("/network/api/license/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "NAVOX-AB12-CD34-EF56" }),
    });
  });

  it("caches cancelled status", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: false, status: "cancelled" }),
    });

    const result = await validateLicense("NAVOX-CANC-EL12-KEY1");
    expect(result.status).toBe("cancelled");
    expect(mockStore["licenseStatus"]).toEqual({
      valid: false,
      status: "cancelled",
      expiresAt: undefined,
    });
  });
});
