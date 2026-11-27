# San Carlos Treasure Quest

A kids' (ages 9-12) map adventure: a railroad worker hid gold near the 1888 stone train depot in San Carlos, CA.
Milestone 1: 3D terrain map, seven trail-sign stops, and an explorer who walks real streets. See `docs/PLAN.md`.

## Run

```bash
npm install
npm run dev        # http://localhost:5173/san-carlos-treasure-quest/
npm run build && npm run preview
```

## Regenerate street routes

Routes are built from OpenFreeMap vector tiles (OpenStreetMap data) and committed, so deploys never need the network step.

```bash
npm run routes     # runs NODE_USE_ENV_PROXY=1 tsx scripts/build-routes.ts
```

It writes `src/data/routes.json` and the refined `src/data/stops.json`, prints each leg length, and fails if a leg is
3x longer than the straight line. `NODE_USE_ENV_PROXY=1` makes Node's `fetch` honour `HTTPS_PROXY`; it is harmless elsewhere.

## Deploy

Pushes to `main` run `.github/workflows/deploy.yml`. In the repo go to **Settings > Pages** and set **Source** to **GitHub Actions**.

## Data attributions

- Map data (c) [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL
- Tiles and style: [OpenFreeMap](https://openfreemap.org), schema by [OpenMapTiles](https://openmaptiles.org)
- Terrain: Mapzen / AWS Terrain Tiles
