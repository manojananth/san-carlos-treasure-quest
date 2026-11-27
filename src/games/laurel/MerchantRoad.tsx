import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import type { ChallengeProps } from '../types';
import type { Difficulty } from '../../state/types';
import {
  MiniGameShell, Stage, clientToStage, feedback, starsFor, useCountdown, usePausableClock, usePausableTimeline,
} from '../kit';
import type { ShellApi } from '../kit';
import { HIDDEN, INK, ItemArt, ItemIcon, SceneBack, SceneFront } from './streetArt';
import type { ItemKind } from './streetArt';
import './MerchantRoad.css';

/**
 * STARS (documented formula)
 *   part 1 points = items found (0-5) + 1 bonus point if all 5 were found with at least 40% of the time left   (0-6)
 *   part 2 points = reaction under 300 ms -> 2, under 450 ms -> 1, slower / jump-started twice / no tap -> 0     (0-2)
 *   score = part 1 + part 2 (0-8);  starsFor(score, [4, 7]):  7-8 -> 3 stars, 4-6 -> 2 stars, otherwise 1 star.
 * A finished attempt always earns at least 1 star.
 */
const STAR_SCORE: [number, number] = [4, 7];
export function scoreFor(found: number, timeLeftFraction: number, reactionMs: number | null): number {
  const p1 = found + (found === 5 && timeLeftFraction >= 0.4 ? 1 : 0);
  const p2 = reactionMs === null ? 0 : reactionMs < 300 ? 2 : reactionMs < 450 ? 1 : 0;
  return p1 + p2;
}

const BASE_SECONDS = 40;
const W = 400;
const H = 250;
const HIT_R = 19; // game units; about 33 px on a 390 px phone, invisible
const HINT_AFTER_MS = 15000; // Rookie sparkle
const PENALTY_MS: Record<Difficulty, number> = { rookie: 0, pro: 1500, legend: 2500 };

const GOALS: Record<Difficulty, string> = {
  rookie: 'Part 1: find the 5 hidden treasures on Merchant Road and tap them. Part 2: tap GO the moment the lights go out!',
  pro: 'Part 1: find the 5 hidden treasures. Wrong taps cost a little time. Part 2: tap GO the moment the lights go out!',
  legend: 'Part 1: find all 5 hidden treasures fast. Wrong taps cost time. Part 2: tap GO the instant the lights go out!',
};

function HowToDiagram() {
  return (
    <svg viewBox="0 0 220 96" role="presentation">
      <rect x={1.5} y={1.5} width={217} height={93} rx={12} fill="#e8f6f4" stroke={INK} strokeWidth={3} />
      <rect x={14} y={22} width={60} height={46} fill="#f1c59a" stroke={INK} strokeWidth={2.5} />
      <rect x={20} y={14} width={48} height={12} fill="#c8372d" stroke={INK} strokeWidth={2.5} />
      <rect x={26} y={36} width={22} height={20} fill="#cfeeea" stroke={INK} strokeWidth={2} />
      <circle cx={52} cy={60} r={9} fill="none" stroke="#f2b632" strokeWidth={4} />
      <g transform="translate(52 60)"><ItemArt kind="coin" /></g>
      <g transform="translate(120 26)">
        {[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={i * 18} cy={0} r={7} fill={i < 3 ? '#c8372d' : '#3a4350'} stroke={INK} strokeWidth={2} />)}
      </g>
      <rect x={118} y={50} width={80} height={26} rx={13} fill="#f2b632" stroke={INK} strokeWidth={3} />
      <text x={158} y={69} textAnchor="middle" fontFamily="'Lilita One', sans-serif" fontSize={19} fill={INK}>GO!</text>
    </svg>
  );
}

// ------------------------------------------------------------------ part 1: spot 5
interface SpotResult { found: number; fractionLeft: number }

function SpotPart({ difficulty, timeScale, api, onDone }: {
  difficulty: Difficulty; timeScale: number; api: ShellApi; onDone: (r: SpotResult) => void;
}) {
  const baseMs = BASE_SECONDS * 1000 * timeScale;
  const [found, setFound] = useState<ItemKind[]>([]);
  const [wrong, setWrong] = useState(0);
  const [penalty, setPenalty] = useState(0);
  const [lastFindAt, setLastFindAt] = useState(0);
  const [ending, setEnding] = useState(false);
  const [status, setStatus] = useState('');
  const [kb, setKb] = useState({ x: 200, y: 125 });
  const [kbOn, setKbOn] = useState(false); // magnifier only shows once the keyboard is used

  const svgRef = useRef<SVGSVGElement>(null);
  const ringEls = useRef<Partial<Record<ItemKind, SVGCircleElement | null>>>({});
  const xRef = useRef<SVGGElement>(null);
  const foundRef = useRef<ItemKind[]>([]);
  const endingRef = useRef(false);
  const doneRef = useRef(false);
  const reduced = api.reducedMotion;

  const { tween } = usePausableTimeline(!api.active);
  const effTotal = Math.max(1, baseMs - penalty);
  const finish = useCallback((fractionLeft: number) => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone({ found: foundRef.current.length, fractionLeft });
  }, [onDone]);
  const { remainingMs, getRemaining } = useCountdown(effTotal, !api.active || ending, () => finish(0));
  const getRemainingRef = useRef(getRemaining);
  getRemainingRef.current = getRemaining;

  const elapsed = effTotal - remainingMs;
  const hint = difficulty === 'rookie' && !ending && elapsed - lastFindAt >= HINT_AFTER_MS
    ? HIDDEN.find((h) => !found.includes(h.kind)) : undefined;

  const tap = (x: number, y: number) => {
    if (!api.active || endingRef.current) return;
    let best: (typeof HIDDEN)[number] | null = null;
    let bestD = HIT_R;
    for (const h of HIDDEN) {
      if (foundRef.current.includes(h.kind)) continue;
      const d = Math.hypot(h.x - x, h.y - y);
      if (d <= bestD) { best = h; bestD = d; }
    }
    if (best) {
      const kind = best.kind;
      foundRef.current = [...foundRef.current, kind];
      setFound(foundRef.current);
      setLastFindAt(baseMs - getRemainingRef.current() - penalty);
      feedback.tick();
      setStatus(`Found the ${best.label}. ${foundRef.current.length} of 5.`);
      const ring = ringEls.current[kind];
      if (ring && !reduced) {
        gsap.set(ring, { scale: 0.3 });
        tween(ring, { scale: 1, duration: 0.35, ease: 'back.out(2)' });
      }
      if (foundRef.current.length === 5) {
        endingRef.current = true;
        setEnding(true);
        const left = getRemainingRef.current() / baseMs;
        tween({}, { duration: 0.9, onComplete: () => finish(left) });
      }
    } else {
      feedback.miss();
      setWrong((w) => w + 1);
      if (PENALTY_MS[difficulty]) setPenalty((p) => p + PENALTY_MS[difficulty]);
      setStatus('Nothing there. Keep looking.');
      const g = xRef.current;
      if (g) {
        gsap.set(g, { x, y, opacity: 0.9 });
        tween(g, { opacity: 0, duration: 0.45, delay: 0.25 });
      }
    }
  };
  const tapRef = useRef(tap);
  tapRef.current = tap;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.tabIndex = 0;
    svg.setAttribute('data-game-focus', '');
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      setKbOn(false);
      const p = clientToStage(svg, e.clientX, e.clientY);
      tapRef.current(p.x, p.y);
    };
    svg.addEventListener('pointerdown', down);
    return () => svg.removeEventListener('pointerdown', down);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (!api.active) return;
    const step = e.shiftKey ? 40 : 16;
    const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (d[e.key]) {
      e.preventDefault();
      setKbOn(true);
      setKb((k) => ({ x: Math.max(0, Math.min(W, k.x + d[e.key][0])), y: Math.max(0, Math.min(H, k.y + d[e.key][1])) }));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setKbOn(true);
      tap(kb.x, kb.y);
    }
  };

  const low = remainingMs / effTotal < 0.25;
  return (
    <div className="lc-play lc-spot">
      <div className="mg-hud">
        <div className="mg-bar" aria-hidden="true"><div className={`mg-bar-fill${low ? ' low' : ''}`} style={{ width: `${(remainingMs / effTotal) * 100}%` }} /></div>
        <span>{found.length}/5 found</span>
        {difficulty !== 'rookie' && <span>Oops {wrong}</span>}
      </div>
      <div className="lc-row" data-paused={api.active ? undefined : ''}>
        <div className="lc-stage-wrap">
          <Stage
            ref={svgRef} width={W} height={H} className="lc-stage" onKeyDown={onKeyDown}
            label="Merchant Road street scene with five hidden treasures. Use the arrow keys to move the magnifier and Enter to tap."
          >
            <SceneBack />
            {HIDDEN.map((h) => (
              <g key={h.kind} transform={`translate(${h.x} ${h.y}) rotate(${h.rot})`}><ItemArt kind={h.kind} /></g>
            ))}
            <SceneFront />
            {HIDDEN.map((h) => (
              <g key={h.kind} transform={`translate(${h.x} ${h.y})`} pointerEvents="none">
                <circle ref={(el) => { ringEls.current[h.kind] = el; }} className={`lc-ring${found.includes(h.kind) ? ' on' : ''}`} r={13} />
              </g>
            ))}
            {hint && (
              <g transform={`translate(${hint.x} ${hint.y})`} pointerEvents="none" className="lc-sparkle">
                <circle r={17} fill="none" stroke="#fff" strokeWidth={2.5} strokeDasharray="3 5" />
                <path d="M0 -24 L3 -7 L20 0 L3 7 L0 24 L-3 7 L-20 0 L-3 -7 Z" fill="#fff" stroke={INK} strokeWidth={1.4} strokeLinejoin="round" opacity={0.85} />
              </g>
            )}
            <g ref={xRef} opacity={0} pointerEvents="none">
              <path d="M-6 -6 L6 6 M6 -6 L-6 6" stroke={INK} strokeWidth={5.5} strokeLinecap="round" />
              <path d="M-6 -6 L6 6 M6 -6 L-6 6" stroke="#c8372d" strokeWidth={3} strokeLinecap="round" />
            </g>
            <g className={`lc-reticle${kbOn ? ' on' : ''}`} transform={`translate(${kb.x} ${kb.y})`} pointerEvents="none">
              <circle r={14} fill="rgba(255,255,255,.25)" stroke={INK} strokeWidth={3.5} />
              <circle r={14} fill="none" stroke="#2ba8a4" strokeWidth={1.8} strokeDasharray="5 3" />
              <path d="M-20 0 h12 M8 0 h12 M0 -20 v12 M0 8 v12" stroke={INK} strokeWidth={2} />
            </g>
          </Stage>
        </div>
        <ul className="lc-list" aria-label="Treasures to find">
          {HIDDEN.map((h) => {
            const ok = found.includes(h.kind);
            return (
              <li key={h.kind} className={ok ? 'done' : ''}>
                <ItemIcon kind={h.kind} />
                <span>{h.kind}</span>
                {ok && <b aria-hidden="true">✓</b>}
                <span className="sr-only">{ok ? ' found' : ' not found yet'}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="sr-only" role="status" aria-live="polite">{status}</div>
    </div>
  );
}

// ------------------------------------------------------------------ part 2: lights out
type LightsPhase = 'ready' | 'seq' | 'out' | 'jump' | 'result';

function LightsPart({ api, onDone }: { api: ShellApi; onDone: (reactionMs: number | null) => void }) {
  const [phase, setPhase] = useState<LightsPhase>('ready');
  const [lit, setLit] = useState(0);
  const [msg, setMsg] = useState('Get ready…');
  const phaseRef = useRef<LightsPhase>('ready');
  const jumps = useRef(0);
  const markRef = useRef(0);
  const gen = useRef(0); // bumping it cancels every pending delay
  const doneRef = useRef(false);
  const { tween } = usePausableTimeline(!api.active);
  const { getElapsed } = usePausableClock(!api.active);

  const setP = (p: LightsPhase) => { phaseRef.current = p; setPhase(p); };
  /** a pausable delay (never setTimeout) */
  const later = useCallback((sec: number, fn: () => void) => {
    const g = gen.current;
    tween({}, { duration: sec, onComplete: () => { if (g === gen.current) fn(); } });
  }, [tween]);
  const finish = useCallback((ms: number | null) => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone(ms);
  }, [onDone]);

  const startSeq = useCallback(() => {
    setLit(0);
    setMsg('Get ready…');
    setP('ready');
    later(1.6, () => {
      setP('seq');
      setMsg('Wait for it…');
      const step = (n: number) => {
        setLit(n);
        feedback.tick();
        if (n < 5) later(0.8, () => step(n + 1));
        else later(0.6 + Math.random() * 1.8, () => {
          setLit(0);
          setP('out');
          setMsg('GO! GO! GO!');
          markRef.current = getElapsed();
          later(2.5, () => { setMsg('Too slow this time!'); setP('result'); later(1.2, () => finish(null)); });
        });
      };
      step(1);
    });
  }, [finish, getElapsed, later]);

  useEffect(() => { startSeq(); }, [startSeq]);

  const go = () => {
    if (!api.active) return;
    const p = phaseRef.current;
    if (p === 'ready' || p === 'jump' || p === 'result') return;
    gen.current += 1;
    if (p === 'seq') {
      feedback.miss();
      jumps.current += 1;
      setP('jump');
      if (jumps.current === 1) {
        setMsg('Jump start! One more try.');
        later(1.6, startSeq);
      } else {
        setMsg('Jump start again! Nice try.');
        later(1.4, () => finish(null));
      }
      return;
    }
    const ms = Math.round(getElapsed() - markRef.current);
    setP('result');
    feedback.hit();
    setMsg(`${ms} ms! ${ms < 300 ? 'Lightning fast!' : ms < 450 ? 'Nice reflexes!' : 'Not bad!'}`);
    later(1.5, () => finish(ms));
  };
  const goRef = useRef(go);
  goRef.current = go;

  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { btnRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) goRef.current(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="lc-play lc-lights" data-paused={api.active ? undefined : ''}>
      <div className="mg-hud"><span>Part 2 of 2: Lights Out</span>{jumps.current > 0 && phase !== 'result' && <span>Last try</span>}</div>
      <div className="lc-row">
        <div className="lc-stage-wrap">
          <Stage width={W} height={160} className="lc-gantry" label={`Starting lights: ${lit} of 5 on.`}>
            <rect width={W} height={160} fill="#bfe6e1" />
            <rect y={118} width={W} height={42} fill="#6f7c89" stroke={INK} strokeWidth={2.5} />
            <path d="M0 140 h400" stroke="#fff7e3" strokeWidth={3} strokeDasharray="22 14" />
            <path d="M0 118 h400" stroke={INK} strokeWidth={2.5} />
            <rect x={56} y={26} width={10} height={94} fill="#3a4757" stroke={INK} strokeWidth={2.5} />
            <rect x={334} y={26} width={10} height={94} fill="#3a4757" stroke={INK} strokeWidth={2.5} />
            <rect x={40} y={14} width={320} height={26} rx={6} fill="#3a4757" stroke={INK} strokeWidth={2.5} />
            {[0, 1, 2, 3, 4].map((i) => {
              const on = i < lit;
              return (
                <g key={i} transform={`translate(${96 + i * 52} 66)`}>
                  <rect x={-20} y={-26} width={40} height={52} rx={9} fill="#232c38" stroke={INK} strokeWidth={2.5} />
                  <circle r={14} fill={on ? '#e8392d' : '#4a5563'} stroke={INK} strokeWidth={2.5} />
                  {on && <circle cx={-4} cy={-4} r={4} fill="#ff9a8f" />}
                </g>
              );
            })}
          </Stage>
          <p className={`lc-msg${phase === 'out' ? ' go' : ''}`} aria-live="polite">{msg}</p>
        </div>
        <button
          type="button" className="btn btn-go lc-go" data-game-focus ref={btnRef}
          onPointerDown={(e) => { e.preventDefault(); goRef.current(); }}
          onClick={(e) => { if (e.detail === 0) goRef.current(); }}
          aria-label="GO! Tap when the lights go out. Space or Enter also work."
        >GO!</button>
      </div>
      <div className="sr-only" role="status" aria-live="assertive">{phase === 'out' ? 'Lights out! Go!' : lit > 0 ? `${lit} lights` : ''}</div>
    </div>
  );
}

// ------------------------------------------------------------------ game
function Play({ difficulty, timeScale, api }: { difficulty: Difficulty; timeScale: number; api: ShellApi }) {
  const [part, setPart] = useState<'spot' | 'lights'>('spot');
  const spot = useRef<SpotResult>({ found: 0, fractionLeft: 0 });

  const onSpot = useCallback((r: SpotResult) => { spot.current = r; setPart('lights'); }, []);
  const onLights = useCallback((ms: number | null) => {
    const { found, fractionLeft } = spot.current;
    const stars = starsFor(scoreFor(found, fractionLeft, ms), STAR_SCORE);
    const react = ms === null ? 'No reaction time this round.' : `Reaction ${ms} ms.`;
    api.finish(stars, `${found} of 5 treasures found. ${react}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api.finish]);

  return part === 'spot'
    ? <SpotPart difficulty={difficulty} timeScale={timeScale} api={api} onDone={onSpot} />
    : <LightsPart api={api} onDone={onLights} />;
}

/** Laurel Street, Merchant Road: spot 5 hidden treasures, then a lights-out reaction test. */
export function MerchantRoad({ difficulty, timeScale, onFinish, paused = false }: ChallengeProps) {
  const diagram = useMemo(() => <HowToDiagram />, []);
  return (
    <MiniGameShell goal={GOALS[difficulty]} diagram={diagram} paused={paused} onFinish={onFinish}>
      {(api) => <Play difficulty={difficulty} timeScale={timeScale} api={api} />}
    </MiniGameShell>
  );
}
