# corgi-au

[![CI](https://github.com/ai-dev-2024/corgi-au/actions/workflows/ci.yml/badge.svg)](https://github.com/ai-dev-2024/corgi-au/actions)

Australia + global VIN decoding and EV charging lookup on Cloudflare Workers.

Live demo: `https://corgi-au.ai-dev-2024.workers.dev/ui`

Built on Cardog's open-source stack — every VIN decode goes through [`@cardog/corgi`](https://www.npmjs.com/package/@cardog/corgi) and every charging lookup goes through [`@cardog/ocm-client`](https://www.npmjs.com/package/@cardog/ocm-client). Mocks exist in tests only; production always hits the real libraries.

## Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/ui` | Polished demo page (VIN form + charging search) |
| `GET` | `/decode/:vin` | Decode a 17-char VIN → make / model / year (KV-cached per VIN) |
| `GET` | `/charging?lat=&lng=&radius_km=` | Stations near a point, D1 cache first, live OCM fallback |
| `GET` | `/stats` | Cached station count + last refresh (powers the live counter on `/ui`) |
| `GET` | `/health` | `{ ok: true }` |

```sh
curl https://corgi-au.ai-dev-2024.workers.dev/decode/1HGCM82633A123456
curl "https://corgi-au.ai-dev-2024.workers.dev/charging?lat=-33.8688&lng=151.2093&radius_km=10"
```

`GET /charging` params: `lat` -90..90, `lng` -180..180, `radius_km` 1..100 (default 10). Statuses: 200 ok (`source: "cache" | "live"`), 400 bad params, 404 no stations / no VIN data, 429 rate limited (20 live lookups/min/IP, cache hits exempt), 503 VIN database temporarily unavailable (e.g. D1 quota), 500 missing key or upstream failure. Decodes are cached in KV per VIN for 7 days (clean misses 24h), so repeat lookups never re-scan the 1M-row VPIC database and stay inside D1's free-tier row-read quota.

## Architecture

**Reads** (`GET /charging`): edge Worker → validate params → D1 cache lookup (24h TTL, lat/lng bounding box) → on miss, KV rate-limit check → live OCM query → single batched D1 upsert → JSON. A cache-read failure falls through to live; a cache-write failure still returns live data.

**Writes** (cron `0 2 * * *`): re-queries Open Charge Map around 8 AU capitals (50 km radius, up to 500 results each) and upserts into D1 with one `batch()` call per city instead of thousands of round trips. Per-city errors are logged and collected without aborting the run.

## Stack

| Layer | Choice | Why |
| ----- | ------ | --- |
| Runtime | Cloudflare Workers | Edge compute, zero servers, cron triggers built in |
| Framework | Hono + `secureHeaders()` | Tiny router, sane security defaults |
| VIN data | `@cardog/corgi` + D1 adapter | NHTSA VPIC decode, no API calls |
| Charging data | `@cardog/ocm-client` | Typed client for Open Charge Map |
| Cache | D1 `charging_stations` table, 24h TTL | Cache-first reads, batched upserts |
| Rate limiting | Workers KV, 20 live lookups/min/IP | Protects the OCM quota; cache hits exempt |
| Cron | `0 2 * * *` over 8 AU capitals | Pre-warms the cache nightly |
| Observability | Workers observability + `wrangler tail` | Logs and traces in the dashboard |
| Tests | Vitest, mocked decoder/OCM/D1/KV | No live network in tests (35 tests) |
| CI/CD | GitHub Actions → `wrangler deploy` | Typecheck + tests on push, deploy on `main` |
| Secrets | `.dev.vars` locally, Wrangler secrets live | Never committed (see `.env.example`) |

## Project structure

```
src/index.ts          # routes, middleware, scheduled cron entry
src/routes/decode.ts  # GET /decode/:vin
src/routes/charging.ts# GET /charging (cache → limit → live)
src/lib/validate.ts   # pure input validation (no Worker imports)
src/lib/ratelimit.ts  # KV-backed per-IP rate limiter
src/db/schema.sql     # charging_stations table + indexes
src/cron.ts           # nightly AU capitals refresh
src/ui/page.ts        # self-contained demo page (no build step)
test/                 # routes, cron, ratelimit, validate, ui
```

## Local dev

```sh
npm install
npm test
npm run typecheck
echo "OCM_API_KEY=..." > .dev.vars  # free key at https://openchargemap.org/site/profile
npm run dev
```

Deploy: `wrangler secret put OCM_API_KEY && wrangler deploy`. CI deploys on `main` using `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` repo secrets.

## Credits

- VIN: `@cardog/corgi` (NHTSA VPIC) · Charging client: `@cardog/ocm-client`
- Data: [Open Charge Map](https://openchargemap.org) · Platform: Workers + D1 + Hono

MIT — see `LICENSE`.
