/**
 * In-memory sliding-window rate limiter for the AI proxy.
 * Limits requests per license key to prevent abuse.
 *
 * NOTE: This is per-process. In a multi-instance deployment,
 * swap for Redis-backed rate limiting.
 */

const WINDOW_MS = 60 * 1000; // 1-minute sliding window
const MAX_REQUESTS = 20; // 20 requests per minute per key

interface RateEntry {
  timestamps: number[];
}

const store = new Map<string, RateEntry>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

/**
 * Check whether a license key is within its rate limit.
 * If allowed, records the request timestamp.
 * If denied, returns how long until the next slot opens.
 */
export function checkRateLimit(licenseKey: string): RateLimitResult {
  const now = Date.now();
  const entry = store.get(licenseKey) || { timestamps: [] };

  // Prune timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);

  if (entry.timestamps.length >= MAX_REQUESTS) {
    const oldestInWindow = entry.timestamps[0];
    return {
      allowed: false,
      retryAfterMs: WINDOW_MS - (now - oldestInWindow),
    };
  }

  entry.timestamps.push(now);
  store.set(licenseKey, entry);
  return { allowed: true };
}

/**
 * Reset rate limit state for a key. Useful in tests.
 */
export function resetRateLimit(licenseKey: string): void {
  store.delete(licenseKey);
}

/**
 * Clear all rate limit state. Useful in tests.
 */
export function resetAllRateLimits(): void {
  store.clear();
}

// Exported for testing only
export const _config = { WINDOW_MS, MAX_REQUESTS } as const;
