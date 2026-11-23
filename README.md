# outdoor-window

Is it a good time to run or hike outdoors — now, or on any of the next 7 days?

A static React app. Everything runs in the browser: hourly forecast from
[Open-Meteo](https://open-meteo.com/), place search via the Open-Meteo geocoding API, and
"use my location" names via [Nominatim](https://nominatim.org/) (Open-Meteo has no reverse
geocoding). No API keys, no backend.

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # engine + data/i18n unit tests
npm run build    # static site in dist/
```

Or with Docker (no local Node needed):

```sh
make up      # dev server with hot reload on http://localhost:3000
make test    # run the tests in the container
make dist    # build the static site into ./dist
make logs | make shell | make down | make clean
```

Geolocation only works on HTTPS or `localhost`, so open the app at `localhost:3000`, not a LAN IP.

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`: `npm ci`, `npm test`, `npm run build`
on Node 24, then publishes `dist/` to the `gh-pages` branch. `npm run deploy` does the same by
hand. The build uses a relative base (`./`), so it works from any GitHub Pages sub-path.

One-time setup on GitHub: **Settings → Pages → Source: Deploy from a branch → `gh-pages` / root**.

## Verdicts

The engine (`src/engine/`, pure functions) rates every hour, then checks in this order, and
returns the first match:

| # | Verdict | When |
|---|---|---|
| 1 | **Go now** | Today only: the N hours starting now are good. If a later window scores ≥ 10 points higher, it is shown as a hint. |
| 2 | **Best time window** | Some N-hour window is good (long windows may include ≤ 25 % merely *fair* hours). The best possible answer for a future day. |
| 3 | **Low-probability window** | No good window, but some window has no poor/hazardous hours; picks the one with least expected rain. |
| 4 | **Go to the gym** | No usable window, but it is safe to commute. |
| 5 | **Stay home** | Today: hazards in the next 90 min. Future day: ≥ 50 % of eligible hours hazardous. |

Each hour gets a level (good / fair / poor / hazard) per factor — rain probability and
amount, feels-like temperature, gusts, UV, and weather code (thunderstorm, freezing rain,
heavy snow, fog) — and a 0–100 score for ranking. Thresholds per activity live in
`src/engine/profiles.ts`.

| | Running | Hiking |
|---|---|---|
| Duration | 30 min – 3 h | 1 h – 10 h, or all day |
| Hours considered | 06:00–22:00 (daylight preferred) | 06:00–20:00, sunrise to sunset only |

## Language and units

- UI in Spanish, Catalan, or English: detected from the browser, switchable, remembered.
- Units follow the **location**, not the language: °F/mph/in for the US, °C/mph for the UK,
  metric elsewhere.
- Location, activity, durations, and language persist in `localStorage`.
