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
    endpoints: ["/decode/:vin", "/charging?lat=&lng=&radius_km=", "/health", "/ui"],
  }),
);

app.get("/health", (c) => c.json({ ok: true }));

app.get("/ui", (c) => c.html(UI_HTML));

app.get("/decode/:vin", (c) => handleDecode(c.req.param("vin"), c.env));

app.get("/charging", (c) => handleCharging(c.req.url, c.env));

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(refreshChargingData(env));
  },
};

export { app };
