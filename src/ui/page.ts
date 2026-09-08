/**
 * corgi-au demo UI — Cardog-grade single-file page.
 *
 * Served from GET /ui. No framework, no external assets (works on Workers).
 * Calls GET /decode/:vin and GET /charging?lat=&lng=&radius_km=.
 * Renders API data with textContent only (no innerHTML).
 */
export const UI_HTML = "<!doctype html>\n" +
  '<html lang="en">\n' +
  "<head>\n" +
  '<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
  "<title>corgi-au — VIN + EV charging for Australia</title>\n" +
  '<meta name="description" content="Decode any VIN and find EV charging stations in Australia. Built on @cardog/corgi and @cardog/ocm-client, running on Cloudflare Workers + D1.">\n' +
  "<style>\n" +
  ":root{--ink:#0b0d10;--muted:#5f6b76;--paper:#ffffff;--wash:#f4f5f6;--card:#ffffff;--line:#e8eaed;--accent:#ff4d00;--ok:#067647;--okbg:#ecfdf3;--err:#b42318;--errbg:#fef3f2;--radius:16px;--shadow:0 1px 2px rgba(11,13,16,.06),0 12px 32px rgba(11,13,16,.08);--mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}\n" +
  "*{box-sizing:border-box}html{scroll-behavior:smooth}\n" +
  "body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:var(--paper);color:var(--ink);line-height:1.55;-webkit-font-smoothing:antialiased}\n" +
  ".wrap{max-width:76rem;margin:0 auto;padding:0 1.5rem}\n" +
  "a{color:inherit}\n" +
  ".top{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.88);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}\n" +
  ".top-inner{display:flex;align-items:center;gap:1.25rem;height:4rem}\n" +
  ".brand{display:flex;align-items:center;gap:.6rem;text-decoration:none;font-weight:800;font-size:1.1rem;letter-spacing:-.02em}\n" +
  ".mark{width:2rem;height:2rem;border-radius:.65rem;background:var(--ink);color:#fff;display:grid;place-items:center;font-size:1.1rem}\n" +
  ".brand small{font-weight:700;font-size:.7rem;letter-spacing:.1em;background:var(--ink);color:#fff;border-radius:999px;padding:.18rem .55rem;margin-left:.15rem}\n" +
  ".nav{display:flex;gap:1.25rem;margin-left:1.5rem;font-size:.93rem;font-weight:600;color:var(--muted)}\n" +
  ".nav a{text-decoration:none}.nav a:hover{color:var(--ink)}\n" +
  ".cta{margin-left:auto;display:flex;gap:.6rem;align-items:center}\n" +
  ".live{display:flex;align-items:center;gap:.45rem;font-size:.82rem;font-weight:700;color:var(--ok);background:var(--okbg);border:1px solid #a6f4c5;border-radius:999px;padding:.32rem .7rem}\n" +
  ".live i{width:.5rem;height:.5rem;border-radius:50%;background:#12b76a;display:inline-block}\n" +
  ".btn{font:inherit;font-weight:700;border-radius:12px;padding:.7rem 1.1rem;cursor:pointer;border:1px solid var(--ink);text-decoration:none;display:inline-block}\n" +
  ".btn-dark{background:var(--ink);color:#fff}.btn-dark:hover{background:#1c2127}\n" +
  ".btn-accent{background:var(--accent);border-color:var(--accent);color:#fff}.btn-accent:hover{filter:brightness(.95)}\n" +
  ".btn-ghost{background:#fff;color:var(--ink)}.btn:disabled{opacity:.55;cursor:wait}\n" +
  ".hero{padding:3.5rem 0 2rem;display:grid;gap:2rem}\n" +
  "@media(min-width:960px){.hero{grid-template-columns:1.15fr .85fr;align-items:center}}\n" +
  ".eyebrow{font-family:var(--mono);font-size:.76rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:0 0 .8rem}\n" +
  ".eyebrow b{color:var(--accent)}\n" +
  "h1{font-size:clamp(2.4rem,5vw,3.9rem);line-height:1.02;letter-spacing:-.045em;margin:0 0 1rem}\n" +
  "h1 u{text-decoration:none;position:relative;white-space:nowrap}h1 u::after{content:'';position:absolute;left:0;right:0;bottom:.08em;height:.18em;background:var(--accent);opacity:.9;z-index:-1;border-radius:3px}\n" +
  ".lede{font-size:1.12rem;color:var(--muted);max-width:36rem;margin:0 0 1.5rem}\n" +
  ".lede code,.mini code,footer code{font-family:var(--mono);font-size:.85em;background:var(--wash);border:1px solid var(--line);border-radius:6px;padding:.05rem .35rem}\n" +
  ".hero-cta{display:flex;gap:.7rem;flex-wrap:wrap}\n" +
  ".proof{display:flex;gap:1.5rem;margin-top:1.4rem;color:var(--muted);font-size:.88rem}\n" +
  ".proof strong{display:block;font-size:1.25rem;color:var(--ink);letter-spacing:-.02em}\n" +
  ".panel{background:var(--ink);color:#fff;border-radius:20px;padding:1.4rem;box-shadow:var(--shadow);position:relative;overflow:hidden}\n" +
  ".panel::before{content:'';position:absolute;inset:0;background:radial-gradient(600px 200px at 80% -10%,rgba(255,77,0,.45),transparent 60%)}\n" +
  ".panel h3{margin:0 0 .3rem;font-size:.95rem;letter-spacing:.06em;text-transform:uppercase;color:#c8cfd6;position:relative}\n" +
  ".panel .row{display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:.65rem .8rem;margin-top:.6rem;font-size:.9rem;position:relative}\n" +
  ".panel a.row{color:#fff;text-decoration:none}.panel a.row:hover{background:rgba(255,255,255,.13)}\n" +
  ".panel .row code{font-family:var(--mono);font-size:.82rem;color:#ffd9c7;background:transparent;border:none;padding:0}\n" +
  ".dot{width:.55rem;height:.55rem;border-radius:50%;background:#12b76a;display:inline-block;margin-right:.4rem}\n" +
  ".section{padding:1rem 0 2.5rem}\n" +
  ".section-head{display:flex;align-items:baseline;gap:1rem;margin:0 0 1rem}\n" +
  ".section-head h2{margin:0;font-size:1.6rem;letter-spacing:-.03em}\n" +
  ".section-head p{margin:0;color:var(--muted)}\n" +
  ".tools{display:grid;gap:1.1rem}\n" +
  "@media(min-width:960px){.tools{grid-template-columns:1fr 1fr;align-items:start}}\n" +
  ".card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;animation:rise .5s ease both;scroll-margin-top:5.5rem}\n" +
  ".card:nth-child(2){animation-delay:.08s}\n" +
  "@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}\n" +
  ".card-top{padding:1.25rem 1.35rem .6rem;display:flex;gap:.9rem;align-items:flex-start}\n" +
  ".icon{width:2.6rem;height:2.6rem;border-radius:.9rem;background:var(--wash);border:1px solid var(--line);display:grid;place-items:center;font-size:1.3rem;flex:none}\n" +
  ".card-top h3{margin:0;font-size:1.15rem;letter-spacing:-.02em}\n" +
  ".card-top p{margin:.2rem 0 0;color:var(--muted);font-size:.9rem}\n" +
  ".card-body{padding:.6rem 1.35rem 1.35rem}\n" +
  "form{display:grid;gap:.75rem}\n" +
  "label{display:grid;gap:.4rem;font-size:.87rem;font-weight:700}\n" +
  ".hint{font-weight:400;color:var(--muted)}\n" +
  ".plate{font-family:var(--mono) !important;font-weight:800 !important;letter-spacing:.16em;text-transform:uppercase;background:#0b0d10 !important;color:#ffd60a !important;border:2px solid #0b0d10 !important;border-radius:12px !important;padding:.8rem 1rem !important;font-size:1.05rem !important}\n" +
  ".plate::placeholder{color:#7d8590}\n" +
  "input{font:inherit;padding:.68rem .8rem;border:1px solid var(--line);border-radius:12px;width:100%;background:#fff}\n" +
  "input:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid #ffd60a;outline-offset:2px}\n" +
  ".grid2{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}\n" +
  ".btnrow{display:flex;gap:.6rem;flex-wrap:wrap}\n" +
  ".status{margin:.75rem 0 0;font-weight:700;font-size:.92rem;min-height:1.4em}\n" +
  ".status.ok{color:var(--ok)}.status.error{color:var(--err);background:var(--errbg);border:1px solid #fecdca;border-radius:10px;padding:.5rem .7rem}\n" +
  "dl.spec{background:var(--wash);border:1px solid var(--line);border-radius:12px;padding:.9rem 1rem;display:grid;grid-template-columns:auto 1fr;gap:.3rem 1rem;margin:.75rem 0 0;font-size:.92rem}\n" +
  "dl.spec dt{color:var(--muted);font-weight:700}dl.spec dd{margin:0;overflow-wrap:anywhere;font-weight:600}\n" +
  "ul.stations{list-style:none;padding:0;margin:.75rem 0 0;display:grid;gap:.65rem}\n" +
  "ul.stations li{border:1px solid var(--line);border-radius:14px;padding:.8rem .95rem;background:#fff}\n" +
  "ul.stations li:hover{border-color:#c9cdd3}\n" +
  "ul.stations strong{letter-spacing:-.01em}\n" +
  ".smeta{color:var(--muted);font-size:.86rem;margin-top:.15rem;font-family:var(--mono)}\n" +
  ".chips{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.5rem}\n" +
  ".chip{font-size:.75rem;font-weight:700;background:var(--wash);border:1px solid var(--line);border-radius:999px;padding:.18rem .6rem}\n" +
  ".docs{background:var(--ink);color:#e6eaee;border-radius:20px;padding:1.6rem;margin:0 0 2.5rem}\n" +
  ".docs h2{margin:0 0 .4rem;letter-spacing:-.02em}.docs p{margin:0 0 1rem;color:#aeb6bf}\n" +
  ".docs pre{background:#151a1f;border:1px solid #2a3138;border-radius:12px;padding:.9rem 1rem;overflow:auto;font-family:var(--mono);font-size:.82rem;line-height:1.5;margin:.6rem 0}\n" +
  "footer{border-top:1px solid var(--line);padding:2rem 0;color:var(--muted);font-size:.88rem}\n" +
  ".fgrid{display:grid;gap:1.5rem}@media(min-width:800px){.fgrid{grid-template-columns:1.2fr 1fr 1fr 1fr}}\n" +
  "footer h4{margin:0 0 .6rem;color:var(--ink);font-size:.85rem;letter-spacing:.06em;text-transform:uppercase}\n" +
  "footer ul{list-style:none;margin:0;padding:0;display:grid;gap:.35rem}footer a{text-decoration:none}footer a:hover{color:var(--ink)}\n" +
  ".fine{margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--line);display:flex;gap:1rem;flex-wrap:wrap}\n" +
  "@media(max-width:640px){.nav{display:none}.hero{padding:2.2rem 0 1.2rem}}\n" +
  "@media(prefers-reduced-motion:reduce){*{animation:none !important;scroll-behavior:auto !important}}\n" +
  "</style>\n" +
  "</head>\n" +
  "<body>\n" +
  '<header class="top"><div class="wrap top-inner">\n' +
  '<a class="brand" href="/ui"><span class="mark">◍</span> corgi-au <small>AU</small></a>\n' +
  '<nav class="nav"><a href="#vin">VIN decode</a><a href="#charging">Charging</a><a href="#docs">API</a><a href="https://github.com/ai-dev-2024/corgi-au" target="_blank" rel="noopener">GitHub</a></nav>\n' +
  '<div class="cta"><span class="live"><i></i>live</span><a class="btn btn-dark" href="#vin">Try demo</a></div>\n' +
  "</div></header>\n" +
  '<main class="wrap">\n' +
  '<div class="hero">\n' +
  "<div>\n" +
  '<p class="eyebrow">Built on <b>@cardog/corgi</b> · <b>@cardog/ocm-client</b> · Workers + D1</p>\n' +
  "<h1>Car knowledge, <u>unleashed</u> for Australia.</h1>\n" +
  '<p class="lede">Decode any 17-character VIN and find EV chargers near any point. D1 cache first, live Open Charge Map fallback, nightly refresh of 8 capitals. Two endpoints, zero fluff.</p>\n' +
  '<div class="hero-cta"><a class="btn btn-accent" href="#vin">Decode a VIN</a><a class="btn btn-ghost" href="#charging">Find charging</a></div>\n' +
  '<div class="proof"><div><strong>2</strong>endpoints</div><div><strong>8</strong>capitals cached</div><div><strong>24h</strong>cache TTL</div></div>\n' +
  "</div>\n" +
  '<aside class="panel" aria-label="API status">\n' +
  "<h3>Live API</h3>\n" +
  '<a class="row" href="/health"><span><span class="dot"></span>GET /health</span><code>200 ok →</code></a>\n' +
  '<a class="row" href="#vin"><span>GET /decode/:vin</span><code>@cardog/corgi →</code></a>\n' +
  '<a class="row" href="#charging"><span>GET /charging</span><code>@cardog/ocm-client →</code></a>\n' +
  '<div class="row"><span>Store</span><code>D1 + cron 0 2 * * *</code></div>\n' +
  "</aside>\n" +
  "</div>\n" +
  '<div class="section"><div class="section-head"><h2>Tools</h2><p>Same JSON the API returns — try Sydney below.</p></div>\n' +
  '<div class="tools">\n' +
  '<section class="card" id="vin" aria-label="VIN lookup">\n' +
  '<div class="card-top"><div class="icon">🔎</div><div><h3>VIN lookup</h3><p>ISO 3779 · no I, O, Q · e.g. <span class="mini"><code>1HGCM82633A123456</code></span></p></div></div>\n' +
  '<div class="card-body">\n' +
  '<form id="vin-form">\n' +
  '<label>Number plate<span class="hint">Auto-uppercased, 17 chars</span>\n' +
  '<input class="plate" id="vin-input" name="vin" maxlength="17" autocomplete="off" placeholder="1HGCM82633A123456" required></label>\n' +
  '<div class="btnrow"><button class="btn btn-accent" type="submit" id="vin-submit">Decode VIN</button></div>\n' +
  "</form>\n" +
  '<p class="status" id="vin-status" role="status"></p>\n' +
  '<div id="vin-result"></div>\n' +
  "</div></section>\n" +
  '<section class="card" id="charging" aria-label="Charging station search" hidden>\n' +
  '<div class="card-top"><div class="icon">⚡</div><div><h3>Charging search</h3><p>Cache first, live fallback · defaults to Sydney</p></div></div>\n' +
  '<div class="card-body">\n' +
  '<form id="charging-form">\n' +
  '<div class="grid2">\n' +
  '<label>Latitude<span class="hint">-90 to 90</span>\n' +
  '<input id="lat-input" name="lat" inputmode="decimal" value="-33.8688" required></label>\n' +
  '<label>Longitude<span class="hint">-180 to 180</span>\n' +
  '<input id="lng-input" name="lng" inputmode="decimal" value="151.2093" required></label>\n' +
  "</div>\n" +
  '<label>Radius (km)<span class="hint">1–100, default 10</span>\n' +
  '<input id="radius-input" name="radius_km" inputmode="numeric" value="10"></label>\n' +
  '<div class="btnrow"><button class="btn btn-dark" type="submit" id="charging-submit">Find stations</button>\n' +
  '<button class="btn btn-ghost" type="button" id="geo-button">Use my location</button></div>\n' +
  "</form>\n" +
  '<p class="status" id="charging-status" role="status"></p>\n' +
  '<div id="charging-result"></div>\n' +
  "</div></section>\n" +
  "</div></div>\n" +
  '<div class="docs" id="docs" style="scroll-margin-top:5.5rem"><h2>API docs</h2><p>Try it from your terminal.</p>\n' +
  "<pre>curl https://corgi-au.ai-dev-2024.workers.dev/decode/1HGCM82633A123456</pre>\n" +
  "<pre>curl \"https://corgi-au.ai-dev-2024.workers.dev/charging?lat=-33.8688&amp;lng=151.2093&amp;radius_km=10\"</pre>\n" +
  "</div>\n" +
  "</main>\n" +
  "<footer><div class=\"wrap\"><div class=\"fgrid\">\n" +
  "<div><h4>corgi-au</h4><p>AU + global VIN and charging demo on Workers + D1, built on Cardog OSS.</p></div>\n" +
  "<div><h4>Tools</h4><ul><li><a href=\"#vin\">VIN decode</a></li><li><a href=\"#charging\">Charging</a></li><li><a href=\"/health\">Health</a></li><li><a href=\"#docs\">API docs</a></li></ul></div>\n" +
  "<div><h4>Developers</h4><ul><li><a href=\"https://github.com/ai-dev-2024/corgi-au\" target=\"_blank\" rel=\"noopener\">GitHub repo</a></li><li><a href=\"https://openchargemap.org\" target=\"_blank\" rel=\"noopener\">Open Charge Map</a></li><li><a href=\"https://www.npmjs.com/package/@cardog/corgi\" target=\"_blank\" rel=\"noopener\">@cardog/corgi</a></li></ul></div>\n" +
  "<div><h4>Stack</h4><ul><li><code>@cardog/corgi</code></li><li><code>@cardog/ocm-client</code></li><li>Hono + D1 + Cron</li></ul></div>\n" +
  "</div><div class=\"fine\"><span>MIT</span><span>Data: NHTSA VPIC / OCM ODbL</span></div></div></footer>\n" +
  "<script>\n" +
  "(function () {\n" +
  "  function show(view) {\n" +
  "    document.getElementById('vin').hidden = view !== 'vin';\n" +
  "    document.getElementById('charging').hidden = view !== 'charging';\n" +
  "  }\n" +
  "  function route() { show(location.hash === '#charging' ? 'charging' : 'vin'); }\n" +
  "  window.addEventListener('hashchange', route);\n" +
  "  route();\n" +
  "  function setStatus(el, kind, text) { el.textContent = text; el.className = 'status' + (kind ? ' ' + kind : ''); }\n" +
  "  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }\n" +
  "  function dl(parent, entries) {\n" +
  "    var list = document.createElement('dl'); list.className = 'spec';\n" +
  "    entries.forEach(function (pair) {\n" +
  "      var dt = document.createElement('dt'); dt.textContent = pair[0];\n" +
  "      var dd = document.createElement('dd'); dd.textContent = pair[1];\n" +
  "      list.appendChild(dt); list.appendChild(dd);\n" +
  "    });\n" +
  "    parent.appendChild(list);\n" +
  "  }\n" +
  "  function readError(res, fallback) {\n" +
  "    return res.json().then(function (body) {\n" +
  "      if (body && typeof body.error === 'string' && body.error) return body.error;\n" +
  "      return fallback;\n" +
  "    }).catch(function () { return fallback; });\n" +
  "  }\n" +
  "  var vinForm = document.getElementById('vin-form');\n" +
  "  var vinInput = document.getElementById('vin-input');\n" +
  "  var vinSubmit = document.getElementById('vin-submit');\n" +
  "  var vinStatus = document.getElementById('vin-status');\n" +
  "  var vinResult = document.getElementById('vin-result');\n" +
  "  vinForm.addEventListener('submit', function (ev) {\n" +
  "    ev.preventDefault();\n" +
  "    var vin = vinInput.value.trim().toUpperCase(); vinInput.value = vin;\n" +
  "    clear(vinResult);\n" +
  "    if (!vin) { setStatus(vinStatus, 'error', 'Enter a VIN first.'); return; }\n" +
  "    vinSubmit.disabled = true; setStatus(vinStatus, '', 'Decoding…');\n" +
  "    fetch('/decode/' + encodeURIComponent(vin)).then(function (res) {\n" +
  "      if (res.ok) {\n" +
  "        return res.json().then(function (data) {\n" +
  "          setStatus(vinStatus, 'ok', 'Decoded ' + data.vin);\n" +
  "          var rows = []; var vehicle = data.vehicle || {};\n" +
  "          Object.keys(vehicle).forEach(function (k) { rows.push([k, String(vehicle[k])]); });\n" +
  "          if (data.modelYear != null) rows.push(['modelYear', String(data.modelYear)]);\n" +
  "          if (data.wmi != null) rows.push(['wmi', String(JSON.stringify(data.wmi))]);\n" +
  "          if (data.plant != null) rows.push(['plant', String(JSON.stringify(data.plant))]);\n" +
  "          if (data.engine != null) rows.push(['engine', String(JSON.stringify(data.engine))]);\n" +
  "          dl(vinResult, rows.length ? rows : [['result', JSON.stringify(data)]]);\n" +
  "        });\n" +
  "      }\n" +
  "      if (res.status === 400) { return readError(res, 'Invalid VIN.').then(function (m) { setStatus(vinStatus, 'error', 'Invalid VIN: ' + m); }); }\n" +
  "      if (res.status === 404) { setStatus(vinStatus, 'error', 'No data found for this VIN.'); return null; }\n" +
  "      return readError(res, 'Upstream VIN database failure.').then(function (m) { setStatus(vinStatus, 'error', 'Server problem (500): ' + m); });\n" +
  "    }).catch(function () { setStatus(vinStatus, 'error', 'Network error: could not reach the API.'); })\n" +
  "    .finally(function () { vinSubmit.disabled = false; });\n" +
  "  });\n" +
  "  var chForm = document.getElementById('charging-form');\n" +
  "  var latInput = document.getElementById('lat-input');\n" +
  "  var lngInput = document.getElementById('lng-input');\n" +
  "  var radiusInput = document.getElementById('radius-input');\n" +
  "  var chSubmit = document.getElementById('charging-submit');\n" +
  "  var geoButton = document.getElementById('geo-button');\n" +
  "  var chStatus = document.getElementById('charging-status');\n" +
  "  var chResult = document.getElementById('charging-result');\n" +
  "  geoButton.addEventListener('click', function () {\n" +
  "    if (!navigator.geolocation) { setStatus(chStatus, 'error', 'Geolocation is not available.'); return; }\n" +
  "    setStatus(chStatus, '', 'Locating…');\n" +
  "    navigator.geolocation.getCurrentPosition(function (pos) {\n" +
  "      latInput.value = String(pos.coords.latitude); lngInput.value = String(pos.coords.longitude); setStatus(chStatus, '', '');\n" +
  "    }, function () { setStatus(chStatus, 'error', 'Could not get your location.'); });\n" +
  "  });\n" +
  "  chForm.addEventListener('submit', function (ev) {\n" +
  "    ev.preventDefault(); clear(chResult);\n" +
  "    var params = new URLSearchParams({ lat: latInput.value.trim(), lng: lngInput.value.trim(), radius_km: (radiusInput.value.trim() || '10') });\n" +
  "    chSubmit.disabled = true; setStatus(chStatus, '', 'Searching…');\n" +
  "    fetch('/charging?' + params.toString()).then(function (res) {\n" +
  "      if (res.ok) {\n" +
  "        return res.json().then(function (data) {\n" +
  "          var stations = data.stations || [];\n" +
  "          setStatus(chStatus, 'ok', stations.length + ' station(s) via ' + data.source + '.');\n" +
  "          var list = document.createElement('ul'); list.className = 'stations';\n" +
  "          stations.forEach(function (s) {\n" +
  "            var item = document.createElement('li');\n" +
  "            var name = document.createElement('strong'); name.textContent = s.name; item.appendChild(name);\n" +
  "            var meta = document.createElement('div'); meta.className = 'smeta'; meta.textContent = s.lat + ', ' + s.lng + ' — id ' + s.id; item.appendChild(meta);\n" +
  "            var chips = document.createElement('div'); chips.className = 'chips';\n" +
  "            (s.connector_types || []).forEach(function (c) { var chip = document.createElement('span'); chip.className = 'chip'; chip.textContent = c; chips.appendChild(chip); });\n" +
  "            if (!(s.connector_types || []).length) { var none = document.createElement('span'); none.className = 'chip'; none.textContent = 'unknown connectors'; chips.appendChild(none); }\n" +
  "            item.appendChild(chips); list.appendChild(item);\n" +
  "          });\n" +
  "          chResult.appendChild(list);\n" +
  "        });\n" +
  "      }\n" +
  "      if (res.status === 400) { return readError(res, 'Invalid search parameters.').then(function (m) { setStatus(chStatus, 'error', 'Check lat/lng/radius: ' + m); }); }\n" +
  "      if (res.status === 404) { setStatus(chStatus, 'error', 'No charging stations found near this location.'); return null; }\n" +
  "      return readError(res, 'Upstream charging data failure.').then(function (m) { setStatus(chStatus, 'error', 'Server problem (500): ' + m); });\n" +
  "    }).catch(function () { setStatus(chStatus, 'error', 'Network error: could not reach the API.'); })\n" +
  "    .finally(function () { chSubmit.disabled = false; });\n" +
  "  });\n" +
  "})();\n" +
  "</script>\n" +
  "</body>\n" +
  "</html>\n"
