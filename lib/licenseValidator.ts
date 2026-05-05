/**
 * License key validation for the AI proxy.
 *
 * Current: pattern-based validation (NAVOX-XXXX-XXXX-XXXX).
 * Future: validate against a database or licensing service.
 */

const LICENSE_KEY_PATTERN = /^NAVOX-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

/**
 * Validate a license key format.
 * Returns true if the key matches the expected NAVOX-XXXX-XXXX-XXXX pattern.
 *
 * TODO: Replace with DB lookup when payment system is live.
 */
export function isValidLicenseKey(key: string): boolean {
  if (!key || typeof key !== "string") return false;
  return LICENSE_KEY_PATTERN.test(key.trim());
}
