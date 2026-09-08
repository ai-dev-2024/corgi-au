# corgi-au

Australia + global VIN decoding and EV charging station lookup on Cloudflare Workers.

This project extends Cardog's open-source stack into an Australia-facing API. It is a genuine
open-source contribution to their ecosystem, not a competing product: every VIN decode goes
through [`@cardog/corgi`](https://www.npmjs.com/package/@cardog/corgi) and every charging
lookup goes through [`@cardog/ocm-client`](https://www.npmjs.com/package/@cardog/ocm-client).
Mocks exist in tests only — the deployed app always hits the real libraries.

## What it does

- `GET /decode/:vin` — decode a 17-character VIN via `@cardog/corgi` (D1-backed) → make/model/year etc.
- `GET /charging?lat=&lng=&radius_km=` — EV charging stations near a point via `@cardog/ocm-client`,
  with D1 cache first and live OCM fallback.
- Daily cron refresh of AU capital charging data into D1.

## Why it exists

Cardog ([github.com/cardog-ai](https://github.com/cardog-ai)) is a Canada-focused automotive data
platform whose docs and examples are US/Canada-centric. `corgi-au` shows the same packages serving
the Australian and global market: NHTSA VPIC decoding works for AU-market VINs, and Open Charge Map
has worldwide coverage. Small, correct demo — strictly VIN decode + EV charging, no AI research,
market analysis, or garage features.

## Local dev

```sh
npm install
wrangler d1 create corgi-au   # paste database_id into wrangler.toml
wrangler d1 execute corgi-au --file=src/db/schema.sql
echo "OCM_API_KEY=..." > .dev.vars   # free key at https://openchargemap.org/site/profile
npm test
npm run typecheck
npm run dev
```

## Deploy

```sh
wrangler secret put OCM_API_KEY
wrangler deploy
```

CI (`.github/workflows/ci.yml`) runs lint + typecheck + tests on every push and deploys on `main`
using `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` repo secrets. No keys are ever committed —
see `.env.example`.

## API docs

### `GET /decode/:vin`

| Status | Meaning |
| ------ | ------- |
| 200 | Decoded vehicle JSON |
| 400 | VIN is not 17 valid characters |
| 404 | No data found for this VIN |
| 500 | Upstream VIN database failure |

```sh
curl https://corgi-au.<you>.workers.dev/decode/1HGCM82633A123456
# {"vin":"1HGCM82633A123456","valid":true,"vehicle":{"make":"Honda","model":"Accord","year":2003,...}}
```

### `GET /charging?lat=&lng=&radius_km=`

| Param | Required | Rules |
| ----- | -------- | ----- |
| `lat` | yes | -90..90 |
| `lng` | yes | -180..180 |
| `radius_km` | no | 1..100, default 10 |

| Status | Meaning |
| ------ | ------- |
| 200 | `{ source: "cache" \| "live", stations: [...] }` |
| 400 | Invalid/missing params |
| 404 | No stations near this location |
| 500 | Missing `OCM_API_KEY` or upstream OCM failure |

```sh
curl "https://corgi-au.<you>.workers.dev/charging?lat=-33.8688&lng=151.2093&radius_km=10"
# {"source":"live","stations":[{"id":42,"name":"...","lat":-33.87,"lng":151.21,"connector_types":["CCS Combo 2"]}]}
```

## Credits

- VIN decoding: [`@cardog/corgi`](https://github.com/cardog-ai/corgi) (ISC) — NHTSA VPIC data.
- Charging client: [`@cardog/ocm-client`](https://github.com/cardog-ai/ocm-client) (MIT).
- Charging data: [Open Charge Map](https://openchargemap.org) (ODbL, community-run since 2011). Please
  [support OCM](https://opencollective.com/openchargemap) if you use this heavily.
- Platform: Cloudflare Workers + D1 + Cron Triggers, routing via Hono.

## License

MIT — see `LICENSE`.
