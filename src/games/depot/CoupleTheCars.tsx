import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import type { ChallengeProps } from '../types';
import type { Difficulty } from '../../state/types';
import {
  MiniGameShell, Stage, clientToStage, feedback, starsFor, useCountdown, usePausableTimeline, usePointerDrag,
} from '../kit';
import type { ShellApi } from '../kit';
import { CAR_H, CAR_NAMES, CAR_W, CarArt, GOLD, INK, LOCO_W, LocoArt, PAPER, RED, TEAL, TEAL_DARK } from './trainArt';
import type { CarKind } from './trainArt';
import './CoupleTheCars.css';

// ---------------------------------------------------------------- level data
/** the correct order behind the locomotive; each level uses the first N, so Pro/Legend add cars */
const ORDER: Record<Difficulty, CarKind[]> = {
  rookie: ['tender', 'mail', 'passenger', 'caboose'],
  pro: ['tender', 'mail', 'passenger', 'coach', 'caboose'],
  legend: ['tender', 'mail', 'passenger', 'coach', 'freight', 'caboose'],
};

/** Pro and Legend have no silhouettes: the order comes from this clue card instead */
const CLUES: Record<Difficulty, string[] | null> = {
  rookie: null,
  pro: [
    'The black tender hooks on right behind the locomotive.',
    'The gold mail car rides right behind the tender.',
    'The cream coach comes right after the teal passenger car.',
    'The red caboose always brings up the rear.',
  ],
  legend: [
    'The mail car rides right behind the tender, and the tender is the very first car.',
    'The teal passenger car sits right in front of the cream coach.',
    'The brown freight car rolls right in front of the caboose.',
    'The caboose waves goodbye at the very end.',
  ],
};

const GOALS: Record<Difficulty, string> = {
  rookie: 'Drag each car onto its numbered slot behind the locomotive. Match the shadows!',
  pro: 'Drag each car onto its numbered slot behind the locomotive. Read the clue card to get the order.',
  legend: 'Build the whole train in the right order using only the clue card. Be quick!',
};

const BASE_SECONDS = 45;
const STAR_SCORE: [number, number] = [15, 40]; // score = % of time left - 10 per mistake

// ---------------------------------------------------------------- stage geometry (game units)
const W = 400;
const H = 280;
const ROW_Y = 108; // centre line of the train
const RAIL_DY = 19; // wheels end 19 local units below the centre

interface Layout {
  c: number; // car width in game units
  s: number; // art scale
  slotX: number[];
  locoX: number;
  locoScale: number;
}

function layoutFor(n: number): Layout {
  const c = Math.floor((388 - 3 * n) / (n + 1.35));
  const s = c / CAR_W;
  const locoW = 1.35 * c;
  const x0 = 6 + locoW + 3;
  return { c, s, slotX: Array.from({ length: n }, (_, i) => x0 + i * (c + 3) + c / 2), locoX: 6 + locoW / 2, locoScale: locoW / LOCO_W };
}

interface Home { x: number; y: number; rot: number }

/** shuffled cars parked on two sidings; deterministic wobble so they look hand-placed */
function yardHomes(n: number): Home[] {
  const top = Math.ceil(n / 2);
  const rows = [{ y: 192, k: top }, { y: 248, k: n - top }];
  const out: Home[] = [];
  let i = 0;
  for (const r of rows) {
    for (let j = 0; j < r.k; j++, i++) {
      out.push({ x: 10 + (380 / r.k) * (j + 0.5), y: r.y + (i % 2 ? 2 : -2), rot: [-3, 2, -1.5, 3, -2, 1.5][i % 6] });
    }
  }
  return out;
}

function shuffled<T>(items: T[]): T[] {
  const a = items.slice();
  do {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  } while (a.every((v, i) => v === items[i])); // never start already solved
  return a;
}

// ---------------------------------------------------------------- how-to diagram
function HowToDiagram() {
  return (
    <svg viewBox="0 0 220 96" role="presentation">
      <rect x={1.5} y={1.5} width={217} height={93} rx={12} fill="#e8f6f4" stroke={INK} strokeWidth={3} />
      <line x1={8} y1={70} x2={212} y2={70} stroke={INK} strokeWidth={3} />
      <g transform="translate(40 48) scale(.62)"><LocoArt /></g>
      <g transform="translate(97 48) scale(.7)"><rect x={-30} y={-22} width={60} height={42} rx={6} fill="none" stroke={INK} strokeWidth={2.5} strokeDasharray="6 5" /></g>
      <g transform="translate(160 48) scale(.7)"><rect x={-30} y={-22} width={60} height={42} rx={6} fill="none" stroke={INK} strokeWidth={2.5} strokeDasharray="6 5" /></g>
      {[97, 160].map((x, i) => (
        <g key={x}>
          <circle cx={x} cy={83} r={9} fill={GOLD} stroke={INK} strokeWidth={2} />
          <text x={x} y={87.5} textAnchor="middle" fontFamily="'Lilita One', sans-serif" fontSize={13} fill={INK}>{i + 1}</text>
        </g>
      ))}
      <g transform="translate(124 24) scale(.5)"><CarArt kind="tender" /></g>
      <path d="M126 38 Q114 26 100 40" fill="none" stroke={RED} strokeWidth={3.5} strokeLinecap="round" />
      <path d="M100 40 L99 31 M100 40 L108 35" fill="none" stroke={RED} strokeWidth={3.5} strokeLinecap="round" />
    </svg>
  );
}

// ---------------------------------------------------------------- scenery
function Scenery({ lay, n }: { lay: Layout; n: number }) {
  const railY = ROW_Y + RAIL_DY * lay.s;
  const sidings = [192, 248].map((y) => y + RAIL_DY * lay.s);
  const gid = useId();
  return (
    <g>
      <defs>
        <linearGradient id={`${gid}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={TEAL} />
          <stop offset="1" stopColor="#e8f6f4" />
        </linearGradient>
      </defs>
      <rect width={W} height={142} fill={`url(#${gid}sky)`} />
      <circle cx={34} cy={28} r={13} fill={GOLD} stroke={INK} strokeWidth={2.5} />
      <path d="M70 34 q4 -10 14 -6 q6 -8 16 -2 q10 -2 10 8 z" fill="#fff" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      {/* the 1888 stone depot */}
      <rect x={146} y={30} width={236} height={30} fill="#d8c9a5" stroke={INK} strokeWidth={2.5} />
      {[38, 46, 54].map((y, r) => (
        <g key={y} stroke="#a8996f" strokeWidth={1.4}>
          <line x1={146} y1={y} x2={382} y2={y} />
          {Array.from({ length: 11 }, (_, i) => <line key={i} x1={158 + i * 22 + (r % 2) * 11} y1={y - 8} x2={158 + i * 22 + (r % 2) * 11} y2={y} />)}
        </g>
      ))}
      <path d="M138 31 L264 8 L390 31 Z" fill={RED} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M156 29 L264 12 L372 29" fill="none" stroke={GOLD} strokeWidth={2} />
      <rect x={210} y={36} width={108} height={15} rx={3} fill={PAPER} stroke={INK} strokeWidth={2} />
      <text x={264} y={47.6} textAnchor="middle" fontFamily="'Lilita One', 'Rubik', sans-serif" fontSize={11} fill={RED}>SAN CARLOS 1888</text>
      <path d="M160 60 V46 a9 9 0 0 1 18 0 V60 Z" fill={TEAL_DARK} stroke={INK} strokeWidth={2} />
      {[336, 360].map((x) => <rect key={x} x={x - 7} y={39} width={14} height={13} rx={2} fill={TEAL} stroke={INK} strokeWidth={2} />)}
      <rect x={130} y={58} width={262} height={7} fill="#b9ab8a" stroke={INK} strokeWidth={2} />
      {/* ground */}
      <rect y={142} width={W} height={H - 142} fill="#ecdcae" />
      <line x1={0} y1={142} x2={W} y2={142} stroke={INK} strokeWidth={2} />
      {[[30, 160], [90, 262], [330, 156], [372, 268], [250, 230], [140, 160]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r={2} fill="#cdb988" />)}
      {/* main line + yard sidings */}
      {[railY, ...sidings].map((y, i) => (
        <g key={y}>
          <line x1={0} y1={y + 5} x2={W} y2={y + 5} stroke="#8a5a33" strokeWidth={6} strokeDasharray="5 9" />
          <line x1={0} y1={y} x2={W} y2={y} stroke={INK} strokeWidth={i === 0 ? 3.5 : 3} />
        </g>
      ))}
      {/* slot numbers sit under the rail */}
      {lay.slotX.slice(0, n).map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={railY + 20} r={9.5} fill={GOLD} stroke={INK} strokeWidth={2} />
          <text className="cc-badge" x={x} y={railY + 25} textAnchor="middle" fontSize={14} fill={INK}>{i + 1}</text>
        </g>
      ))}
    </g>
  );
}

// ---------------------------------------------------------------- the game
interface CarState { kind: CarKind; order: number; home: Home; placed: boolean }

function Play({ difficulty, timeScale, api }: { difficulty: Difficulty; timeScale: number; api: ShellApi }) {
  const order = ORDER[difficulty];
  const n = order.length;
  const lay = useMemo(() => layoutFor(n), [n]);
  const clues = CLUES[difficulty];
  const totalMs = BASE_SECONDS * timeScale * 1000;

  // cars start shuffled in the yard
  const [cars] = useState<CarState[]>(() => {
    const homes = yardHomes(n);
    return shuffled(order).map((kind, i) => ({ kind, order: order.indexOf(kind), home: homes[i], placed: false }));
  });
  const byKind = useMemo(() => new Map(cars.map((c) => [c.kind, c])), [cars]);

  const [placedKinds, setPlacedKinds] = useState<CarKind[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [dragKind, setDragKind] = useState<CarKind | null>(null);
  const [hoverSlot, setHoverSlot] = useState<number | null>(null);
  const [badSlot, setBadSlot] = useState<number | null>(null);
  const [kb, setKb] = useState<{ kind: CarKind; slot: number } | null>(null);
  const [status, setStatus] = useState('');
  const [locked, setLocked] = useState(false); // all coupled: clock stops while the last clank plays

  const svgRef = useRef<SVGSVGElement>(null);
  const els = useRef<Partial<Record<CarKind, SVGGElement | null>>>({});
  const burstRef = useRef<SVGGElement>(null);
  const puffRef = useRef<SVGGElement>(null);
  const drag = useRef<{ kind: CarKind; ox: number; oy: number } | null>(null);
  const mistakesRef = useRef(0);
  const placedRef = useRef(0);
  const refocus = useRef(false);

  const clockPaused = !api.active || locked;
  const { tween, add, killTweensOf } = usePausableTimeline(!api.active);
  const reduced = api.reducedMotion;
  const lockedRef = useRef(false);
  lockedRef.current = locked;
  const { fraction, getRemaining } = useCountdown(totalMs, clockPaused, () => {
    if (!lockedRef.current) api.finish(1, "Time's up! The train is still in the yard. Try again!");
  });

  // park the cars in the yard before the first paint
  useLayoutEffect(() => {
    for (const c of cars) {
      const el = els.current[c.kind];
      if (el) gsap.set(el, { x: c.home.x, y: c.home.y, rotation: c.home.rot, scale: 1 });
    }
  }, [cars]);

  // gentle steam puffs from the stack (static under reduced motion)
  useEffect(() => {
    const el = puffRef.current;
    if (!el || reduced) return;
    const t = tween(el, { y: -16, opacity: 0, duration: 1.8, repeat: -1, ease: 'none' });
    gsap.set(el, { opacity: 0.9 });
    return () => { t.kill(); };
  }, [tween, reduced]);

  const slotPos = useCallback((i: number) => ({ x: lay.slotX[i], y: ROW_Y }), [lay]);

  const sendHome = useCallback((kind: CarKind, wobble: boolean) => {
    const el = els.current[kind];
    const h = byKind.get(kind)!.home;
    if (!el) return;
    killTweensOf(el);
    const to = { x: h.x, y: h.y, rotation: h.rot, scale: 1 };
    if (!api.active) gsap.set(el, to);
    else if (reduced) tween(el, { ...to, duration: 0.15, ease: 'power1.out' });
    else tween(el, { ...to, duration: wobble ? 0.7 : 0.35, ease: wobble ? 'elastic.out(1, 0.45)' : 'power2.out' });
  }, [api.active, byKind, killTweensOf, reduced, tween]);

  const couple = useCallback((kind: CarKind, slot: number) => {
    const el = els.current[kind];
    const car = byKind.get(kind)!;
    if (!el) return;
    car.placed = true;
    placedRef.current += 1;
    setPlacedKinds((p) => [...p, kind]);
    killTweensOf(el);
    const { x, y } = slotPos(slot);
    feedback.hit();
    setStatus(`${CAR_NAMES[kind]} coupled in slot ${slot + 1}.`);
    const done = placedRef.current >= n;
    if (done) setLocked(true);
    const end = () => {
      if (!done) return;
      const left = getRemaining() / totalMs;
      const score = left * 100 - mistakesRef.current * 10;
      const stars = starsFor(score, STAR_SCORE);
      const m = mistakesRef.current;
      const detail = m === 0 ? 'No mistakes!' : `${m} wrong ${m === 1 ? 'try' : 'tries'}.`;
      api.finish(stars, `${stars === 3 ? 'All aboard! ' : 'Train built! '}${detail}`);
    };
    if (reduced) {
      gsap.set(el, { x, y, rotation: 0, scale: 1 });
      tween({}, { duration: 0.2, onComplete: end });
      return;
    }
    // snap in, then a little "clank" squash and a gold ring at the coupler
    const tl = gsap.timeline({ onComplete: end });
    tl.to(el, { x, y, rotation: 0, scale: 1, duration: 0.22, ease: 'back.out(2.2)' })
      .to(el, { scaleX: 1.07, scaleY: 0.94, duration: 0.07, ease: 'power2.out' })
      .to(el, { scaleX: 1, scaleY: 1, duration: 0.18, ease: 'elastic.out(1, .5)' });
    add(tl);
    const b = burstRef.current;
    if (b) {
      gsap.set(b, { x: x - lay.c / 2 - 1, y: y + 8 * lay.s, scale: 0.3, opacity: 1, transformOrigin: '50% 50%' });
      tween(b, { scale: 1.5, opacity: 0, duration: 0.45, delay: 0.2, ease: 'power2.out' });
    }
  }, [add, api, byKind, getRemaining, killTweensOf, lay, n, reduced, slotPos, totalMs, tween]);

  /** the one place a car is offered to a slot: pointer drops and keyboard Enter both land here */
  const attempt = useCallback((kind: CarKind, slot: number | null) => {
    const car = byKind.get(kind)!;
    setHoverSlot(null);
    const taken = slot !== null && placedKinds.some((k) => byKind.get(k)!.order === slot);
    if (slot === null || taken || !api.active) { sendHome(kind, false); return; }
    if (slot === car.order) { couple(kind, slot); return; }
    mistakesRef.current += 1;
    setMistakes(mistakesRef.current);
    feedback.miss();
    setStatus(`Not slot ${slot + 1}. The ${CAR_NAMES[kind]} goes back to the yard.`);
    setBadSlot(slot);
    tween({}, { duration: 0.7, onComplete: () => setBadSlot((b) => (b === slot ? null : b)) });
    sendHome(kind, true);
  }, [api.active, byKind, couple, placedKinds, sendHome, tween]);

  const slotAt = useCallback((x: number, y: number): number | null => {
    if (Math.abs(y - ROW_Y) > 36) return null;
    let best: number | null = null;
    let bd = lay.c * 0.7;
    lay.slotX.forEach((sx, i) => {
      const d = Math.abs(sx - x);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }, [lay]);

  // ---- pointer drag (mouse, touch, pen)
  usePointerDrag(svgRef, {
    onStart: (i) => {
      if (!api.active) return false;
      const el = (i.target as Element | null)?.closest?.('[data-car]');
      const kind = el?.getAttribute('data-car') as CarKind | null;
      if (!kind || byKind.get(kind)!.placed || !svgRef.current) return false;
      const g = els.current[kind]!;
      const p = clientToStage(svgRef.current, i.x, i.y);
      killTweensOf(g);
      drag.current = { kind, ox: Number(gsap.getProperty(g, 'x')) - p.x, oy: Number(gsap.getProperty(g, 'y')) - p.y };
      setKb(null);
      setDragKind(kind);
      if (reduced) gsap.set(g, { scale: 1.08, rotation: 0 });
      else gsap.to(g, { scale: 1.1, rotation: 0, duration: 0.12 });
      return true;
    },
    onMove: (i) => {
      const d = drag.current;
      if (!d || !svgRef.current) return;
      const p = clientToStage(svgRef.current, i.x, i.y);
      const x = Math.min(W - 10, Math.max(10, p.x + d.ox));
      const y = Math.min(H - 10, Math.max(10, p.y + d.oy));
      gsap.set(els.current[d.kind]!, { x, y });
      const s = slotAt(x, y);
      setHoverSlot((h) => (h === s ? h : s));
    },
    onEnd: (_i, cancelled) => {
      const d = drag.current;
      drag.current = null;
      if (!d) return;
      setDragKind(null);
      const g = els.current[d.kind]!;
      const slot = cancelled ? null : slotAt(Number(gsap.getProperty(g, 'x')), Number(gsap.getProperty(g, 'y')));
      attempt(d.kind, slot);
    },
  });

  // a drag in flight when the game is paused (Menu opened) is put back
  useEffect(() => {
    const d = drag.current;
    if (api.active || !d) return;
    drag.current = null;
    setDragKind(null);
    setHoverSlot(null);
    const h = byKind.get(d.kind)!.home;
    gsap.set(els.current[d.kind]!, { x: h.x, y: h.y, rotation: h.rot, scale: 1 });
  }, [api.active, byKind]);

  // ---- keyboard: Enter/Space picks a car up, arrows choose a slot, Enter drops it, Esc puts it back
  const freeSlots = useMemo(
    () => lay.slotX.map((_, i) => i).filter((i) => !placedKinds.some((k) => byKind.get(k)!.order === i)),
    [lay, placedKinds, byKind],
  );
  const hover = (kind: CarKind, slot: number) => {
    const el = els.current[kind]!;
    const { x, y } = slotPos(slot);
    killTweensOf(el);
    if (reduced) gsap.set(el, { x, y: y - 8, rotation: 0, scale: 1.08 });
    else tween(el, { x, y: y - 8, rotation: 0, scale: 1.08, duration: 0.2, ease: 'power2.out' });
    setHoverSlot(slot);
  };
  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (!api.active) return;
    const kind = (e.target as Element).closest?.('[data-car]')?.getAttribute('data-car') as CarKind | null | undefined;
    if (!kind) return;
    const car = byKind.get(kind)!;
    const press = e.key === 'Enter' || e.key === ' ';
    if (press) e.preventDefault();
    if (car.placed) return;
    if (!kb || kb.kind !== kind) {
      if (!press) return;
      const first = freeSlots[0] ?? 0;
      setKb({ kind, slot: first });
      hover(kind, first);
      setStatus(`${CAR_NAMES[kind]} picked up. Use the arrow keys to choose a slot, then press Enter. Escape puts it back.`);
      return;
    }
    if (press) {
      const slot = kb.slot;
      setKb(null);
      refocus.current = true;
      attempt(kind, slot);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setKb(null);
      setHoverSlot(null);
      sendHome(kind, false);
      setStatus(`${CAR_NAMES[kind]} put back.`);
    } else if (/^Arrow/.test(e.key) && freeSlots.length) {
      e.preventDefault();
      const dir = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
      const at = Math.max(0, freeSlots.indexOf(kb.slot));
      const slot = freeSlots[(at + dir + freeSlots.length) % freeSlots.length];
      setKb({ kind, slot });
      hover(kind, slot);
      setStatus(`Slot ${slot + 1}.`);
    }
  };

  // after a keyboard drop, focus the next car that still needs a place
  useEffect(() => {
    if (!refocus.current || locked) return;
    refocus.current = false;
    const next = cars.find((c) => !c.placed);
    if (next) els.current[next.kind]?.focus({ preventScroll: true });
  }, [placedKinds, mistakes, locked, cars]);

  // paint order: coupled cars, then the yard, the lifted car last (always on top of the rest)
  const paintOrder = useMemo(() => {
    const rank = (c: CarState) => (c.kind === dragKind || c.kind === kb?.kind ? 2 : c.placed ? 0 : 1);
    return cars.slice().sort((a, b) => rank(a) - rank(b));
  }, [cars, dragKind, kb, placedKinds]); // eslint-disable-line react-hooks/exhaustive-deps

  const placedOrders = new Set(placedKinds.map((k) => byKind.get(k)!.order));
  const firstFree = cars.find((c) => !c.placed)?.kind;
  const low = fraction < 0.25;
  const pad = 4;

  return (
    <div className="cc-play">
      <div className="mg-hud">
        <div className="mg-bar" aria-hidden="true"><div className={`mg-bar-fill${low ? ' low' : ''}`} style={{ width: `${fraction * 100}%` }} /></div>
        <span>{placedKinds.length}/{n} coupled</span>
        <span>Oops {mistakes}</span>
      </div>
      <div className={`cc-row${clues ? ' has-clues' : ''}`}>
        {clues && (
          <aside className="cc-clues" aria-label="Clue card">
            <h3>Clue card</h3>
            <ul>{clues.map((c) => <li key={c}>{c}</li>)}</ul>
          </aside>
        )}
        <div className="cc-stage-wrap">
          <Stage ref={svgRef} width={W} height={H} label="Rail yard. Couple the cars to the locomotive in the right order." onKeyDown={onKeyDown}>
            <Scenery lay={lay} n={n} />
            {/* slots */}
            {lay.slotX.map((x, i) => (
              <g key={i} transform={`translate(${x} ${ROW_Y})`}>
                <rect
                  className={`cc-slot${hoverSlot === i ? ' hover' : ''}${badSlot === i ? ' bad' : ''}${placedOrders.has(i) ? ' done' : ''}`}
                  x={-lay.c / 2 - 1} y={-24 * lay.s} width={lay.c + 2} height={46 * lay.s} rx={6}
                />
                {difficulty === 'rookie' && !placedOrders.has(i) && (
                  <g className="cc-ghost" transform={`scale(${lay.s})`}><CarArt kind={order[i]} ghost /></g>
                )}
              </g>
            ))}
            {/* locomotive + steam */}
            <g transform={`translate(${lay.locoX} ${ROW_Y}) scale(${lay.locoScale})`}><LocoArt /></g>
            <g transform={`translate(${lay.locoX - 18 * lay.locoScale} ${ROW_Y - 28 * lay.locoScale})`}>
              <g ref={puffRef}>
                <circle r={4 * lay.locoScale + 1} cx={0} cy={-2} fill="#fff" stroke={INK} strokeWidth={1.5} />
                <circle r={3 * lay.locoScale + 1} cx={6} cy={-8} fill="#fff" stroke={INK} strokeWidth={1.5} />
              </g>
            </g>
            {/* cars */}
            {paintOrder.map((c) => {
              const picked = kb?.kind === c.kind;
              return (
                <g
                  key={c.kind}
                  ref={(el) => { els.current[c.kind] = el; }}
                  className={`cc-car${picked ? ' picked' : ''}`}
                  data-car={c.kind}
                  data-game-focus={c.kind === firstFree ? '' : undefined}
                  role={c.placed ? 'img' : 'button'}
                  aria-label={c.placed ? `${CAR_NAMES[c.kind]}, coupled in slot ${c.order + 1}` : `${CAR_NAMES[c.kind]}. Press Enter to pick it up.`}
                  aria-pressed={c.placed ? undefined : picked}
                  aria-disabled={c.placed || undefined}
                  tabIndex={c.placed ? -1 : 0}
                >
                  <g transform={`scale(${lay.s})`}>
                    <CarArt kind={c.kind} />
                    <rect className="cc-ring" x={-CAR_W / 2 - pad} y={-CAR_H / 2 - pad} width={CAR_W + 2 * pad} height={CAR_H + 2 * pad} rx={8} />
                    <rect x={-CAR_W / 2 - pad} y={-CAR_H / 2 - pad} width={CAR_W + 2 * pad} height={CAR_H + 2 * pad} fill="transparent" />
                  </g>
                </g>
              );
            })}
            <g ref={burstRef} opacity={0} pointerEvents="none">
              <circle r={12} fill="none" stroke={GOLD} strokeWidth={4} />
              <circle r={7} fill="none" stroke={RED} strokeWidth={2.5} />
            </g>
          </Stage>
        </div>
      </div>
      <div className="sr-only" role="status" aria-live="polite">{status}</div>
    </div>
  );
}

/** Base Camp: couple the cars behind the locomotive in the right order. */
export function CoupleTheCars({ difficulty, timeScale, onFinish, paused = false }: ChallengeProps) {
  const diagram = useMemo(() => <HowToDiagram />, []);
  return (
    <MiniGameShell goal={GOALS[difficulty]} diagram={diagram} paused={paused} onFinish={onFinish}>
      {(api) => <Play difficulty={difficulty} timeScale={timeScale} api={api} />}
    </MiniGameShell>
  );
}
