import { describe, expect, it, vi } from "vitest";
import { handleCharging } from "../src/routes/charging.js";
import { checkRateLimit, rateLimitKey, RATE_LIMIT_MAX } from "../src/lib/ratelimit.js";
import type { Env } from "../src/types.js";

function mockKv() {
  const store = new Map<string, string>();
  return {
    store,
    kv: {
      get: async (k: string) => store.get(k) ?? null,
      put: async (k: string, v: string) => {
        store.set(k, v);
      },
    },
  };
}

function mockDb(results: unknown[] = []) {
  const batch = vi.fn(async () => []);
  const all = vi.fn(async () => ({ results }));
  const bind = vi.fn(() => ({ all }));
  const prepare = vi.fn(() => ({ bind }));
  return { db: { prepare, batch } as unknown as D1Database, batch };
}

const URL = "https://example.com/charging?lat=-33.8688&lng=151.2093&radius_km=10";
const NOW = 1_700_000_000_000;

function livePoi() {
  return {
    ID: 42,
    AddressInfo: { Title: "Live Station", Latitude: -33.87, Longitude: 151.21 },
    Connections: [{ ConnectionType: { Title: "CCS Combo 2" } }],
  };
}

describe("rateLimitKey", () => {
  it("buckets per minute", () => {
    expect(rateLimitKey("1.1.1.1", NOW)).toBe(rateLimitKey("1.1.1.1", NOW + 1000));
    expect(rateLimitKey("1.1.1.1", NOW)).not.toBe(rateLimitKey("1.1.1.1", NOW + 61_000));
    expect(rateLimitKey("1.1.1.1", NOW)).not.toBe(rateLimitKey("2.2.2.2", NOW));
  });
});

describe("checkRateLimit", () => {
  it("allows up to the max, then denies", async () => {
    const { kv } = mockKv();
    for (let i = 1; i <= RATE_LIMIT_MAX; i++) {
      const r = await checkRateLimit(kv, "9.9.9.9", NOW);
      expect(r.allowed).toBe(true);
      expect(r.count).toBe(i);
    }
    const denied = await checkRateLimit(kv, "9.9.9.9", NOW);
    expect(denied.allowed).toBe(false);
  });
});

describe("handleCharging rate limiting", () => {
  it("returns 429 once an IP exceeds the per-minute budget", async () => {
    const { kv } = mockKv();
    const { db } = mockDb([]);
    const env = { DB: db, OCM_API_KEY: "test-key", RATE_LIMIT_KV: kv } as unknown as Env;
    const deps = {
      createClient: () => ({ searchPOI: async () => [livePoi()] }) as never,
      now: () => NOW,
    };

    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      const res = await handleCharging(URL, env, deps, "3.3.3.3");
      expect(res.status).toBe(200);
    }
    const limited = await handleCharging(URL, env, deps, "3.3.3.3");
    expect(limited.status).toBe(429);
    expect(await limited.json()).toMatchObject({ error: expect.any(String) });
  });

  it("does not rate limit cache hits", async () => {
    const { kv } = mockKv();
    const cached = [
      { ocm_id: 1, name: "Sydney Charger", lat: -33.87, lng: 151.21, connector_types: "[]" },
    ];
    const { db } = mockDb(cached);
    const env = { DB: db, OCM_API_KEY: "test-key", RATE_LIMIT_KV: kv } as unknown as Env;
    const createClient = vi.fn();

    for (let i = 0; i < RATE_LIMIT_MAX + 2; i++) {
      const res = await handleCharging(URL, env, { createClient, now: () => NOW }, "4.4.4.4");
      expect(res.status).toBe(200);
    }
    expect(createClient).not.toHaveBeenCalled();
  });
});
