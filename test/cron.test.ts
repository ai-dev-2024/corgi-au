import { describe, expect, it, vi } from "vitest";
import { AU_CAPITALS, refreshChargingData } from "../src/cron.js";
import { mockDb, mockPoi } from "./helpers.js";
import type { Env } from "../src/types.js";

describe("refreshChargingData (mocked OCM + D1, no network)", () => {
  it("refreshes every capital and reports updated/cities", async () => {
    const { db, batch } = mockDb();
    const env = { DB: db, OCM_API_KEY: "test-key" } as Env;
    const searchPOI = vi.fn(async () => [mockPoi(1, "Sydney Charger"), mockPoi(2, "Second Charger")]);

    const result = await refreshChargingData(env, {
      createClient: () => ({ searchPOI }) as never,
      now: () => 1_700_000_000_000,
    });

    expect(searchPOI).toHaveBeenCalledTimes(AU_CAPITALS.length);
    expect(searchPOI).toHaveBeenCalledWith(
      expect.objectContaining({ distanceunit: "km", maxresults: 500 }),
    );
    // One batched writeCache call per city, 2 stations each.
    expect(batch).toHaveBeenCalledTimes(AU_CAPITALS.length);
    expect(result).toEqual({ updated: 2 * AU_CAPITALS.length, cities: AU_CAPITALS.length, errors: [] });
  });

  it("continues past a failing city and collects the error", async () => {
    const { db, batch } = mockDb();
    const env = { DB: db, OCM_API_KEY: "test-key" } as Env;
    const failing = AU_CAPITALS[0];
    const searchPOI = vi.fn(async (params: Record<string, unknown>) => {
      if (params["latitude"] === failing.latitude) throw new Error("ocm down");
      return [mockPoi(7, "OK Charger")];
    });

    const result = await refreshChargingData(env, {
      createClient: () => ({ searchPOI }) as never,
      now: () => 1_700_000_000_000,
    });

    expect(searchPOI).toHaveBeenCalledTimes(AU_CAPITALS.length);
    expect(result.cities).toBe(AU_CAPITALS.length - 1);
    expect(result.updated).toBe(AU_CAPITALS.length - 1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain(failing.name);
    expect(batch).toHaveBeenCalledTimes(AU_CAPITALS.length - 1);
  });

  it("short-circuits when OCM_API_KEY is missing", async () => {
    const { db, batch } = mockDb();
    const env = { DB: db, OCM_API_KEY: "" } as Env;
    const createClient = vi.fn();

    const result = await refreshChargingData(env, { createClient: createClient as never });

    expect(createClient).not.toHaveBeenCalled();
    expect(batch).not.toHaveBeenCalled();
    expect(result).toEqual({
      updated: 0,
      cities: 0,
      errors: ["OCM_API_KEY missing, skipping refresh"],
    });
  });
});
