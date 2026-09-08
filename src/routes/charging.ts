import { createOCMClient } from "@cardog/ocm-client";
import type { ChargePoint } from "@cardog/ocm-client";
import { checkRateLimit, type RateLimitKV } from "../lib/ratelimit.js";
import { parseChargingParams } from "../lib/validate.js";
import type { Env } from "../types.js";

export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface Station {
  id: number;
  name: string;
  lat: number;
  lng: number;
  connector_types: string[];
}

type OCMClient = { searchPOI: (params: Record<string, unknown>) => Promise<ChargePoint[]> };

type ChargingDeps = {
  createClient?: (apiKey: string) => OCMClient;
  now?: () => number;
};

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Map a live OCM ChargePoint to our cached Station shape. */
export function mapChargePointToStation(poi: ChargePoint): Station | null {
  const info = poi.AddressInfo;
  if (!info || typeof info.Latitude !== "number" || typeof info.Longitude !== "number") return null;
  // OCM IDs are numbers; fall back to -1 only if missing (filtered later).
  const id = typeof poi.ID === "number" ? poi.ID : -1;
  if (id < 0) return null;
  const connectors = (poi.Connections ?? [])
    .map((c) => c?.ConnectionType?.Title)
    .filter((t): t is string => typeof t === "string" && t.length > 0);
  return {
    id,
    name: info.Title ?? "Unknown station",
    lat: info.Latitude,
    lng: info.Longitude,
    connector_types: [...new Set(connectors)],
  };
}

function boundingBox(lat: number, lng: number, distanceKm: number): [number, number, number, number] {
  const latDelta = distanceKm / 111;
  const cos = Math.cos((lat * Math.PI) / 180);
  const lngDelta = distanceKm / (111 * Math.max(Math.abs(cos), 0.2));
  return [lat - latDelta, lat + latDelta, lng - lngDelta, lng + lngDelta];
}

export async function readCache(
  env: Env,
  lat: number,
  lng: number,
  distanceKm: number,
  now: number,
): Promise<Station[] | null> {
  try {
    const [minLat, maxLat, minLng, maxLng] = boundingBox(lat, lng, distanceKm);
    const freshAfter = now - CACHE_TTL_MS;
    const rows = await env.DB.prepare(
      `SELECT ocm_id, name, lat, lng, connector_types FROM charging_stations
       WHERE lat BETWEEN ?1 AND ?2 AND lng BETWEEN ?3 AND ?4 AND last_updated > ?5
       LIMIT 200`,
    )
      .bind(minLat, maxLat, minLng, maxLng, freshAfter)
      .all<{
        ocm_id: number;
        name: string;
        lat: number;
        lng: number;
        connector_types: string;
      }>();
    if (!rows.results || rows.results.length === 0) return null;
    return rows.results.map((r) => {
      let connectorTypes: string[] = [];
      try {
        const parsed: unknown = JSON.parse(r.connector_types);
        if (Array.isArray(parsed)) connectorTypes = parsed.filter((x): x is string => typeof x === "string");
      } catch {
        connectorTypes = [];
      }
      return { id: r.ocm_id, name: r.name, lat: r.lat, lng: r.lng, connector_types: connectorTypes };
    });
  } catch (err) {
    console.error("charging cache read failed, falling through to live", err);
    return null;
  }
}

export async function writeCache(env: Env, stations: Station[], now: number): Promise<void> {
  if (stations.length === 0) return;
  const statements = stations.map((s) =>
    env.DB.prepare(
      `INSERT INTO charging_stations (ocm_id, name, lat, lng, connector_types, last_updated)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT(ocm_id) DO UPDATE SET
         name = excluded.name, lat = excluded.lat, lng = excluded.lng,
         connector_types = excluded.connector_types, last_updated = excluded.last_updated`,
    ).bind(s.id, s.name, s.lat, s.lng, JSON.stringify(s.connector_types), now),
  );
  await env.DB.batch(statements);
}

/**
 * GET /charging?lat=&lng=&radius_km= — D1 cache first, live OCM fallback.
 * 400 bad params, 404 no stations, 500 missing key / upstream failure.
 */
export async function handleCharging(
  requestUrl: string | URL,
  env: Env,
  deps: ChargingDeps = {},
  clientIp?: string,
): Promise<Response> {
  const url = typeof requestUrl === "string" ? new URL(requestUrl) : requestUrl;
  const parsed = parseChargingParams(url.searchParams);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const { latitude, longitude, distance } = parsed.params;

  const now = deps.now?.() ?? Date.now();

  const cached = await readCache(env, latitude, longitude, distance, now);
  if (cached && cached.length > 0) {
    return json({ source: "cache", stations: cached }, 200);
  }

  if (!env.OCM_API_KEY) {
    return json({ error: "Server misconfigured: OCM_API_KEY missing" }, 500);
  }

  // Throttle live OCM calls per IP (cached hits above already returned).
  // Fail-open when KV is unbound (tests, local dev) or the IP is unknown.
  if (env.RATE_LIMIT_KV && clientIp) {
    const rl = await checkRateLimit(env.RATE_LIMIT_KV as unknown as RateLimitKV, clientIp, now);
    if (!rl.allowed) {
      return json({ error: "Rate limit exceeded, try again shortly" }, 429);
    }
  }

  try {
    const createClient =
      deps.createClient ?? ((apiKey: string) => createOCMClient({ apiKey }) as unknown as OCMClient);
    const client = createClient(env.OCM_API_KEY);
    const pois = await client.searchPOI({
      latitude,
      longitude,
      distance,
      distanceunit: "km",
      maxresults: 100,
    });
    const stations = (pois ?? [])
      .map(mapChargePointToStation)
      .filter((s): s is Station => s !== null);

    if (stations.length === 0) {
      return json({ error: "No charging stations found near this location" }, 404);
    }

    try {
      await writeCache(env, stations, now);
    } catch (err) {
      console.error("charging cache write failed (returning live data anyway)", err);
    }

    return json({ source: "live", stations }, 200);
  } catch (err) {
    console.error("charging upstream failure", err);
    return json({ error: "Upstream charging data failure" }, 500);
  }
}
