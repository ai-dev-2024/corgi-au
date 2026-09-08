/**
 * Pure input validation helpers.
 * Kept free of Workers/CF imports so unit tests run on plain vitest.
 */

/** VINs are 17 chars, A-Z0-9 minus I, O, Q (ISO 3779). */
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

export function isValidVin(vin: unknown): { ok: boolean; vin?: string; error?: string } {
  if (typeof vin !== "string") return { ok: false, error: "VIN must be a string" };
  const v = vin.trim().toUpperCase();
  if (v.length !== 17) return { ok: false, error: "VIN must be exactly 17 characters" };
  if (!VIN_RE.test(v)) {
    return { ok: false, error: "VIN contains invalid characters (allowed: A-Z, 0-9 excluding I, O, Q)" };
  }
  return { ok: true, vin: v };
}

export interface ChargingParams {
  latitude: number;
  longitude: number;
  distance: number;
}

export function parseChargingParams(
  searchParams: URLSearchParams,
): { ok: true; params: ChargingParams } | { ok: false; error: string } {
  const latRaw = searchParams.get("lat");
  const lngRaw = searchParams.get("lng");
  const radiusRaw = searchParams.get("radius_km");

  if (latRaw === null || latRaw === "") return { ok: false, error: "Missing required query param: lat" };
  if (lngRaw === null || lngRaw === "") return { ok: false, error: "Missing required query param: lng" };

  const latitude = Number(latRaw);
  const longitude = Number(lngRaw);
  const distance = radiusRaw === null || radiusRaw === "" ? 10 : Number(radiusRaw);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(distance)) {
    return { ok: false, error: "lat, lng and radius_km must be valid numbers" };
  }
  if (latitude < -90 || latitude > 90) return { ok: false, error: "lat must be between -90 and 90" };
  if (longitude < -180 || longitude > 180) return { ok: false, error: "lng must be between -180 and 180" };
  if (distance < 1 || distance > 100) return { ok: false, error: "radius_km must be between 1 and 100" };

  return { ok: true, params: { latitude, longitude, distance } };
}
