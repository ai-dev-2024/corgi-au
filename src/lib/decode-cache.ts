/**
 * Read-through KV cache for /decode/:vin.
 *
 * Why: every uncached decode scans the 1.07M-row VPIC database in D1, and on
 * the free tier a burst of lookups can exhaust the daily row-read quota —
 * after which every VIN fails until midnight UTC. Decodes are deterministic
 * per VIN and the underlying data changes at most monthly, so results cache
 * safely: repeat traffic becomes KV reads (which don't count against D1
 * quota) and the database only sees each VIN once per TTL window.
 *
 * Shares the RATE_LIMIT_KV namespace by design: keys are prefixed (`dec:` vs
 * `rl:`) so they cannot collide, and one namespace keeps free-tier usage
 * simple. Optional in Env, so unit tests and local dev without KV fail open.
 */

/** How long a successful decode is cached. */
export const DECODE_CACHE_TTL_S = 60 * 60 * 24 * 7; // 7 days
/** How long a clean "no data for this VIN" miss is cached. Shorter than a
 * hit: a VIN missing today may decode after a library/data refresh, and a
 * daily TTL bounds any staleness from library upgrades. */
export const DECODE_CACHE_MISS_TTL_S = 60 * 60 * 24; // 24h

const KEY_PREFIX = "dec:v1:";
const MAX_KEY_LEN = 512;

/** Minimal KV surface this module needs (structurally matches KVNamespace). */
export interface DecodeCacheKV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export function decodeCacheKey(vin: string): string {
  // VINs are validated upstream (17 chars, A-Z0-9 minus I/O/Q), so the key
  // is short and safe; the cap is belt-and-braces for the KV key limit.
  return KEY_PREFIX.slice(0, MAX_KEY_LEN - vin.length) + vin;
}

export interface CachedResponse {
  status: number;
  body: unknown;
}

/** Returns the cached response for a VIN, or null on miss/corruption. */
export async function getDecodeCache(kv: DecodeCacheKV | undefined, vin: string): Promise<CachedResponse | null> {
  if (!kv) return null;
  try {
    const raw = await kv.get(decodeCacheKey(vin));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { status?: unknown; body?: unknown };
    if (typeof parsed.status !== "number" || parsed.body === undefined || parsed.body === null) return null;
    return { status: parsed.status, body: parsed.body };
  } catch {
    return null; // corrupt or unreadable entry == miss; never fail a request here
  }
}

/**
 * Caches a decode result. Status 200 uses the full TTL; 404 (clean miss)
 * uses the shorter miss TTL. Any other status (4xx input errors, 5xx
 * infrastructure failures) is never cached.
 */
export async function putDecodeCache(
  kv: DecodeCacheKV | undefined,
  vin: string,
  status: number,
  body: unknown,
): Promise<void> {
  if (!kv) return;
  if (status !== 200 && status !== 404) return;
  try {
    await kv.put(decodeCacheKey(vin), JSON.stringify({ status, body }), {
      expirationTtl: status === 200 ? DECODE_CACHE_TTL_S : DECODE_CACHE_MISS_TTL_S,
    });
  } catch {
    // a failed cache write must never fail the request itself
  }
}

/**
 * Matches D1-level infrastructure failures surfaced in decoder errors
 * (quota exhaustion, missing tables, connection errors). These must not be
 * reported as "no data" 404s — they mean the database is unreachable, not
 * that the VIN is unknown.
 */
const INFRA_ERROR_RE = /D1_ERROR|row read limit/i;

export function hasInfraError(errors: unknown): boolean {
  try {
    return INFRA_ERROR_RE.test(JSON.stringify(errors ?? []));
  } catch {
    return false;
  }
}
