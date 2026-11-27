import { useCallback, useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * A GSAP master timeline that follows `paused`. Create every tween through `tween()` (instead of `gsap.to`)
 * and they all freeze and resume together. Other animations on the page (HUD, map) are not touched.
 * Never call `tween()` while paused; games block input when paused, so that cannot happen.
 */
export function usePausableTimeline(paused: boolean) {
  const tl = useRef<gsap.core.Timeline | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const get = useCallback(() => {
    if (!tl.current) {
      tl.current = gsap.timeline({ paused: pausedRef.current });
      tl.current.to({}, { duration: 36000 }); // keeps the playhead alive so tweens added "now" really play
    }
    return tl.current;
  }, []);

  useEffect(() => {
    get().paused(paused);
  }, [paused, get]);
  useEffect(() => () => { tl.current?.kill(); tl.current = null; }, []);

  /** like gsap.to(target, vars), but owned by this timeline */
  const tween = useCallback((target: gsap.TweenTarget, vars: gsap.TweenVars) => {
    const t = get();
    const tw = gsap.to(target, vars);
    t.add(tw, t.time());
    return tw;
  }, [get]);
  /** run a prepared tween / nested timeline (e.g. `gsap.timeline().to(...).to(...)`) on this timeline, starting now */
  const add = useCallback((child: gsap.core.Animation) => {
    const t = get();
    t.add(child, t.time());
    return child;
  }, [get]);
  /** stop the running tweens of a target (e.g. before starting a new one on the same element) */
  const killTweensOf = useCallback((target: gsap.TweenTarget) => { gsap.killTweensOf(target); }, []);
  return { tween, add, killTweensOf };
}
