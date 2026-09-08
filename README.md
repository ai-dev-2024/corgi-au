# corgi-au

Australia + global VIN decoding and EV charging lookup on Cloudflare Workers.

Live demo: `https://corgi-au.ai-dev-2024.workers.dev/ui`

Built on Cardog's open-source stack — every VIN decode goes through [`@cardog/corgi`](https://www.npmjs.com/package/@cardog/corgi) and every charging lookup goes through [`@cardog/ocm-client`](https://www.npmjs.com/package/@cardog/ocm-client). Mocks exist in tests only.

## Endpoints

- `GET /ui` — polished demo page (VIN form + charging search)
- `GET /decode/:vin` — decode a 17-char VIN → make / model / year
- `GET /charging?lat=&lng=&radius_km=` — stations near a point, D1 cache first, live OCM fallback
- `GET /health` — `{ ok: true }`
- `GET /stats` — cached station count + last refresh (powers the live counter on `/ui`)

```sh
curl https://corgi-au.ai-dev-2024.workers.dev/decode/1HGCM82633A123456
curl "https://corgi-au.ai-dev-2024.workers.dev/charging?lat=-33.8688&lng=151.2093&radius_km=10"
```

`GET /charging` params: `lat` -90..90, `lng` -180..180, `radius_km` 1..100 (default 10). Statuses: 200 ok, 400 bad params, 404 no stations / no VIN data, 429 rate limited (20 live lookups/min/IP), 500 missing key or upstream failure. Cache hits never count toward the limit.

Daily cron refreshes AU capital charging data into D1.

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
| Tests | Vitest, mocked decoder/OCM/D1/KV | No live network in tests (29 tests) |
| CI/CD | GitHub Actions → `wrangler deploy` | Typecheck + tests on push, deploy on `main` |
| Secrets | `.dev.vars` locally, Wrangler secrets live | Never committed (see `.env.example`) |

## Local dev

```sh
npm install
npm test
npm run typecheck
echo "OCM_API_KEY=..." > .dev.vars  # free key at https://openchargemap.org/site/profile
npm run dev
```

Deploy: `wrangler secret put OCM_API_KEY && wrangler deploy`. CI runs typecheck + tests, deploys on `main`. Keys are never committed — see `.env.example`.

## Credits

- VIN: `@cardog/corgi` (NHTSA VPIC) · Charging client: `@cardog/ocm-client`
- Data: [Open Charge Map](https://openchargemap.org) · Platform: Workers + D1 + Hono

MIT — see `LICENSE`.
