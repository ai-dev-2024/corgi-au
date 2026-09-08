# corgi-au

Australia + global VIN decoding and EV charging lookup on Cloudflare Workers.

Live demo: `https://corgi-au.ai-dev-2024.workers.dev/ui`

Built on Cardog's open-source stack — every VIN decode goes through [`@cardog/corgi`](https://www.npmjs.com/package/@cardog/corgi) and every charging lookup goes through [`@cardog/ocm-client`](https://www.npmjs.com/package/@cardog/ocm-client). Mocks exist in tests only.

## Endpoints

- `GET /ui` — polished demo page (VIN form + charging search)
- `GET /decode/:vin` — decode a 17-char VIN → make / model / year
- `GET /charging?lat=&lng=&radius_km=` — stations near a point, D1 cache first, live OCM fallback
- `GET /health` — `{ ok: true }`

```sh
curl https://corgi-au.ai-dev-2024.workers.dev/decode/1HGCM82633A123456
curl "https://corgi-au.ai-dev-2024.workers.dev/charging?lat=-33.8688&lng=151.2093&radius_km=10"
```

`GET /charging` params: `lat` -90..90, `lng` -180..180, `radius_km` 1..100 (default 10). Statuses: 200 ok, 400 bad params, 404 no stations / no VIN data, 429 rate limited (20 live lookups/min/IP), 500 missing key or upstream failure. Cache hits never count toward the limit.

Daily cron refreshes AU capital charging data into D1.

## Local dev

```sh
npm install
npm test
npm run typecheck
echo "OCM_API_KEY=..." > .dev.vars  # free key at https://openchargemap.org/site/profile
npm run dev
```

Deploy: `wrangler secret put OCM_API_KEY && wrangler deploy`. CI runs lint + typecheck + tests, deploys on `main`. Keys are never committed — see `.env.example`.

## Credits

- VIN: `@cardog/corgi` (NHTSA VPIC) · Charging client: `@cardog/ocm-client`
- Data: [Open Charge Map](https://openchargemap.org) · Platform: Workers + D1 + Hono

MIT — see `LICENSE`.
