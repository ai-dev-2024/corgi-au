import { createDecoder, initD1Adapter } from "@cardog/corgi";
import { isValidVin } from "../lib/validate.js";
import {
  getDecodeCache,
  putDecodeCache,
  hasInfraError,
  type DecodeCacheKV,
} from "../lib/decode-cache.js";
import type { Env } from "../types.js";

type DecoderDeps = {
  initD1?: (db: unknown) => void;
  createDecoder?: (config?: Record<string, unknown>) => Promise<{
    decode: (vin: string) => Promise<{
      valid: boolean;
      vin: string;
      components: Record<string, unknown>;
      errors: unknown[];
    }>;
  }>;
  /** Overrides the KV namespace used for the decode cache (tests). */
  kv?: DecodeCacheKV;
};

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * GET /decode/:vin — decode a VIN via @cardog/corgi (D1-backed).
 * 200 decoded, 400 invalid VIN, 404 known-good VIN with no data,
 * 503 VIN database temporarily unavailable (quota/infrastructure),
 * 500 upstream failure.
 *
 * Results are cached in KV per VIN: a D1 decode scans over a million rows,
 * so repeat traffic is served from cache to stay inside D1 quota.
 */
export async function handleDecode(rawVin: string, env: Env, deps: DecoderDeps = {}): Promise<Response> {
  const checked = isValidVin(rawVin);
  if (!checked.ok || !checked.vin) {
    return json({ error: checked.error ?? "Invalid VIN" }, 400);
  }
  const vin = checked.vin;

  const kv = deps.kv ?? (env.RATE_LIMIT_KV as unknown as DecodeCacheKV | undefined);

  const cached = await getDecodeCache(kv, vin);
  if (cached) {
    return json(cached.body, cached.status);
  }

  const initD1 = deps.initD1 ?? (initD1Adapter as (db: unknown) => void);
  const makeDecoder =
    deps.createDecoder ??
    (createDecoder as unknown as NonNullable<DecoderDeps["createDecoder"]>);

  try {
    initD1(env.DB);
    const decoder = await makeDecoder({ databasePath: "D1", runtime: "cloudflare" });
    const result = await decoder.decode(vin);

    if (!result.valid || !result.components || !("vehicle" in result.components) || !result.components.vehicle) {
      if (hasInfraError(result.errors)) {
        // Database-level failure (e.g. D1 quota exhausted): the VIN is not
        // "unknown" — the database is unreachable. Never report this as 404,
        // and never cache it.
        return json(
          {
            error: "VIN database temporarily unavailable, try again shortly",
            code: "DATABASE_UNAVAILABLE",
            vin,
            details: result.errors ?? [],
          },
          503,
        );
      }
      const body = { error: "No data found for VIN", vin, details: result.errors ?? [] };
      await putDecodeCache(kv, vin, 404, body);
      return json(body, 404);
    }

    const c = result.components as {
      vehicle?: Record<string, unknown>;
      wmi?: unknown;
      plant?: unknown;
      engine?: unknown;
      modelYear?: unknown;
      checkDigit?: unknown;
    };

    const body = {
      vin: result.vin,
      valid: true,
      vehicle: c.vehicle,
      wmi: c.wmi ?? null,
      plant: c.plant ?? null,
      engine: c.engine ?? null,
      modelYear: c.modelYear ?? null,
      checkDigit: c.checkDigit ?? null,
    };
    await putDecodeCache(kv, vin, 200, body);
    return json(body, 200);
  } catch (err) {
    console.error("decode upstream failure", err);
    return json({ error: "Upstream VIN database failure" }, 500);
  }
}
