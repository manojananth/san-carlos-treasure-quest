# San Carlos Treasure Quest — implementation plan

Stack: Vite + TypeScript + React 18, MapLibre GL JS 4.x, GSAP 3, Howler (M4), @turf/* for line math.
Deploy: GitHub Actions → GitHub Pages, Vite `base: '/san-carlos-treasure-quest/'`.

## Architecture

```
scripts/build-routes.ts      build-time: OSM streets (OpenFreeMap z14 vector tiles) → street graph → Dijkstra legs
src/data/stops.ts            7 stops: id, name, theme name, lon/lat, order, bonus flag
src/data/routes.json         generated FeatureCollection<LineString>, one leg per consecutive stop pair (committed)
src/map/style.ts             OpenFreeMap "liberty" style + terrarium DEM + hillshade + sky
src/map/GameMap.tsx          map lifecycle, markers, explorer, camera
src/map/explorer.ts          GSAP-driven walk along a leg (turf length/along), bearing-aware camera follow
src/components/Explorer.svg  illustrated explorer sprite (inline SVG, 2-frame walk bob)
src/state/                   (M2) game store, profiles, localStorage save
src/games/                   (M3) one folder per mini-game, shared <MiniGameShell>
.github/workflows/deploy.yml build + upload-pages-artifact + deploy-pages
```

### Why routes come from vector tiles, not Overpass
Overpass resets connections from the build environment. OpenFreeMap tiles are built from OSM, and the
`transportation` layer at z14 has every street and path as LineStrings, with vertices quantized to a 4096 grid per
tile (~2.4 m). Snap vertices to that grid → shared intersection nodes → graph. Lines split at tile edges rejoin
because both sides land on the same grid point (use a ~3 m snap tolerance). Classes used: motorway excluded;
trunk/primary/secondary/tertiary/minor/service/path/track (paths needed for the canyon trail; weight paths 1.0,
service 1.2 to prefer real streets). The `transportation_name` layer confirms street names for checks.

## Stops (approximate; refine by snapping to tile POI/park names)
| # | id | real place | theme | approx lon,lat |
|---|----|-----------|-------|----------------|
| 1 | depot | San Carlos Caltrain Depot (1888 stone depot) | Base Camp | -122.2602, 37.5075 |
| 2 | laurel | Laurel Street downtown | Merchant Road | -122.2622, 37.5045 |
| 3 | cityhall | City Hall & Library, 600 Elm St | Hall of Scrolls | -122.2626, 37.5028 |
| 4 | burton | Burton Park | Fort Burton | -122.2680, 37.5000 |
| 5 | bigcanyon | Big Canyon Park | Canyon of Echoes | -122.2817, 37.4955 |
| 6 | highlands | Highlands Park | Summit Outpost | -122.2934, 37.4991 |
| 7 | hiller | Hiller Aviation Museum (bonus) | Sky Hangar | -122.2497, 37.5136 |

Legs: 1→2→3→4→5→6, then the bonus leg 6→7 (or 1→7 when the bonus is played early; generate both).

## Map look
- Pitch 60, bearing about -20 so the hills rise "up-screen" to the west; terrain exaggeration 1.5; hillshade
  (exaggeration 0.5, warm shadow) placed under roads/buildings; `sky` layer teal→white; 3D buildings from liberty.
- maxBounds around San Carlos so kids can't get lost; min zoom 12.5, max 18.
- Markers: trail-sign style DOM markers (red sign post, gold number, Lilita One label). States: `locked`
  (fogged, "?"), `unlocked`, `current`, `done` (gold star). Milestone 1 shows all 7 as unlocked.

## Milestones
1. Map + terrain + hillshade + 7 markers + explorer walking real streets (dev "walk to next stop" control).
2. Riddle flow (3 choices, hint costs XP), fog-of-war + fly-to on unlock, XP/stars/badges, 4 profiles,
   difficulty, localStorage save/load, per-device leaderboard.
3. Mini-games one by one, each in a pointer-events shell (touch + mouse), stars 1–3, difficulty-scaled.
4. Finale (fragment puzzle, chest, coins, confetti), Howler SFX + mute, haptics, reduced-motion pass, deploy.

## Ground rules
- Mobile-first, works in portrait and landscape; 44 px minimum touch targets.
- `prefers-reduced-motion`: no camera flights (jumpTo), explorer teleports, no confetti.
- Sports stay generic: no leagues, teams, drivers, or logos.
- No API keys anywhere.
