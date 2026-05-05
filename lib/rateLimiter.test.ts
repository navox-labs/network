import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  checkRateLimit,
  resetRateLimit,
  resetAllRateLimits,
  _config,
} from "./rateLimiter";

beforeEach(() => {
  resetAllRateLimits();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("checkRateLimit", () => {
  it("allows first request", () => {
    const result = checkRateLimit("NAVOX-AAAA-BBBB-CCCC");
    expect(result.allowed).toBe(true);
    expect(result.retryAfterMs).toBeUndefined();
  });

  it("allows up to MAX_REQUESTS within window", () => {
    const key = "NAVOX-AAAA-BBBB-CCCC";
    for (let i = 0; i < _config.MAX_REQUESTS; i++) {
      const result = checkRateLimit(key);
      expect(result.allowed).toBe(true);
    }
  });

  it("denies request after MAX_REQUESTS within window", () => {
    const key = "NAVOX-AAAA-BBBB-CCCC";
    for (let i = 0; i < _config.MAX_REQUESTS; i++) {
      checkRateLimit(key);
    }
    const result = checkRateLimit(key);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(_config.WINDOW_MS);
  });

  it("isolates rate limits between different keys", () => {
    const key1 = "NAVOX-AAAA-BBBB-CCCC";
    const key2 = "NAVOX-DDDD-EEEE-FFFF";

    // Exhaust key1
    for (let i = 0; i < _config.MAX_REQUESTS; i++) {
      checkRateLimit(key1);
    }
    expect(checkRateLimit(key1).allowed).toBe(false);

    // key2 should still be allowed
    expect(checkRateLimit(key2).allowed).toBe(true);
  });

  it("allows requests after window expires", () => {
    const key = "NAVOX-AAAA-BBBB-CCCC";
    const now = 1700000000000;

    vi.spyOn(Date, "now").mockReturnValue(now);

    // Exhaust the limit
    for (let i = 0; i < _config.MAX_REQUESTS; i++) {
      checkRateLimit(key);
    }
    expect(checkRateLimit(key).allowed).toBe(false);

    // Advance time past window
    vi.spyOn(Date, "now").mockReturnValue(now + _config.WINDOW_MS + 1);
    const result = checkRateLimit(key);
    expect(result.allowed).toBe(true);
  });

  it("returns retryAfterMs based on oldest timestamp in window", () => {
    const key = "NAVOX-AAAA-BBBB-CCCC";
    const start = 1700000000000;

    // Fill with timestamps 100ms apart
    for (let i = 0; i < _config.MAX_REQUESTS; i++) {
      vi.spyOn(Date, "now").mockReturnValue(start + i * 100);
      checkRateLimit(key);
    }

    // Try at start + 500ms: oldest is at `start`, window = 60000ms
    const tryTime = start + 500;
    vi.spyOn(Date, "now").mockReturnValue(tryTime);
    const result = checkRateLimit(key);
    expect(result.allowed).toBe(false);
    // retryAfterMs = WINDOW_MS - (tryTime - start) = 60000 - 500 = 59500
    expect(result.retryAfterMs).toBe(_config.WINDOW_MS - 500);
  });
});

describe("resetRateLimit", () => {
  it("clears rate limit for a specific key", () => {
    const key = "NAVOX-AAAA-BBBB-CCCC";
    for (let i = 0; i < _config.MAX_REQUESTS; i++) {
      checkRateLimit(key);
    }
    expect(checkRateLimit(key).allowed).toBe(false);

    resetRateLimit(key);
    expect(checkRateLimit(key).allowed).toBe(true);
  });
});

describe("resetAllRateLimits", () => {
  it("clears all rate limit state", () => {
    const key1 = "NAVOX-AAAA-BBBB-CCCC";
    const key2 = "NAVOX-DDDD-EEEE-FFFF";

    for (let i = 0; i < _config.MAX_REQUESTS; i++) {
      checkRateLimit(key1);
      checkRateLimit(key2);
    }

    resetAllRateLimits();
    expect(checkRateLimit(key1).allowed).toBe(true);
    expect(checkRateLimit(key2).allowed).toBe(true);
  });
});
