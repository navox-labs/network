import { describe, it, expect } from "vitest";
import { isValidLicenseKey } from "./licenseValidator";

describe("isValidLicenseKey", () => {
  it("accepts valid NAVOX-XXXX-XXXX-XXXX keys", () => {
    expect(isValidLicenseKey("NAVOX-ABCD-1234-EF56")).toBe(true);
    expect(isValidLicenseKey("NAVOX-0000-AAAA-ZZZZ")).toBe(true);
    expect(isValidLicenseKey("NAVOX-A1B2-C3D4-E5F6")).toBe(true);
  });

  it("rejects keys with lowercase letters", () => {
    expect(isValidLicenseKey("NAVOX-abcd-1234-EF56")).toBe(false);
  });

  it("rejects keys with wrong prefix", () => {
    expect(isValidLicenseKey("XAVOX-ABCD-1234-EF56")).toBe(false);
    expect(isValidLicenseKey("navox-ABCD-1234-EF56")).toBe(false);
  });

  it("rejects keys with wrong segment length", () => {
    expect(isValidLicenseKey("NAVOX-ABC-1234-EF56")).toBe(false);
    expect(isValidLicenseKey("NAVOX-ABCDE-1234-EF56")).toBe(false);
    expect(isValidLicenseKey("NAVOX-ABCD-123-EF56")).toBe(false);
    expect(isValidLicenseKey("NAVOX-ABCD-1234-EF5")).toBe(false);
  });

  it("rejects keys with extra segments", () => {
    expect(isValidLicenseKey("NAVOX-ABCD-1234-EF56-7890")).toBe(false);
  });

  it("rejects keys with missing segments", () => {
    expect(isValidLicenseKey("NAVOX-ABCD-1234")).toBe(false);
    expect(isValidLicenseKey("NAVOX-ABCD")).toBe(false);
  });

  it("rejects empty and invalid inputs", () => {
    expect(isValidLicenseKey("")).toBe(false);
    expect(isValidLicenseKey(null as unknown as string)).toBe(false);
    expect(isValidLicenseKey(undefined as unknown as string)).toBe(false);
    expect(isValidLicenseKey(42 as unknown as string)).toBe(false);
  });

  it("rejects keys with special characters", () => {
    expect(isValidLicenseKey("NAVOX-AB!D-1234-EF56")).toBe(false);
    expect(isValidLicenseKey("NAVOX-ABCD-12@4-EF56")).toBe(false);
  });

  it("trims whitespace before validating", () => {
    expect(isValidLicenseKey("  NAVOX-ABCD-1234-EF56  ")).toBe(true);
  });
});
