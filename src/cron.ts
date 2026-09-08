import { createOCMClient } from "@cardog/ocm-client";
import { mapChargePointToStation, writeCache } from "./routes/charging.js";
import type { Env } from "./types.js";

/** Fixed AU seed points refreshed daily — cron has no request params. */
export const AU_CAPITALS = [
  { name: "Sydney", latitude: -33.8688, longitude: 151.2093 },
  { name: "Melbourne", latitude: -37.8136, longitude: 144.9631 },
  { name: "Brisbane", latitude: -27.4698, longitude: 153.0251 },
  { name: "Perth", latitude: -31.9505, longitude: 115.8605 },
  { name: "Adelaide", latitude: -34.9285, longitude: 138.6007 },
  { name: "Canberra", latitude: -35.2809, longitude: 149.13 },
  { name: "Darwin", latitude: -12.4634, longitude: 130.8456 },
  { name: "Hobart", latitude: -42.8821, longitude: 147.3272 },
] as const;

export const CRON_RADIUS_KM = 50;
export const CRON_MAX_RESULTS = 500;

type CronDeps = {
  createClient?: (apiKey: string) => {
    searchPOI: (params: Record<string, unknown>) => Promise<Parameters<typeof mapChargePointToStation>[0][]>;
  };
  now?: () => number;
};

/**
 * Daily refresh: re-query OCM around each capital and upsert into D1.
 * Never throws — cron should log per-city errors and continue.
 */
export async function refreshChargingData(
  env: Env,
  deps: CronDeps = {},
): Promise<{ updated: number; cities: number; errors: string[] }> {
  const errors: string[] = [];
  let updated = 0;
  const now = deps.now?.() ?? Date.now();

  if (!env.OCM_API_KEY) {
    return { updated: 0, cities: 0, errors: ["OCM_API_KEY missing, skipping refresh"] };
  }

  const createClient =
    deps.createClient ?? ((apiKey: string) => createOCMClient({ apiKey }) as never);
  const client = createClient(env.OCM_API_KEY);

  let cities = 0;
  for (const city of AU_CAPITALS) {
    try {
      const pois = await client.searchPOI({
        latitude: city.latitude,
        longitude: city.longitude,
        distance: CRON_RADIUS_KM,
        distanceunit: "km",
        maxresults: CRON_MAX_RESULTS,
      });
      const stations = (pois ?? [])
        .map((p) => mapChargePointToStation(p))
        .filter((s): s is NonNullable<typeof s> => s !== null);
      await writeCache(env, stations, now);
      updated += stations.length;
      cities += 1;
    } catch (err) {
      const msg = `${city.name}: ${err instanceof Error ? err.message : String(err)}`;
      console.error("cron refresh failed for", msg);
      errors.push(msg);
    }
  }

  return { updated, cities, errors };
}
