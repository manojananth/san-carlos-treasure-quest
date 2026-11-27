# Mini-game kit

Shared pieces for every stop's game. Reference implementation: `../depot/CoupleTheCars.tsx` (+ `trainArt.tsx`, `CoupleTheCars.css`). Copy its structure.

## Building a game

A game is a `ComponentType<ChallengeProps>` (`difficulty`, `timeScale`, `onFinish`, `paused`). Props are fixed at mount except `paused`.

```tsx
export function MyGame({ difficulty, timeScale, onFinish, paused = false }: ChallengeProps) {
  return (
    <MiniGameShell goal="One line telling the kid what to do." diagram={<HowToDiagram />} paused={paused} onFinish={onFinish}>
      {(api) => <Play difficulty={difficulty} timeScale={timeScale} api={api} />}
    </MiniGameShell>
  );
}
```

`MiniGameShell` owns `howto -> countdown (3-2-1, skipped under reduced motion) -> play -> result`. Your game only draws itself and calls `api.finish(stars, cheer?)` once. The shell shows the stars, the cheer and a Continue button, then calls `onFinish(stars)`.
Your component is mounted from the start (so it has its final size behind the how-to card) but is `inert` until play begins. Mark the element that should get focus when play starts with `data-game-focus`.

| Piece | Use |
|---|---|
| `Stage` (`ref`, `width`, `height`, `label`) | responsive SVG with a fixed viewBox (draw in game units). `clientToStage(svg, x, y)` converts pointer coordinates |
| `usePausableClock(paused)` | `{ elapsedMs, getElapsed() }`, freezes while paused |
| `useCountdown(totalMs, paused, onEnd)` | `{ remainingMs, fraction, getRemaining, getElapsed }`, calls `onEnd` once at 0 |
| `usePausableTimeline(paused)` | `{ tween(target, vars), add(animation), killTweensOf(target) }`, one GSAP master timeline that pauses/resumes with the game |
| `usePointerDrag(ref, { onStart, onMove, onEnd }, enabled?)` | mouse/touch/pen via pointer events + `setPointerCapture`, sets `touch-action: none`. One container, many draggables (`info.target.closest(...)`). `onStart` returns `false` to refuse |
| `starsFor(score, [two, three], lowerIsBetter?)` | 1-3 stars, never below 1 |
| `useReducedMotion()` / `prefersReducedMotion()` | reduced-motion flag (hook / plain read) |
| `feedback.hit() / tick() / miss() / win(stars)` | `sfx()` + `buzz()` pairs. Use these, not the audio modules directly |
| CSS | `.mg-hud` (time bar row), `.mg-bar` / `.mg-bar-fill`, `.mg-stage` (set `--mg-stage-max` to cap the height) |

## The pause contract

The challenge is paused while the HUD Menu (or leaderboard) is open. While paused a game must:

1. freeze every clock: pass `!api.active` (shell phase is `play` and not paused) to `useCountdown` / `usePausableClock`;
2. freeze every GSAP animation: create tweens with `usePausableTimeline(!api.active).tween(...)` (never bare `gsap.to`, never `setTimeout` for game logic). Instant `gsap.set` is fine;
3. ignore input: check `api.active` in drag/keyboard handlers, and put back anything the player is holding when it turns false.

Never start a new tween while paused. If something must keep its own clock (e.g. a delay after the last move), pause only the timer bar, not the timeline, as `CoupleTheCars` does with its `locked` state.

## Stars

- Games report 1-3 stars with `api.finish`. A finished attempt always earns at least 1 star; a time-out is exactly 1 star.
- Compute one `score` (higher is better) and use `starsFor(score, [two, three])`. Depot: `score = % of time left - 10 x mistakes`, thresholds `[15, 40]`.
- Scale time limits with `timeScale` (Rookie 1.3, Pro 1, Legend 0.75). Difficulty may also change counts and hints (depot: 4/5/6 cars; Rookie shadows, Pro/Legend clue card).
- 20-45 s of play. The cheer line is optional; the default is generic.

## Art style

Original inline SVG only (no images, no sprites from elsewhere). Chunky shapes, ink outline (`#1b2430`, 2 units), palette: trail-sign red `#c8372d`, sky teal `#2ba8a4`, gold `#f2b632`, paper `#fff7e3` (see `:root` in `src/styles.css`). Headings Lilita One, text Rubik. Draw each movable piece around its own `(0,0)` so GSAP can position and rotate it. Sports stay generic: no league, team, driver names, numbers or logos.

## Accessibility and reduced motion

- Every movable thing is a focusable element (`role="button"`, `tabIndex=0`, an `aria-label`) with a visible `:focus-visible` ring. Winnable by touch alone and, where practical, by keyboard (depot: Enter/Space picks a car, arrows choose a slot, Enter drops, Esc puts back). Announce progress through an `sr-only` `role="status"` element.
- Touch targets: keep real hit areas at least ~44 px on a 390 px wide phone (add a transparent padded hit rect).
- Under `prefers-reduced-motion`: no shaking, no flashing, no springy overshoot; use short plain tweens or instant moves, no confetti. The shell skips the countdown.
- Layout: the game must fit inside the challenge Sheet without scrolling its play area on 390x844, 1280x800 and 844x390. Stack on portrait; on short landscape (`max-height: 520px`) place side panels next to the stage.

## Testing

- Add `?debug` to the URL: `window.__game = { dispatch, state }` and a "skip challenge (3 stars)" button appear. Create a profile, pick the difficulty on the create form, press "Let's go!" then "Start challenge".
- Run `npm run build && npm run preview` and drive it with Playwright (`chromium.launch` with `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`). The map makes the page slow under software GL, so real `page.mouse` drags work but CDP touch events are very slow: for touch, dispatch `PointerEvent`s (`pointerType: 'touch'`) from `page.evaluate`.
- Check: complete on Rookie and Legend, open the HUD Menu mid-game and confirm the time bar freezes, keyboard-only completion, `emulateMedia({ reducedMotion: 'reduce' })`, and no scrollbar inside `.sheet` in all three viewports.
