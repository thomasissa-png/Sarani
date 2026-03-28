// ─── Simple in-memory rate limiter for LLM generation endpoints ───────────
// Prevents runaway API costs from rapid-fire requests.

const callTimestamps = new Map<string, number[]>();

/**
 * Check if a request is within rate limits.
 * @param key - Unique key for the rate limit bucket (e.g., "llm-generate")
 * @param maxCalls - Maximum number of calls allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns true if within limits, false if rate limited
 */
export function checkRateLimit(
  key: string,
  maxCalls: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const timestamps = callTimestamps.get(key) ?? [];
  const recent = timestamps.filter((t) => now - t < windowMs);
  if (recent.length >= maxCalls) return false;
  recent.push(now);
  callTimestamps.set(key, recent);
  return true;
}

/** UUID v4 format validation */
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
