import { describe, expect, it, vi } from "vitest";
import { handleDecode } from "../src/routes/decode.js";
import { handleCharging } from "../src/routes/charging.js";
import { mockDb } from "./helpers.js";
import type { Env } from "../src/types.js";

function kvMock() {
  const store = new Map<string, string>();
  return {
    store,
    kv: {
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      put: vi.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
    },
  };
}

function envWith(overrides: Partial<Env> = {}, results: unknown[] = []): { env: Env; mocks: ReturnType<typeof mockDb> } {
  const mocks = mockDb(results);
  return {
    env: { DB: mocks.db, OCM_API_KEY: "test-key", ...overrides } as Env,
    mocks,
  };
}

describe("handleDecode (mocked decoder, no network)", () => {
  const VIN = "1HGCM82633A123456";

  it("400 on invalid VIN without touching the decoder", async () => {
    const { env } = envWith();
    const createDecoder = vi.fn();
    const res = await handleDecode("SHORT", env, { createDecoder });
    expect(res.status).toBe(400);
    expect(createDecoder).not.toHaveBeenCalled();
    expect(await res.json()).toMatchObject({ error: expect.any(String) });
  });

  it("200 with vehicle data on valid decode", async () => {
    const { env } = envWith();
    const decode = vi.fn(async () => ({
      valid: true,
      vin: VIN,
      components: { vehicle: { make: "Honda", model: "Accord", year: 2003 } },
      errors: [],
    }));
    const res = await handleDecode(VIN, env, { initD1: vi.fn(), createDecoder: vi.fn(async () => ({ decode })) });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ vin: VIN, vehicle: { make: "Honda" } });
  });

  it("404 when decoder finds no vehicle", async () => {
    const { env } = envWith();
    const decode = vi.fn(async () => ({ valid: false, vin: VIN, components: {}, errors: [{ code: "300" }] }));
    const res = await handleDecode(VIN, env, { initD1: vi.fn(), createDecoder: vi.fn(async () => ({ decode })) });
    expect(res.status).toBe(404);
  });

  it("500 when the decoder throws", async () => {
    const { env } = envWith();
    const createDecoder = vi.fn(async () => {
      throw new Error("db down");
    });
    const res = await handleDecode(VIN, env, { initD1: vi.fn(), createDecoder });
    expect(res.status).toBe(500);
  });
});

describe("handleDecode caching and infrastructure errors", () => {
  const VIN = "1HGCM82633A123456";

  function decodeOk(vin: string) {
    return {
      valid: true,
      vin,
      components: { vehicle: { make: "Honda", model: "Accord", year: 2003 } },
      errors: [],
    };
  }

  it("serves a repeat VIN from cache without calling the decoder again", async () => {
    const { env } = envWith();
    const { kv, store } = kvMock();
    const decode = vi.fn(async () => decodeOk(VIN));
    const deps = { initD1: vi.fn(), createDecoder: vi.fn(async () => ({ decode })), kv };

    const first = await handleDecode(VIN, env, deps);
    expect(first.status).toBe(200);
    expect(store.size).toBe(1);

    const second = await handleDecode(VIN, env, deps);
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({ vin: VIN, vehicle: { make: "Honda" } });
    expect(decode).toHaveBeenCalledTimes(1); // second call came from KV
  });

  it("503 DATABASE_UNAVAILABLE on D1 quota errors, without caching the failure", async () => {
    const { env } = envWith();
    const { kv, store } = kvMock();
    const decode = vi.fn(async () => ({
      valid: false,
      vin: VIN,
      components: {},
      errors: [{ code: "501", details: "D1_ERROR: row read limit exceeded" }],
    }));
    const res = await handleDecode(VIN, env, {
      initD1: vi.fn(),
      createDecoder: vi.fn(async () => ({ decode })),
      kv,
    });

    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ code: "DATABASE_UNAVAILABLE" });
    expect(store.size).toBe(0); // never cached: VIN is not "unknown"
  });

  it("does not touch the cache for invalid VINs", async () => {
    const { env } = envWith();
    const { kv } = kvMock();
    const res = await handleDecode("SHORT", env, { kv });
    expect(res.status).toBe(400);
    expect(kv.get).not.toHaveBeenCalled();
  });
});

describe("handleCharging (mocked OCM + D1, no network)", () => {
  const url = "https://example.com/charging?lat=-33.8688&lng=151.2093&radius_km=10";

  it("400 on bad params without touching OCM", async () => {
    const { env } = envWith();
    const createClient = vi.fn();
    const res = await handleCharging("https://example.com/charging?lat=abc&lng=151.2", env, { createClient });
    expect(res.status).toBe(400);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns cache and skips OCM on fresh cache hit", async () => {
    const cached = [
      { ocm_id: 1, name: "Sydney Charger", lat: -33.87, lng: 151.21, connector_types: '["CCS Combo 2"]' },
    ];
    const { env } = envWith({}, cached);
    const createClient = vi.fn();
    const res = await handleCharging(url, env, { createClient, now: () => 1_700_000_000_000 });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { source: string; stations: Array<Record<string, unknown>> };
    expect(body.source).toBe("cache");
    expect(body.stations[0]).toMatchObject({ id: 1, name: "Sydney Charger" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("falls back to live OCM on cache miss and caches the result", async () => {
    const { env, mocks } = envWith({}, []);
    const poi = {
      ID: 42,
      AddressInfo: { Title: "Live Station", Latitude: -33.87, Longitude: 151.21 },
      Connections: [{ ConnectionType: { Title: "CCS Combo 2" } }],
    };
    const searchPOI = vi.fn(async () => [poi]);
    const res = await handleCharging(url, env, {
      createClient: () => ({ searchPOI }) as never,
      now: () => 1_700_000_000_000,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { source: string; stations: Array<Record<string, unknown>> };
    expect(body.source).toBe("live");
    expect(body.stations[0]).toMatchObject({ id: 42, name: "Live Station" });
    expect(searchPOI).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: -33.8688, longitude: 151.2093, distanceunit: "km" }),
    );
    expect(mocks.batch).toHaveBeenCalledTimes(1);
    expect(mocks.batch.mock.calls[0]?.[0]).toHaveLength(1);
  });

  it("404 when OCM returns nothing", async () => {
    const { env } = envWith({}, []);
    const res = await handleCharging(url, env, {
      createClient: () => ({ searchPOI: async () => [] }) as never,
      now: () => 1_700_000_000_000,
    });
    expect(res.status).toBe(404);
  });

  it("500 when OCM_API_KEY is missing", async () => {
    const { env } = envWith({ OCM_API_KEY: "" }, []);
    const res = await handleCharging(url, env, { now: () => 1_700_000_000_000 });
    expect(res.status).toBe(500);
  });

  it("500 when OCM throws", async () => {
    const { env } = envWith({}, []);
    const res = await handleCharging(url, env, {
      createClient: () => ({
        searchPOI: async () => {
          throw new Error("ocm down");
        },
      }) as never,
      now: () => 1_700_000_000_000,
    });
    expect(res.status).toBe(500);
  });
});
