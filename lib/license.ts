/**
 * Navox Network — License Key Management
 *
 * Handles license key storage (IndexedDB), validation (server-side),
 * and status caching. No signup, no login, no sessions.
 *
 * Flow: User pays via Stripe -> gets key by email -> enters in app.
 */

import { getSetting, setSetting, deleteSetting } from "./localDB";

const LICENSE_KEY = "licenseKey";
const LICENSE_STATUS_KEY = "licenseStatus";

export interface LicenseValidation {
  valid: boolean;
  status: "active" | "expired" | "cancelled";
  expiresAt?: string;
}

/** Retrieve stored license key from IndexedDB. */
export async function getLicenseKey(): Promise<string | null> {
  const key = await getSetting<string>(LICENSE_KEY);
  return key ?? null;
}

/** Persist license key to IndexedDB. */
export async function saveLicenseKey(key: string): Promise<void> {
  await setSetting(LICENSE_KEY, key);
}

/** Remove license key and cached status from IndexedDB. */
export async function removeLicenseKey(): Promise<void> {
  await deleteSetting(LICENSE_KEY);
  await deleteSetting(LICENSE_STATUS_KEY);
}

/** Check if user has an active license based on cached status. */
export async function isLicensed(): Promise<boolean> {
  const key = await getLicenseKey();
  if (!key) return false;
  const status = await getSetting<LicenseValidation>(LICENSE_STATUS_KEY);
  return status?.valid === true && status?.status === "active";
}

/** Validate a license key against the server and cache the result. */
export async function validateLicense(
  key: string,
): Promise<LicenseValidation> {
  const res = await fetch("/network/api/license/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });

  if (!res.ok) {
    return { valid: false, status: "expired" };
  }

  const data = await res.json();
  const validation: LicenseValidation = {
    valid: data.valid,
    status: data.status,
    expiresAt: data.expiresAt,
  };

  // Cache validation result locally
  await setSetting(LICENSE_STATUS_KEY, validation);
  return validation;
}

/** License key format: NAVOX-XXXX-XXXX-XXXX (alphanumeric segments). */
export const LICENSE_KEY_PATTERN =
  /^NAVOX-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

/** Check if a string matches the license key format (client-side only). */
export function isValidKeyFormat(key: string): boolean {
  return LICENSE_KEY_PATTERN.test(key.toUpperCase().trim());
}
