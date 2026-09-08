/**
 * Simple IP-based rate limiting for live OCM calls, backed by Workers KV.
 *
 * Keyed by client IP + per-minute bucket. Cached /charging hits never reach
 * this check — only cache misses (live OCM calls) are counted, so the quota
 * guard costs nothing on the hot path.
 */

/** Max live OCM calls per IP per minute. */
export const RATE_LIMIT_MAX = 20;
/** Rate limit window in seconds. */
export const RATE_LIMIT_WINDOW_S = 60;

/** Minimal KV surface this module needs (structurally matches KVNamespace). */
export interface RateLimitKV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export function rateLimitKey(ip: string, nowMs: number): string {
  const bucket = Math.floor(nowMs / (RATE_LIMIT_WINDOW_S * 1000));
  return `rl:${ip}:${bucket}`;
}

export async function checkRateLimit(
  kv: RateLimitKV,
  ip: string,
  nowMs: number,
  max: number = RATE_LIMIT_MAX,
): Promise<{ allowed: boolean; count: number }> {
  const key = rateLimitKey(ip, nowMs);
  const raw = await kv.get(key);
  const count = raw ? Number.parseInt(raw, 10) || 0 : 0;
  if (count >= max) return { allowed: false, count };
  const next = count + 1;
  await kv.put(key, String(next), { expirationTtl: RATE_LIMIT_WINDOW_S });
  return { allowed: true, count: next };
}
