import { vi } from "vitest";

/** Full-surface D1 stub: prepare().bind().all()/run(), prepare().first(), batch([...]). */
export function mockDb(results: unknown[] = []) {
  const run = vi.fn(async () => ({}));
  const all = vi.fn(async () => ({ results }));
  const first = vi.fn(async () => null);
  const batch = vi.fn(async (_statements: unknown[]) => []);
  const bind = vi.fn(() => ({ all, run, first }));
  const prepare = vi.fn(() => ({ bind, first }));
  const db = { prepare, batch } as unknown as D1Database;
  return { db, prepare, bind, all, run, batch, first };
}

/** In-memory KV stub for the rate limiter. */
export function mockKv() {
  const store = new Map<string, string>();
  const kv = {
    get: async (k: string) => store.get(k) ?? null,
    put: async (k: string, v: string) => {
      store.set(k, v);
    },
  };
  return { store, kv };
}

/** Minimal OCM ChargePoint that maps to a station. */
export function mockPoi(id: number, title: string) {
  return {
    ID: id,
    AddressInfo: { Title: title, Latitude: -33.87, Longitude: 151.21 },
    Connections: [{ ConnectionType: { Title: "CCS Combo 2" } }],
  };
}
