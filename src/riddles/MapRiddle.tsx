import { useEffect, useLayoutEffect, useRef } from 'react';
import type { LonLat } from '../data/stops';
import type { MapRiddle as Model } from './types';
import type { KindProps } from './kinds';
import type { PickHandle, PickOptions } from '../map/pick';
import { distanceM, isHit, pickMark } from './geo';

interface Props extends KindProps<Model> {
  /** start pick mode on the real map */
  pick?: (o: PickOptions) => PickHandle;
  /** "Riddle" / "Bonus riddle" */
  label: string;
  /** the map has loaded; framing waits for it */
  mapReady?: boolean;
}

const nice = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m / 50) * 50 || 50} m`);

/**
 * The card shrinks to a slim banner so the map stays usable: pan and zoom as usual, tap a spot to answer.
 * Stops that are still locked stay hidden, so the player has to read the map (streets, parks, water).
 */
export function MapRiddle({ riddle, hinted, paused, solved, judge, head, foot, pick, label, mapReady }: Props) {
  const banner = useRef<HTMLDivElement>(null);
  const pad = useRef(0);
  const framed = useRef(false);
  const handle = useRef<PickHandle | null>(null);
  const live = useRef({ paused, solved });
  live.current = { paused, solved };
  const judgeRef = useRef(judge);
  judgeRef.current = judge;

  useLayoutEffect(() => {
    const el = banner.current;
    if (!el) return;
    const measure = () => {
      pad.current = Math.ceil(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--banner-h', `${pad.current}px`);
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => { ro?.disconnect(); document.documentElement.style.removeProperty('--banner-h'); };
  }, []);

  useEffect(() => {
    if (!pick) return;
    const h = pick({
      padding: { bottom: pad.current + 24 },
      frame: !framed.current,
      hintCircle: hinted ? { center: riddle.hintCenter, radiusM: riddle.hintRadiusM } : undefined,
      onPick: (ll: LonLat) => {
        if (live.current.solved || live.current.paused) return;
        const d = distanceM(ll, riddle.target);
        const ok = isHit(ll, riddle.target, riddle.radiusM);
        handle.current?.mark(ok);
        const msg = d < riddle.radiusM * 2.5 ? `So close! About ${nice(d)} away. Try again!` : `Not here. About ${nice(d)} away. Try again!`;
        judgeRef.current(ok, pickMark(ll), msg);
      },
    });
    framed.current = !!mapReady;
    handle.current = h;
    return () => { h(); handle.current = null; };
    // re-start only when the hint circle appears (the pad is read once at start)
  }, [hinted, pick, riddle.id, mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="riddle-banner" ref={banner} aria-label={label}>
      <h2 className="banner-title">{label}: <span>tap the map!</span></h2>
      {head}
      {foot}
    </section>
  );
}
