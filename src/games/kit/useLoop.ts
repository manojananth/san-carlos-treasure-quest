import { useEffect, useRef } from 'react';

/** Fixed simulation step (seconds). */
export const FIXED_DT = 1 / 60;
/** One animation frame never advances the sim by more than this (a slow frame just runs the game a little slower). */
const MAX_FRAME = 0.25;
const MAX_STEPS = Math.ceil(MAX_FRAME / FIXED_DT);

/**
 * Pausable requestAnimationFrame loop with a fixed timestep.
 * `onStep(dt)` runs zero or more times per frame with dt = FIXED_DT; `onFrame()` runs once per frame after the steps
 * (draw there). While `running` is false nothing is scheduled at all. When it turns true again the first frame only
 * resets the clock (dt = 0), so nothing jumps after a pause. Pass `!api.active` logic as `running = api.active`.
 */
export function useLoop(onStep: (dt: number) => void, onFrame: () => void, running: boolean): void {
  const stepRef = useRef(onStep);
  const frameRef = useRef(onFrame);
  stepRef.current = onStep;
  frameRef.current = onFrame;

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last: number | null = null;
    let acc = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now(); // wall clock: rAF timestamps can lag when a page is slow
      if (last === null) { last = now; frameRef.current(); return; }
      const dt = Math.min(MAX_FRAME, Math.max(0, (now - last) / 1000));
      last = now;
      acc += dt;
      let n = 0;
      while (acc >= FIXED_DT && n < MAX_STEPS) { stepRef.current(FIXED_DT); acc -= FIXED_DT; n++; }
      if (n >= MAX_STEPS) acc = 0;
      frameRef.current();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);
}
