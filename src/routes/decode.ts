import { createDecoder, initD1Adapter } from "@cardog/corgi";
import { isValidVin } from "../lib/validate.js";
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
};

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * GET /decode/:vin — decode a VIN via @cardog/corgi (D1-backed).
 * 400 invalid VIN, 404 no data, 500 upstream failure.
 */
export async function handleDecode(rawVin: string, env: Env, deps: DecoderDeps = {}): Promise<Response> {
  const checked = isValidVin(rawVin);
  if (!checked.ok || !checked.vin) {
    return json({ error: checked.error ?? "Invalid VIN" }, 400);
  }
  const vin = checked.vin;

  const initD1 = deps.initD1 ?? (initD1Adapter as (db: unknown) => void);
  const makeDecoder =
    deps.createDecoder ??
    (createDecoder as unknown as NonNullable<DecoderDeps["createDecoder"]>);

  try {
    initD1(env.DB);
    const decoder = await makeDecoder({ databasePath: "D1", runtime: "cloudflare" });
    const result = await decoder.decode(vin);

    if (!result.valid || !result.components || !("vehicle" in result.components) || !result.components.vehicle) {
      return json({ error: "No data found for VIN", vin, details: result.errors ?? [] }, 404);
    }

    const c = result.components as {
      vehicle?: Record<string, unknown>;
      wmi?: unknown;
      plant?: unknown;
      engine?: unknown;
      modelYear?: unknown;
      checkDigit?: unknown;
    };

    return json(
      {
        vin: result.vin,
        valid: true,
        vehicle: c.vehicle,
        wmi: c.wmi ?? null,
        plant: c.plant ?? null,
        engine: c.engine ?? null,
        modelYear: c.modelYear ?? null,
        checkDigit: c.checkDigit ?? null,
      },
      200,
    );
  } catch (err) {
    console.error("decode upstream failure", err);
    return json({ error: "Upstream VIN database failure" }, 500);
  }
}
