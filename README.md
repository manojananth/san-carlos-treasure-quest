# San Carlos Treasure Quest

A map adventure for kids aged 9-12, set in the real town of San Carlos, California. A railroad worker hid a chest of
gold near the 1888 stone train depot and split the treasure map into six fragments. Your explorer walks real streets on
a 3D terrain map, solves riddles to unlock each new stop, wins a fragment at every stop with a quick mini-game, and
finally pieces the map together to open the chest.

Everything runs in the browser. There is no server, no account and nothing to install for players.

## How to play

1. **Pick or create an explorer.** Up to four players share one device. Choose a name, a hat colour and a difficulty.
2. **Read the story** at Base Camp, then play the first stop's **challenge**, a 20-45 second mini-game. You always earn
   at least 1 star, up to 3, and win a **map fragment**.
3. **Solve the riddle** for the next stop (three choices). A wrong answer greys that choice out. A **hint** helps but
   costs XP. A right answer lifts the fog: the new stop appears and the camera flies to it.
4. **Walk** there with the explorer along real streets and trails, then play that stop's challenge.
5. After the sixth stop you may visit the **bonus stop** (Sky Hangar) or head straight to the finale.
6. **Finale:** walk back to Base Camp, fit the six fragments together into the treasure map, and open the chest.

### The stops

| # | Stop | Place | Challenge |
|---|------|-------|-----------|
| 1 | Base Camp | San Carlos Caltrain Depot | Couple the train cars in the right order |
| 2 | Merchant Road | Laurel Street downtown | Spot hidden items, then a lights-out reaction start |
| 3 | Hall of Scrolls | City Hall and Library | Five-question quiz about San Carlos |
| 4 | Fort Burton | Burton Park | Field-goal kicking |
| 5 | Canyon of Echoes | Big Canyon Park | Race up the trail, jump the roots and rocks |
| 6 | Summit Outpost | Highlands Park | Penalty shootout |
| Bonus | Sky Hangar | Hiller Aviation Museum | Paper-plane glide |

### Difficulty

| | Riddles | Riddle timer | Hint cost | XP multiplier | Mini-game time |
|---|---------|--------------|-----------|---------------|----------------|
| Rookie | easy | none | 5 XP | x1.0 | 30% more time |
| Pro | medium | 60 s | 10 XP | x1.25 | normal |
| Legend | hard | 35 s | 20 XP | x1.5 | 25% less time |

You can change difficulty at any time in the menu; the Legend badge is only awarded to runs played on Legend all the way.

### Badges

First Clue (solve a riddle), Sharp Mind (3 riddles right on the first try), No Peeking (finish the main stops with
no hints), Star Collector (15 stars in one run), Sky High (visit the bonus stop), Trailblazer (finish a run),
Legend of San Carlos (finish on Legend), Treasure Finder (open the chest).

## Controls

| | Touch | Mouse | Keyboard |
|---|-------|-------|----------|
| Buttons, riddle answers | tap | click | Tab / Enter / Space |
| Mini-games | tap, drag, flick | click and drag | the how-to and result cards are fully keyboard-operable; games add arrow keys / Space where practical |
| Map | drag, pinch | drag, scroll | arrow keys pan, `+` `-` zoom |
| Menu and cards | tap | click | `Esc` closes the menu and leaderboard |

The speaker button in the top bar mutes sound. The menu has **Sound** and **Vibration** switches (vibration works on
phones that support it). Players who prefer less motion get it automatically: if the device asks for reduced motion the
camera jumps instead of flying, the explorer teleports instead of walking, and confetti, shaking and flashing are off.
All touch targets are at least 44 px and the game works in portrait and landscape.

## Notes for parents and teachers

- No accounts, no sign-in, no ads, no analytics and no tracking. Nothing about your child is sent anywhere.
- Progress, names and settings are stored only in this browser's local storage on this device. Clearing site data
  erases them. Explorer names are never uploaded; the "leaderboard" only compares explorers on the same device.
- The map loads tiles from OpenFreeMap, terrain from AWS Terrain Tiles and the two fonts from Google Fonts. These
  services only receive the usual web request (the map area or font name, plus your IP address, as with any website).
  No API keys are used.
- Sounds are short effects played after a tap. Everything can be switched off in the menu.
- Sports are shown generically: no leagues, teams, players or logos.

## Development

```bash
npm install
npm run dev        # http://localhost:5173/san-carlos-treasure-quest/
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ locally
npm test           # vitest: reducer, storage, settings and game logic
npm run routes     # rebuild src/data/routes.json (needs network)
npm run sfx        # re-synthesise public/sfx/*.wav (offline, deterministic)
```

Add `?debug` to the URL (or run `npm run dev`) to expose `window.__game` and a "skip challenge" button for testing.

- **Routes.** Street routes are built from OpenFreeMap vector tiles (OpenStreetMap data) into a street graph with
  Dijkstra legs, then committed so deploys never need the network. `npm run routes` runs
  `NODE_USE_ENV_PROXY=1 tsx scripts/build-routes.ts`; `NODE_USE_ENV_PROXY=1` makes Node's `fetch` honour `HTTPS_PROXY`.
  It fails if a leg is more than 3x longer than the straight line.
- **Sound.** `scripts/make-sfx.ts` synthesises every effect (oscillators, envelopes, filtered noise) as a small
  16-bit mono WAV, and `src/audio/sfx.ts` plays them with Howler. Haptics are in `src/audio/haptics.ts`.
- **Mini-games.** Each stop's game lives in `src/games/<stop>/` and uses the shared kit in `src/games/kit/`
  (see its README).
- The full design and milestone history is in `docs/PLAN.md`.

## Deploy (GitHub Pages)

Pushes to `main` run `.github/workflows/deploy.yml`, which builds with Vite (`base: '/san-carlos-treasure-quest/'`)
and publishes `dist/`. In the repository go to **Settings > Pages** and set **Source** to **GitHub Actions**. The game
is then served at `https://<user>.github.io/san-carlos-treasure-quest/`. If you rename the repo, change `base` in
`vite.config.ts`.

## Credits and attributions

- Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under the ODbL.
- Map tiles and style: [OpenFreeMap](https://openfreemap.org); schema by [OpenMapTiles](https://openmaptiles.org).
- Terrain: Mapzen / AWS [Terrain Tiles](https://registry.opendata.aws/terrain-tiles/).
- Map engine: [MapLibre GL JS](https://maplibre.org). Animation: [GSAP](https://gsap.com). Sound: [Howler.js](https://howlerjs.com).
- Line math: [Turf.js](https://turfjs.org). UI: React. Fonts: Lilita One and Rubik via Google Fonts (SIL Open Font License).
- Sound effects are synthesised in this repository by `scripts/make-sfx.ts`; no recordings or samples are used.
- All artwork (explorer, markers, mini-game scenes, treasure map, chest) is original and drawn as inline SVG.
