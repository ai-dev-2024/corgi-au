import { Hono } from "hono";
import { handleDecode } from "./routes/decode.js";
import { handleCharging } from "./routes/charging.js";
import { refreshChargingData } from "./cron.js";
import { UI_HTML } from "./ui/page.js";
import type { Env } from "./types.js";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) =>
  c.json({
    name: "corgi-au",
    description: "AU + global VIN decoding and EV charging lookup, built on @cardog/corgi and @cardog/ocm-client.",
    endpoints: ["/decode/:vin", "/charging?lat=&lng=&radius_km=", "/health", "/stats", "/ui"],
  }),
);

app.get("/health", (c) => c.json({ ok: true }));

app.get("/stats", async (c) => {
  try {
    const row = await c.env.DB.prepare(
      "SELECT COUNT(*) AS stations, MAX(last_updated) AS last_refresh FROM charging_stations",
    ).first<{ stations: number; last_refresh: number | null }>();
    return c.json({
      stations: row?.stations ?? 0,
      last_refresh: row?.last_refresh ?? null,
      capitals: 8,
      ttl_hours: 24,
    });
  } catch (err) {
    console.error("stats query failed", err);
    return c.json({ stations: 0, last_refresh: null, capitals: 8, ttl_hours: 24 });
  }
});

app.get("/ui", (c) => c.html(UI_HTML));

app.get("/decode/:vin", (c) => handleDecode(c.req.param("vin"), c.env));

app.get("/charging", (c) =>
  handleCharging(c.req.url, c.env, {}, c.req.header("CF-Connecting-IP") ?? undefined),
);

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(refreshChargingData(env));
  },
};

export { app };
