import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { Sheet } from '../components/Sheet';
import { Stage, clientToStage, usePausableTimeline, usePointerDrag, useReducedMotion } from '../games/kit';
import { sfx } from '../audio/sfx';
import { buzzTap, buzzWrong, buzz } from '../audio/haptics';
import { STOPS } from '../data/stops';
import { CELL, MAP_H, MAP_W, PIECES, PIECE_STOPS, isSolved, judgeDrop, moveSlot, nearestSlot, quarterOf, slotCenter, slotName, startTurns, trayOrder } from './puzzle';
import type { Difficulty } from '../state/types';
import { INK, PAPER, GOLD, RED, StopIcon, TreasureMapArt } from './mapArt';
import { useWideLayout } from './useWideLayout';
import './finale.css';

interface Geo { W: number; H: number; fx: number; fy: number; scale: number; cx: number[]; cy: number[] }
/** portrait / desktop-tall: frame on top, tray under it. wide: frame left, tray right (short landscape phones). */
const PORTRAIT: Geo = { W: 400, H: 412, fx: 50, fy: 12, scale: 0.85, cx: [100, 200, 300], cy: [270, 362] };
const WIDE: Geo = { W: 660, H: 280, fx: 24, fy: 40, scale: 0.9, cx: [400, 500, 600], cy: [90, 190] };
const TILT = [-4, 3, -2, 3, -3, 2];
const stopOf = (p: number) => STOPS.find((s) => s.id === PIECE_STOPS[p])!;

interface Props {
  /** Treasure Hunter: pieces start turned (tap the rotate badge or press R) and carry no labels. Read once at mount. */
  difficulty?: Difficulty;
  paused: boolean;
  /** the player pressed "Follow the X" after the map was complete */
  onSolved: () => void;
}

export function FragmentPuzzle({ difficulty = 'pro', paused, onSolved }: Props) {
  const [hunter] = useState(difficulty === 'hunter');
  const wide = useWideLayout();
  const geo = wide ? WIDE : PORTRAIT;
  const reduced = useReducedMotion();
  const mapId = `tmap-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const els = useRef<(SVGGElement | null)[]>([]);
  const [order] = useState(() => trayOrder());
  // Treasure Hunter: clockwise quarter turns still owed per piece (cumulative taps; upright when a multiple of 4)
  const turns = useRef<number[]>(hunter ? startTurns() : Array(PIECES).fill(0));
  const [quarters, setQuarters] = useState<number[]>(() => turns.current.map(quarterOf));
  const [placed, setPlaced] = useState<boolean[]>(() => Array(PIECES).fill(false));
  const placedRef = useRef(placed);
  const [held, setHeld] = useState<number | null>(null);
  const [kb, setKb] = useState<{ piece: number; slot: number } | null>(null);
  const [hoverSlot, setHoverSlot] = useState<number | null>(null);
  const [badSlot, setBadSlot] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  const [solved, setSolved] = useState(false);
  const drag = useRef<{ piece: number; ox: number; oy: number } | null>(null);
  const refocus = useRef(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const glowRef = useRef<SVGRectElement>(null);
  const { tween, killTweensOf } = usePausableTimeline(paused);
  const active = !paused && !solved;
  const activeRef = useRef(active);
  activeRef.current = active;

  const home = useCallback((p: number) => {
    const t = order.indexOf(p);
    return { x: geo.cx[t % 3], y: geo.cy[Math.floor(t / 3)], rot: hunter ? turns.current[p] * 90 : reduced ? 0 : TILT[t] };
  }, [geo, order, reduced, hunter]);
  const slotPos = useCallback((i: number) => slotCenter(i, geo.fx, geo.fy), [geo]);

  // park every piece (before paint, and again when the layout flips between portrait and wide)
  useLayoutEffect(() => {
    for (let p = 0; p < PIECES; p++) {
      const el = els.current[p];
      if (!el) continue;
      killTweensOf(el);
      gsap.set(el, { svgOrigin: '0 0' }); // scale and spin about the piece centre (its bbox includes the unclipped map)
      if (placedRef.current[p]) gsap.set(el, { x: slotPos(p).x, y: slotPos(p).y, rotation: turns.current[p] * 90, scale: 1 });
      else { const h = home(p); gsap.set(el, { x: h.x, y: h.y, rotation: h.rot, scale: geo.scale }); }
    }
  }, [geo, home, slotPos, killTweensOf]);

  const sendHome = useCallback((p: number, bounce: boolean) => {
    const el = els.current[p];
    if (!el) return;
    const h = home(p);
    killTweensOf(el);
    const to = { x: h.x, y: h.y, rotation: h.rot, scale: geo.scale };
    if (paused) gsap.set(el, to);
    else if (reduced) tween(el, { ...to, duration: 0.15, ease: 'power1.out' });
    else tween(el, { ...to, duration: bounce ? 0.7 : 0.35, ease: bounce ? 'elastic.out(1, 0.5)' : 'power2.out' });
  }, [geo.scale, home, killTweensOf, paused, reduced, tween]);

  const place = useCallback((p: number) => {
    const el = els.current[p];
    const next = placedRef.current.map((v, i) => (i === p ? true : v));
    placedRef.current = next;
    setPlaced(next);
    setBadSlot(null);
    const rot = turns.current[p] * 90;
    const n = next.filter((v, i) => v && quarterOf(turns.current[i]) === 0).length;
    const c = slotPos(p);
    if (el) {
      killTweensOf(el);
      if (reduced) gsap.set(el, { x: c.x, y: c.y, rotation: rot, scale: 1 });
      else {
        tween(el, { x: c.x, y: c.y, rotation: rot, scale: 1.06, duration: 0.2, ease: 'back.out(2)' });
        tween(el, { scale: 1, duration: 0.2, delay: 0.2, ease: 'power2.out' });
      }
    }
    sfx('clank');
    buzzTap();
    const name = stopOf(p).theme;
    if (hunter && quarterOf(turns.current[p]) !== 0) {
      setStatus(`The ${name} piece fits this slot, but it is turned. Tap its rotate badge or press R to turn it upright. ${n} of ${PIECES} pieces done.`);
    } else if (isSolved(next, turns.current)) {
      setSolved(true);
      setStatus(`${name} piece placed. The map is complete! The red X marks the treasure by the depot. Press Follow the X to go on.`);
      sfx('cheer');
      buzz([30, 40, 30, 40, 60]);
      const g = glowRef.current;
      if (g && !reduced) tween(g, { opacity: 1, duration: 0.5, yoyo: true, repeat: 3, ease: 'sine.inOut' });
      else if (g) gsap.set(g, { opacity: 1 });
    } else {
      setStatus(`${name} piece placed in the ${slotName(p)} slot. ${n} of ${PIECES} pieces placed.`);
    }
  }, [hunter, killTweensOf, reduced, slotPos, tween]);

  /** Treasure Hunter: turn a piece (tray or already in its slot) a quarter turn clockwise */
  const rotate = useCallback((p: number) => {
    if (!hunter || !activeRef.current) return;
    const el = els.current[p];
    if (!el) return;
    turns.current[p] += 1;
    const q = turns.current.map(quarterOf);
    setQuarters(q);
    sfx('tap');
    buzzTap();
    killTweensOf(el);
    const to = { rotation: turns.current[p] * 90 };
    if (reduced) gsap.set(el, to);
    else tween(el, { ...to, duration: 0.18, ease: 'power2.out' });
    const name = stopOf(p).theme;
    if (placedRef.current[p] && q[p] === 0) {
      sfx('clank');
      const n = placedRef.current.filter((v, i) => v && q[i] === 0).length;
      if (isSolved(placedRef.current, turns.current)) {
        setSolved(true);
        setStatus(`${name} piece upright. The map is complete! The red X marks the treasure by the depot. Press Follow the X to go on.`);
        sfx('cheer');
        buzz([30, 40, 30, 40, 60]);
        const g = glowRef.current;
        if (g && !reduced) tween(g, { opacity: 1, duration: 0.5, yoyo: true, repeat: 3, ease: 'sine.inOut' });
        else if (g) gsap.set(g, { opacity: 1 });
      } else setStatus(`${name} piece upright and locked in. ${n} of ${PIECES} pieces done.`);
    } else setStatus(`${name} piece turned ${q[p] === 0 ? 'upright' : `${q[p] * 90} degrees clockwise`}.`);
  }, [hunter, killTweensOf, reduced, tween]);

  /** the one place a piece is offered to a slot: pointer drops and keyboard Enter both land here */
  const attempt = useCallback((p: number, slot: number | null) => {
    setHoverSlot(null);
    if (!activeRef.current) { sendHome(p, false); return; }
    const d = judgeDrop(p, slot, placedRef.current);
    if (d.kind === 'snap') { place(p); return; }
    if (d.kind === 'wrong') {
      sfx('wrong');
      buzzWrong();
      setStatus(`The ${stopOf(p).theme} piece does not fit the ${slotName(d.slot)} slot. It goes back to the tray.`);
      setBadSlot(d.slot);
      tween({}, { duration: 0.7, onComplete: () => setBadSlot((b) => (b === d.slot ? null : b)) });
      sendHome(p, true);
      return;
    }
    sendHome(p, false);
  }, [place, sendHome, tween]);

  // ---- pointer drag
  usePointerDrag(svgRef, {
    onStart: (i) => {
      if (!activeRef.current || !svgRef.current) return false;
      const rot = (i.target as Element | null)?.closest?.('[data-rotate]');
      if (rot) { rotate(Number(rot.getAttribute('data-rotate'))); return false; }
      const el = (i.target as Element | null)?.closest?.('[data-piece]');
      const p = el ? Number(el.getAttribute('data-piece')) : NaN;
      if (Number.isNaN(p) || placedRef.current[p]) return false;
      const g = els.current[p]!;
      const pt = clientToStage(svgRef.current, i.x, i.y);
      killTweensOf(g);
      drag.current = { piece: p, ox: Number(gsap.getProperty(g, 'x')) - pt.x, oy: Number(gsap.getProperty(g, 'y')) - pt.y };
      setKb(null);
      setHeld(p);
      const keepRot = hunter ? turns.current[p] * 90 : 0;
      if (reduced) gsap.set(g, { scale: 1, rotation: keepRot });
      else tween(g, { scale: 1.04, rotation: keepRot, duration: 0.12 });
      return true;
    },
    onMove: (i) => {
      const d = drag.current;
      if (!d || !svgRef.current) return;
      const pt = clientToStage(svgRef.current, i.x, i.y);
      const x = Math.min(geo.W - 20, Math.max(20, pt.x + d.ox));
      const y = Math.min(geo.H - 20, Math.max(20, pt.y + d.oy));
      gsap.set(els.current[d.piece]!, { x, y });
      const s = nearestSlot(x, y, geo.fx, geo.fy);
      setHoverSlot((h) => (h === s ? h : s));
    },
    onEnd: (_i, cancelled) => {
      const d = drag.current;
      drag.current = null;
      if (!d) return;
      setHeld(null);
      const g = els.current[d.piece]!;
      const slot = cancelled ? null : nearestSlot(Number(gsap.getProperty(g, 'x')), Number(gsap.getProperty(g, 'y')), geo.fx, geo.fy);
      attempt(d.piece, slot);
    },
  });

  // a drag or a keyboard pick in flight when the menu opens is put back
  useEffect(() => {
    if (!paused) return;
    const d = drag.current;
    if (d) { drag.current = null; setHeld(null); }
    const p = d?.piece ?? kb?.piece;
    setHoverSlot(null);
    if (kb) setKb(null);
    if (p !== undefined) { const h = home(p); gsap.set(els.current[p]!, { x: h.x, y: h.y, rotation: h.rot, scale: geo.scale }); }
  }, [paused]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- keyboard: Enter/Space picks a piece up, arrows choose a slot, Enter drops it, Esc puts it back
  const hover = (p: number, slot: number) => {
    const el = els.current[p]!;
    const c = slotPos(slot);
    killTweensOf(el);
    const rot = turns.current[p] * 90;
    if (reduced) gsap.set(el, { x: c.x, y: c.y - 6, rotation: rot, scale: 1 });
    else tween(el, { x: c.x, y: c.y - 6, rotation: rot, scale: 1, duration: 0.2, ease: 'power2.out' });
    setHoverSlot(slot);
  };
  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (!activeRef.current) return;
    const el = (e.target as Element).closest?.('[data-piece]');
    if (!el) return;
    const p = Number(el.getAttribute('data-piece'));
    if (hunter && (e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); rotate(p); return; }
    if (placedRef.current[p]) return;
    const press = e.key === 'Enter' || e.key === ' ';
    if (press) e.preventDefault();
    const name = stopOf(p).theme;
    if (!kb || kb.piece !== p) {
      if (!press) return;
      const first = placedRef.current.findIndex((v) => !v);
      setKb({ piece: p, slot: first });
      hover(p, first);
      setStatus(`${name} piece picked up. Use the arrow keys to choose a slot. Now over the ${slotName(first)} slot. Press Enter to drop it, Escape to put it back.`);
      return;
    }
    if (press) {
      const slot = kb.slot;
      setKb(null);
      refocus.current = true;
      attempt(p, slot);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setKb(null);
      setHoverSlot(null);
      sendHome(p, false);
      setStatus(`${name} piece put back.`);
    } else if (/^Arrow/.test(e.key)) {
      e.preventDefault();
      const slot = moveSlot(kb.slot, e.key, placedRef.current);
      setKb({ piece: p, slot });
      hover(p, slot);
      setStatus(`Over the ${slotName(slot)} slot.`);
    }
  };

  // keyboard drop: focus the next piece that still needs a place (or the Follow button once the map is whole)
  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    if (solved) return;
    const next = order.find((p) => !placed[p]);
    if (next !== undefined) els.current[next]?.focus({ preventScroll: true });
  }, [placed, solved, badSlot, order]);
  useEffect(() => { if (solved) btnRef.current?.focus({ preventScroll: true }); }, [solved]);

  const rank = (p: number) => (p === held || p === kb?.piece ? 2 : placed[p] ? 0 : 1);
  const paintOrder = useMemo(() => [...Array(PIECES).keys()].sort((a, b) => rank(a) - rank(b)), [held, kb, placed]); // eslint-disable-line react-hooks/exhaustive-deps
  const count = placed.filter((v, i) => v && quarters[i] === 0).length;
  const firstTray = order.find((p) => !placed[p]);

  return (
    <Sheet title="Treasure map puzzle" heading={<>Rebuild the <span>treasure map</span></>} className="sheet-finale fp">
      <div className="fp-body">
        <Stage ref={svgRef} width={geo.W} height={geo.H} label="Treasure map frame. Fit the six map pieces into the frame, three columns by two rows." className="fp-stage" onKeyDown={onKeyDown}>
          <defs><g id={mapId}><TreasureMapArt /></g></defs>
          <rect width={geo.W} height={geo.H} fill="#fbf0d0" />
          {/* frame */}
          <rect x={geo.fx - 7} y={geo.fy - 7} width={MAP_W + 14} height={MAP_H + 14} rx={9} fill="#a9774a" stroke={INK} strokeWidth={3} />
          <rect x={geo.fx} y={geo.fy} width={MAP_W} height={MAP_H} fill="#ead9ae" stroke={INK} strokeWidth={1.5} />
          {[...Array(PIECES).keys()].map((i) => {
            const c = slotPos(i);
            const taken = placed[i];
            return (
              <g key={i} transform={`translate(${c.x} ${c.y})`}>
                <rect
                  className={`fp-slot${hoverSlot === i ? ' hover' : ''}${badSlot === i ? ' bad' : ''}${taken ? ' done' : ''}`}
                  x={-CELL / 2 + 3} y={-CELL / 2 + 3} width={CELL - 6} height={CELL - 6} rx={6}
                />
                {!taken && !hunter && <g className="fp-ghost" transform="scale(1.1)"><StopIcon id={PIECE_STOPS[i]} /></g>}
              </g>
            );
          })}
          <rect ref={glowRef} className="fp-glow" x={geo.fx - 7} y={geo.fy - 7} width={MAP_W + 14} height={MAP_H + 14} rx={9} fill="none" stroke={GOLD} strokeWidth={6} opacity={0} pointerEvents="none" />
          {/* pieces */}
          {paintOrder.map((p) => {
            const stop = stopOf(p);
            const isPlaced = placed[p];
            const locked = isPlaced && quarters[p] === 0;
            const picked = kb?.piece === p;
            return (
              <g
                key={p}
                ref={(el) => { els.current[p] = el; }}
                className={`fp-piece${picked ? ' picked' : ''}${held === p ? ' held' : ''}${locked ? ' placed' : ''}${isPlaced && !locked ? ' turned' : ''}`}
                data-piece={p}
                data-game-focus={p === firstTray ? '' : undefined}
                role={locked ? 'img' : 'button'}
                aria-label={hunter
                  ? (isPlaced ? `${stop.theme} piece in its slot, turned ${quarters[p] * 90} degrees. Press R to rotate it.` : `${stop.theme} piece, turned ${quarters[p] * 90} degrees. Press R to rotate, Enter to pick it up.`)
                  : isPlaced ? `${stop.theme} piece, placed in the ${slotName(p)} slot` : `${stop.theme} piece, from stop ${stop.order}. Press Enter to pick it up.`}
                aria-pressed={isPlaced ? undefined : picked}
                tabIndex={locked ? -1 : 0}
              >
                <svg x={-CELL / 2} y={-CELL / 2} width={CELL} height={CELL} viewBox={`${(p % 3) * CELL} ${Math.floor(p / 3) * CELL} ${CELL} ${CELL}`} pointerEvents="none">
                  <use href={`#${mapId}`} />
                </svg>
                <rect className="fp-edge" x={-CELL / 2} y={-CELL / 2} width={CELL} height={CELL} rx={3} fill="none" stroke={INK} strokeWidth={3} pointerEvents="none" />
                {!isPlaced && !hunter && (<>
                <g transform="translate(0 37)" pointerEvents="none">
                  <rect x={-44} y={-9} width={88} height={18} rx={9} fill={PAPER} stroke={INK} strokeWidth={1.6} />
                  <text y={4} textAnchor="middle" fontFamily="'Lilita One', system-ui, sans-serif" fontSize={10} fill={INK}>{stop.theme}</text>
                </g>
                <g transform={`translate(${-CELL / 2 + 11} ${-CELL / 2 + 11})`} pointerEvents="none">
                  <circle r={9} fill={RED} stroke={INK} strokeWidth={1.6} />
                  <text y={4.5} textAnchor="middle" fontFamily="'Lilita One', system-ui, sans-serif" fontSize={12} fill={PAPER}>{stop.order}</text>
                </g>
                </>)}
                <rect className="fp-ring" x={-CELL / 2 - 4} y={-CELL / 2 - 4} width={CELL + 8} height={CELL + 8} rx={7} pointerEvents="none" />
                <rect x={-CELL / 2} y={-CELL / 2} width={CELL} height={CELL} fill="transparent" />
                {hunter && !locked && (
                  <g className="fp-rot" data-rotate={p} transform={`translate(${CELL / 2 - 12} ${-CELL / 2 + 12})`} role="presentation">
                    <circle r={22} fill="transparent" />
                    <circle r={13} fill={GOLD} stroke={INK} strokeWidth={2.2} />
                    <path d="M-5.5 1.5 A6 6 0 1 1 -1 6 M-5.5 1.5 L-8.5 -1.5 M-5.5 1.5 L-2 -0.5" transform="rotate(30)" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                )}
              </g>
            );
          })}
          {solved && (
            <g transform={`translate(${wide ? 500 : 200} ${wide ? 140 : 318})`} pointerEvents="none">
              <path d="M-112 -24 H112 L100 0 L112 24 H-112 L-100 0 Z" fill={RED} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
              <text y={8} textAnchor="middle" fontFamily="'Lilita One', system-ui, sans-serif" fontSize={21} fill={PAPER} stroke={INK} strokeWidth={0.5} letterSpacing={0.5}>MAP COMPLETE!</text>
              {[-92, 92].map((x) => <path key={x} transform={`translate(${x} 0)`} d="M0 -9 L3 -3 L9 0 L3 3 L0 9 L-3 3 L-9 0 L-3 -3 Z" fill={GOLD} stroke={INK} strokeWidth={1.4} />)}
            </g>
          )}
        </Stage>

        <div className="fp-side">
          {solved ? (
            <>
              <p className="fp-msg"><b>The map is complete!</b> The red X marks the spot, right by the old stone depot.</p>
              <button ref={btnRef} type="button" className="btn btn-go" data-autofocus onClick={onSolved}>Follow the X</button>
            </>
          ) : (
            <>
              <p className="fp-msg">{hunter
                ? 'The pieces are spun every which way and have no labels! Tap the gold turn badge (or press R) to set a piece upright, then drag it into the frame. Match the trail, hills and Bay.'
                : 'Each piece comes from a stop on your quest. Drag it into the frame, matching the trail, hills and Bay.'}</p>
              <p className="fp-count" aria-hidden="true">{count} of {PIECES} pieces</p>
              <p className="fp-keys">Keyboard: Enter picks a piece up, arrow keys choose a slot, Enter drops it{hunter ? ', R turns a piece' : ''}.</p>
            </>
          )}
        </div>
      </div>
      <div className="sr-only" role="status" aria-live="polite">{status}</div>
    </Sheet>
  );
}
