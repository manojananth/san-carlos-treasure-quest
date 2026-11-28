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

---

# Milestone 2 plan — riddle flow, XP, save/load

## Player loop
Profile pick → (new run) story intro at Base Camp → **stop challenge** (M2: placeholder mini-game; M3 replaces) →
earn stars (1–3) + a map fragment → **riddle** for the next stop (3 choices, hint costs XP) → correct answer lifts the
fog: marker + trail leg appear, camera flies to it, then flies back → **Walk** → arrive → challenge … After Summit
Outpost: optional bonus riddle for Sky Hangar, or go to the finale (M4; M2 shows a run-summary card).

## State (src/state/)
- `types.ts`: Difficulty `'rookie'|'pro'|'legend'`; `Profile {id,name,avatar,difficulty,run,best,badges,createdAt}`;
  `Run {phase, at, unlocked: StopId[], riddles: Record<StopId,{tries,hinted,firstTry}>, stars: Partial<Record<StopId,1|2|3>>,
  fragments: StopId[], xp, startedAt, finishedAt?}`; `phase: 'intro'|'challenge'|'riddle'|'travel'|'walking'|'summary'`.
- `reducer.ts`: pure reducer + action types (selectProfile, createProfile, deleteProfile, setDifficulty, startRun,
  finishChallenge(stars), answerRiddle(choice), useHint, arrive, skipBonus, resetRun). XP and badge rules live here.
- `storage.ts`: localStorage key `scq.save.v1`, `{version:1, profiles[≤4], activeId, settings}`; every access wrapped in
  try/catch; schema-checked load with fallback to fresh; saved after every action (debounced 200 ms).
- `GameContext.tsx`: provider with useReducer + persistence.
- Unit tests with Vitest for the reducer (XP math, hint cost, unlock order, badges, 4-profile cap, load of corrupt data).

## Rules
| | Rookie | Pro | Legend |
|---|---|---|---|
| riddle text tier | easy | medium | hard |
| riddle timer | none | 60 s | 35 s (expiry = counts as a wrong try) |
| hint cost | 5 XP | 10 XP | 20 XP |
| XP multiplier | 1.0 | 1.25 | 1.5 |
| mini-game `timeScale` (for M3) | 1.3 | 1.0 | 0.75 |
Riddle XP: 30 first try, 15 second, 5 after; wrong choice greys out. Challenge: stars × 20 XP. Never below 0 XP.
Badges: First Clue, Sharp Mind (3 first-try riddles in one run), No Peeking (finish main stops with no hints),
Star Collector (≥15 stars in a run), Sky High (bonus stop), Trailblazer (finish a run), Legend of San Carlos
(finish on Legend). Badges persist on the profile.

## Map changes (GameMap)
- Locked markers are hidden (display none), and trail legs to locked stops are filtered out of the trail layers.
- `flyTo(stopIndex)` → `Promise`, uses `map.flyTo` (zoom 16, pitch 62); reduced motion → `jumpTo`.
- Arrival is driven by app state; the M1 "Walk to next stop"/Reset dev controls go away (Reset moves into the menu).

## UI (React, mobile-first)
ProfileScreen (≤4 cards with avatar + name + XP, create with name + pick one of 6 hat colours, delete with confirm),
HUD (avatar, XP counter that ticks with GSAP, star total, fragments x/6, menu button), StoryCard, StopCard
(arrival + "Start challenge"), placeholder coin-tap challenge (removed in M4) (tap 10 gold coins before time runs out; stars by time; uses
timeScale), RiddleCard (question, 3 big choices, hint button showing cost, timer bar), UnlockToast,
SummaryCard, Menu sheet (difficulty, badges, leaderboard, switch player, restart run), Leaderboard (profiles on
this device by best XP, stars, badges). Focus management + Esc closes sheets; all buttons ≥ 44 px.
Riddle and stop content in `src/data/riddles.ts` (3 tiers per stop) and `src/data/facts.ts` (for the M3 quiz).

### M2 implementation notes
- Extra reducer actions beyond the plan: `continueIntro`, `cancelWalk`, `riddleTimeout` (counts as a wrong try).
- `Run.earned` (badges earned this run), `RiddleState.wrong` (greyed choices; cleared when difficulty changes mid-riddle),
  `Run.mixed` (difficulty changed mid-run: Legend badge is not awarded).
- Hiller (Sky High) finish gives a flat +40 XP bonus (scaled by the XP multiplier).
- Save files with `version > 1` are ignored and never overwritten. An active profile without a valid run is deselected on load.
- Known gap (accepted for now): the riddle timer restarts from full on reload.
- Mini-game contract: props (`difficulty`, `timeScale`) are fixed at mount (snapshotted in ChallengeFlow); games must honor `paused`.

---

# Milestone 3 plan — mini-games

## Build order
1. **Kit + reference game** (one builder): `src/games/kit/` and the Base Camp train game. Sets the pattern.
2. **Three builders in parallel**, each owning only its game folders: (Laurel + City Hall), (Burton + Highlands),
   (Big Canyon + Hiller). Nobody but the coordinator edits `registry.ts`, `App.tsx` or `src/state/`.
3. Review, then cheaper models fix.

## Kit (`src/games/kit/`)
- `MiniGameShell`: phases `howto → countdown (3-2-1, skipped under reduced motion) → play → result`. How-to card:
  one-line goal + a small illustrated diagram + "Let's go!" button. Result: 1–3 animated stars, a one-line
  cheer, "Continue" → `onFinish(stars)`. The shell owns the result screen so games only report a score.
- `usePausableClock(paused)`: elapsed ms that freezes while `paused`; `useCountdown(totalMs, paused, onEnd)`.
- `usePointerDrag(ref, {onStart,onMove,onEnd})`: pointer events + `setPointerCapture`, `touch-action: none`;
  works for mouse, touch and pen.
- `starsFor(score, [two, three])` helper; `useReducedMotion()`; `Stage` component: responsive SVG stage with a fixed
  viewBox (e.g. 400×300) so games draw in game units and scale to portrait and landscape.
- Uses `sfx()` and `buzz()` (still no-ops / short vibrations) at hit, miss, win.
- Art: original inline SVG in the M1/M2 style (ink outlines, red/teal/gold, chunky shapes). No sprites from
  outside the repo. Sports stay generic: no league, team or driver names, numbers or logos.

## Game contract
`ComponentType<ChallengeProps>` (props fixed at mount except `paused`). 20–45 s of play. `timeScale` stretches time
limits (Rookie 1.3, Legend 0.75); difficulty may also change targets. While `paused`: freeze clocks, animations and
input. Every game must be winnable by touch alone, keyboard-operable where practical (at minimum the shell buttons),
and playable under reduced motion (no shaking, no flashing; the reaction game uses a non-flashing light sequence).
Never fail with 0 stars: a finished attempt earns at least 1.

## Games
| Stop | Game | Mechanic | Stars |
|---|---|---|---|
| depot | Couple the cars | Drag 4–6 shuffled cars (loco, tender, mail, passenger, caboose…) onto rail slots in the right order; cars snap and couple with a clank; numbered or picture hints on Rookie | by time + wrong drops |
| laurel | Spot 5 + lights out | Part 1: find 5 hidden items (gold coin, compass, old ticket, key, lantern) in an illustrated street scene of shop fronts, awnings, café tables; tap to circle. Part 2: race-car start: 5 red lights come on one by one, go out at a random moment, tap GO; early tap = jump start, retry once | items found × time, plus reaction ms |
| cityhall | Hall of Scrolls quiz | 5 questions from `src/data/facts.ts` (shuffled, choices shuffled), as unrolling scrolls; timer per question scaled by timeScale | correct answers |
| burton | Field-goal kick | Drag back from the ball to aim and set power (slingshot); wind arrow on Pro/Legend; ball flies in a 2.5D arc to the uprights; 5 kicks | goals made |
| bigcanyon | Race up the canyon | Explorer runs up a winding side-scrolling trail; tap/hold to run, tap to jump roots and rocks, collect echo-gems; beat the clock to the summit marker | finish time + stumbles |
| highlands | Penalty shootout | 5 shots: drag/flick to aim at the goal; the goalie dives with a tell; Legend goalie is quicker | goals scored |
| hiller (bonus) | Paper-plane glide | Pick launch angle + power; glide over the hangar floor, tap to nudge up (limited); land through rings for points | distance + rings |

---

# Milestone 4 plan — finale, sound, polish, deploy

## Finale (builder A)
- New run phase `finale` after Summit Outpost (bonus skipped) or after Sky Hangar. Flow: "Return to Base Camp" card →
  explorer walks back to the depot along prebuilt legs `highlands>depot` and `hiller>depot` (add to
  `scripts/build-routes.ts`, regenerate `routes.json`) → **fragment puzzle**: the 6 collected fragments are pieces of
  an original illustrated treasure map of San Carlos (hills west, Bay east, the six stops as icons, a red X by the
  depot). Drag each piece (kit `usePointerDrag`) into a 3×2 frame; pieces snap when within tolerance; keyboard
  path like Base Camp → **chest**: an original SVG chest by the depot; lid opens (GSAP), gold coins burst out and
  arc into a pile, confetti → **final summary**: XP, stars, badges earned, best-ever marker, Play again.
- Treasure XP bonus: +100 × multiplier, awarded once per run. New badge **Treasure Finder** (open the chest).
- Reduced motion: no confetti or coin burst; lid simply opens and a coin pile fades in.
- Fix the M2 known gap: persist `deadlineAt` for timed riddles so a reload no longer resets the timer.

## Sound & polish (builder B)
- Howler.js. Original sound effects synthesised at build time by `scripts/make-sfx.ts` (oscillators + envelopes +
  noise, written as small mono WAVs to `public/sfx/`, committed) — no downloaded audio. Names: the existing
  `SfxName` list plus `clank`, `whoosh`, `kick`, `cheer`, `chest`, `coins`, `tick`, `go`.
- `sfx(name)` plays through one Howler sprite or individual Howls, lazy-unlocked on first user gesture
  (iOS), respects mute, never throws. Mute toggle button in the HUD (speaker icon, aria-pressed) and in the menu,
  stored in `settings.muted` via a new `setMuted` action.
- Haptics: audit `buzz()` patterns (short tap 10 ms, success [20,40,20], fail 60); skip when muted? No — haptics
  follow a separate "Vibration" toggle in the menu (default on), stored in `settings.haptics`.
- Reduced-motion audit across the whole app (map flights, walks, XP ticker, toasts, sheets, all games, finale).
- README: how to play, controls, credits/attributions, dev scripts.

### M4 finale implementation notes
- Run phase `finale` with `finaleStep`: `return` (card) -> `walking` -> `puzzle` -> `chest` -> `done` (chest open, XP paid) -> phase `summary`.
  Actions: `startFinaleWalk`, `cancelFinaleWalk`, `arriveDepot`, `puzzleSolved`, `openChest`, `showSummary`. Finishing the last stop (or `skipBonus`) now
  enters the finale; `finishedAt`, best, Trailblazer / No Peeking / Legend and the new Treasure Finder badge are awarded at `openChest`
  (`Run.treasure`, `Run.newBest`). Treasure XP = round(100 x multiplier), once.
- Reload mid-finale: a walk in flight resumes at the `return` card (explorer back at the stop it left); `puzzle` and `chest` resume as they were
  (the puzzle itself restarts); `done` resumes at the summary. A finale save without all six fragments is dropped.
- The return leg (`highlands>depot` or `hiller>depot`) joins the trail legs when the finale starts.
- Timed riddles persist their clock: `RiddleState.deadlineAt` (running) / `remainingMs` (paused by the menu) via the `riddleClock` action; on
  reload the timer resumes (min 5 s grace, never above full). The M2 known gap is closed.
- Code: `src/finale/` (puzzle.ts logic, mapArt.tsx, FragmentPuzzle, TreasureChest, Confetti, ReturnCard); final summary is `components/SummaryCard.tsx`.

---

# Milestone 5 plan — harder, more fun (owner feedback after M4)

Feedback: "levels, riddles and puzzles need to be harder; make it more fun"; audio failed on iPhone/iPad (fixed:
gesture-retry unlock + `navigator.audioSession.type = 'playback'` for the silent switch). Owner chose: an expert
4th level, new riddle types, hidden secrets on the map, unlockable explorer gear.

## Phase 1 — foundation + Treasure Hunter level (one builder)
- `Difficulty` gains `'hunter'` ("Treasure Hunter"): riddle tier `expert`, riddle timer 25 s, hint 30 XP, XP ×2.0,
  timeScale 0.6. Badge `master-hunter` ("Master Treasure Hunter": finish a run on Treasure Hunter, not mixed).
  Difficulty pickers show 4 options.
- Every mini-game gets a real Treasure Hunter twist (not just a shorter clock):
  depot 7 cars + cryptic clue card, no slot silhouettes; laurel 7 items incl. 2 tiny ones, lights-out best of 2 with
  < 350 ms needed for full marks; cityhall 7 questions, 10 s each, 4 choices where available; burton 20–45 yd,
  gusting wind that changes mid-flight, no aim guide; bigcanyon more obstacles incl. double-root gaps that need
  well-timed jumps; highlands goalie reads 45 %, tell halved, corners narrower; hiller no updrafts and rings that
  bob up and down; finale puzzle on Hunter: pieces start rotated (tap/R to rotate) and carry no labels.
- Riddle engine generalised: `answerRiddle { correct: boolean; mark?: string }`, `RiddleState.wrong: string[]`
  (choice index, tapped spot, guessed word…), `Run.seed` picks riddles from a pool so replays differ and reloads
  are stable. Riddle content keeps working unchanged until phase 2 swaps it.
- Profile economy: `coins`, `gear { owned: string[]; equipped: { hat?, pack?, pet? } }`, `spikes: string[]`.
  Coins: 5 per star, 5 per first-try riddle, 15 per golden spike, 50 for the chest (× nothing; coins are flat).
  Actions `buyItem`, `equip`, `findSpike`. Catalog ids/prices in `src/data/gear.ts` (art comes in phase 2), spike ids
  in `src/data/spikes.ts` (positions in phase 2). Badge `spike-collector` (all 8 spikes). HUD shows coins.
- Tests for all of it; old saves load (missing fields default).

## Phase 2 — three builders in parallel
- **Riddles** (`src/riddles/*`, `RiddleCard`, `src/data/riddles.ts`, a small `src/map/pick.ts` hook used by GameMap):
  pool of ≥ 3 riddles per stop per tier and four kinds — *choice* (4 options, real-place distractors), *map*
  (tap the right spot on the real map; radius shrinks with difficulty), *cipher* (decoder wheel: rotate a
  Caesar wheel to decode a railroad-telegraph message, then answer), *scramble* (drag letter tiles to spell the
  place). Mix per tier: Rookie choice/scramble, Pro + cipher, Legend + map, Hunter all four with harder content.
  Hints are kind-specific (e.g. map hint draws a circle, cipher hint reveals the shift).
- **Golden spikes** (`src/map/secrets.ts`, `src/data/spikes.ts`, a small hook in GameMap): 8 spikes at real spots
  near unlocked trails, only visible when zoomed in (≥ 15.3) with a faint glint; tap to collect (sound, coins,
  toast, count). Found spikes persist per profile.
- **Explorer gear** (`src/gear/*`, explorer SVG layers, a Shop sheet from the menu and profile screen): 5 hats,
  4 backpacks, 4 trail pets (a pet trots beside the explorer on the map), original SVG art, prices 40–500 coins (coins scale ×1.5 on Legend, ×2 on Treasure Hunter).
  Equipped gear shows on the map explorer, the HUD avatar and the profile card.

### M5 foundation (phase 1, implemented)
Everything below is in place; phase 2 builders extend it without touching these contracts.

**Difficulty / rules** (`src/state/rules.ts`, `types.ts`)
- `Difficulty` = `'rookie' | 'pro' | 'legend' | 'hunter'`; `DIFFICULTIES` lists all four (pickers render a 2x2 grid). `DIFFICULTY.hunter`:
  label "Treasure Hunter", tier `expert`, riddle timer 25 s, hint 30 XP, XP x2.0, `timeScale` 0.6.
- `Tier` (`src/data/riddles.ts`) = `'easy' | 'medium' | 'hard' | 'expert'`; `ContentTier` is the three with written content.
  `getRiddle(stop, tier, seed?)` maps `expert` to the `hard` riddle until phase 2 writes expert content; `seed` is accepted but unused yet.
- Badges: `master-hunter` (finish a run on hunter, not `mixed`) and `spike-collector` (all `SPIKES`, awarded in `findSpike`). `BADGES`, `BADGE_IDS` (rules.ts).
- Coin constants (flat, no multiplier): `COIN_PER_STAR` 5, `COIN_FIRST_TRY_RIDDLE` 5, `COIN_SPIKE` 15, `COIN_CHEST` 50.

**Riddle engine** (`reducer.ts`, `RiddleCard.tsx`)
- `answerRiddle { correct: boolean; mark?: string }`: the UI judges correctness. A wrong answer costs a try and, when `mark` is given,
  pushes it to `RiddleState.wrong: string[]` (a repeated mark is ignored, so double taps never cost two tries). A correct answer unlocks the next
  stop. `RiddleCard` builds `mark = String(choiceIndex)`; other kinds should use their own mark (tapped spot id, guessed word...).
- `Run.seed: number` (31-bit, `seedFrom(now)`, set by `newRun` for createProfile / startRun / resetRun / selectProfile). Use it to pick a riddle from
  a pool deterministically: `getRiddle(stop, tier, run.seed)`; App already passes it.
- Storage migration (`storage.ts`, save version stays 1): numeric `wrong` becomes strings, a missing `seed` is derived from `startedAt`, missing
  `coins`/`gear`/`spikes` default to 0 / empty; unknown gear or spike ids and un-owned or wrong-slot equips are dropped.

**Economy and collections** (`Profile` in `types.ts`)
- `Profile.coins` (persist across runs), `Profile.gear { owned: string[]; equipped: { hat?; pack?; pet? } }`, `Profile.spikes: string[]`.
- Actions: `buyItem { id }` (catalog price, enough coins, not already owned), `equip { slot, id | null }` (must be owned and match the slot;
  `null` unequips), `findSpike { id }` (known id, once per profile, +15 coins; the 8th also awards `spike-collector` into `run.earned` and `badges`).
  Coins also come from `finishChallenge` (5 per star), a first-try riddle (5) and `openChest` (50).
- Catalog `src/data/gear.ts`: `GEAR` (5 hats, 4 packs, 4 pets, ids like `hat-crown`, `pet-pup`, prices 40-500), `GearSlot`, `gearItem(id)`, `isGearId`,
  `gearBySlot(slot)`, `GEAR_SLOTS`, `SLOT_LABEL`. Spikes `src/data/spikes.ts`: `SPIKES` (8, `lonLat: null` until phase 2), `spikeDef(id)`, `isSpikeId`.
- UI: HUD has a coin pill (`data-testid="coins"`, compact chips so it fits 390 px even with 4-digit values). App shows a `spike` toast when
  `profile.spikes` grows (`spikeName(id)` from reducer.ts), so a map hook only has to dispatch `findSpike`.

**Treasure Hunter twists** (each game reads `difficulty === 'hunter'`; Rookie/Pro/Legend are unchanged)
| game | Hunter twist |
|---|---|
| depot | 7 cars (new `tanker` car art), riddling clue card, no silhouettes; 58 s x 0.6 = 34.8 s, stars at 10 / 30 |
| laurel | 7 items incl. tiny brass button + ruby tie pin (tap radius 14 vs 22); 55 s x 0.6, wrong tap -3 s; lights out twice, best start counts: < 350 ms = 3 pts for 3 stars (`scoreFor(..., hunter)`) |
| cityhall | 7 scrolls, 10 s fixed per scroll, 4 choices (`Fact.quiz.decoy` is the extra wrong answer), keys 1-4, 3 stars at 6 right |
| burton | 20 / 27 / 33 / 39 / 45 yd, no aim guide, NOW wind 1.6-2.6 plus a GUST (`simulate(..., gust)`) that switches wind at 0.8-1.3 s of flight; pill shows both |
| bigcanyon | `HUNTER_COURSE`: 17 obstacles, 4 doubles 58-62 apart (land in the gap, jump again), 45 s x 0.6 = 27 s, `courseFor(difficulty)` |
| highlands | goalie reads 45 % of shots, lean hold halved (`TELL`), corner zones inset 13 units (`EDGE`) so shots near a post or the bar are wide / over |
| hiller | no updrafts (`NUDGES.hunter = 0`), rings bob +-22 around `BOB_Y` every 2.6 s (`ringY(i, clock)`; the bob clock runs with the game loop so pause freezes it) |
| finale | `FragmentPuzzle difficulty="hunter"`: every piece starts turned 90 / 180 / 270 degrees, no labels or slot ghosts; gold turn badge or `R` rotates; a piece counts when in its slot AND upright (`isSolved`) |
