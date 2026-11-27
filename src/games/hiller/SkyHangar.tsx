import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ChallengeProps } from '../types';
import type { Difficulty } from '../../state/types';
import { MiniGameShell, Stage, clientToStage, feedback, starsFor, usePointerDrag } from '../kit';
import type { ShellApi } from '../kit';
import { useLoop } from '../bigcanyon/useLoop';
import {
  ANCHOR, MAX_ANGLE, MIN_ANGLE, NUDGES, RINGS, clamp, distanceM, launch, nudge, previewPath, ringCount, scoreOf, stepGlide,
} from './glide';
import type { Glide } from './glide';
import { Hangar, INK, PaperPlane, RingArt, WORLD_W } from './hangarArt';
import './SkyHangar.css';

const W = 400;
const H = 260;
const THROWS = 3;
const MAX_PULL = 64; // stage units of drag for full power
const MIN_POWER = 0.15;
const REST_SECONDS = 1.7;
const STAR_SCORE: [number, number] = [150, 230]; // best of 3: metres + 25 per ring
const MAX_CAM = WORLD_W - W - 40;
/** how many seconds of the flight the aiming guide draws */
const GUIDE: Record<Difficulty, number> = { rookie: 1.3, pro: 0.55, legend: 0 };

const GOALS: Record<Difficulty, string> = {
  rookie: 'Drag back to aim, let go to throw, tap for updrafts. Fly through the rings and land far away!',
  pro: 'Drag back and let go to throw. Tap for updrafts. Fly through the rings and land far!',
  legend: 'No guide dots and one updraft! Drag back, throw, and glide through the rings.',
};

function HowToDiagram() {
  return (
    <svg viewBox="0 0 220 68" role="presentation">
      <rect x={1.5} y={1.5} width={217} height={65} rx={12} fill="#d3e6e2" stroke={INK} strokeWidth={3} />
      <rect x={1.5} y={52} width={217} height={14} fill="#e0d5b8" stroke={INK} strokeWidth={3} />
      <path d="M38 52 V32" stroke={INK} strokeWidth={8} strokeLinecap="round" /><path d="M38 52 V32" stroke="#a8703f" strokeWidth={4} strokeLinecap="round" />
      <g transform="translate(30 26) rotate(28) scale(.7)"><PaperPlane /></g>
      <path d="M14 42 L32 30" stroke="#c8372d" strokeWidth={3.5} strokeLinecap="round" strokeDasharray="1 7" />
      <path d="M48 24 Q92 -2 118 26 T190 46" fill="none" stroke={INK} strokeWidth={3} strokeDasharray="2 8" strokeLinecap="round" />
      <ellipse cx={112} cy={22} rx={5} ry={15} fill="none" stroke={INK} strokeWidth={8} /><ellipse cx={112} cy={22} rx={5} ry={15} fill="none" stroke="#f2b632" strokeWidth={4.5} />
      <g transform="translate(192 46) rotate(8) scale(.7)"><PaperPlane /></g>
    </svg>
  );
}

type Phase = 'aim' | 'fly' | 'rest';

interface Aim { angle: number; power: number; dragging: boolean }

function Play({ difficulty, api }: { difficulty: Difficulty; api: ShellApi }) {
  const reduced = api.reducedMotion;
  const apiRef = useRef(api);
  apiRef.current = api;

  const phase = useRef<Phase>('aim');
  const glide = useRef<Glide | null>(null);
  const aim = useRef<Aim>({ angle: 14, power: 0.7, dragging: false });
  const aimBackup = useRef<Aim | null>(null);
  const cam = useRef(0);
  const restT = useRef(0);
  const throwIdx = useRef(0);
  const scores = useRef<number[]>([]);
  const bestRef = useRef<{ score: number; dist: number; rings: number }>({ score: 0, dist: 0, rings: 0 });
  const nudgeLeft = useRef(NUDGES[difficulty]);
  const puffs = useRef<{ x: number; y: number; age: number }[]>([]);
  const trail = useRef<string[]>([]);
  const trailT = useRef(0);
  const ended = useRef(false);
  const liveKey = useRef('');
  const start = useRef<{ x: number; y: number } | null>(null);

  const [throwNo, setThrowNo] = useState(1);
  const [best, setBest] = useState(0);
  const [lifts, setLifts] = useState(NUDGES[difficulty]);
  const [ringsDone, setRingsDone] = useState<boolean[]>(RINGS.map(() => false));
  const [marks, setMarks] = useState<{ x: number; n: number }[]>([]);
  const [banner, setBanner] = useState('');
  const [status, setStatus] = useState('');

  const svgRef = useRef<SVGSVGElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<SVGGElement>(null);
  const planeRef = useRef<SVGGElement>(null);
  const bandRef = useRef<SVGPathElement>(null);
  const guideRef = useRef<SVGPolylineElement>(null);
  const trailRef = useRef<SVGPolylineElement>(null);
  const liveRef = useRef<SVGTextElement>(null);
  const hintRef = useRef<SVGTextElement>(null);
  const stallRef = useRef<SVGTextElement>(null);
  const puffEls = useRef<(SVGCircleElement | null)[]>([]);

  // ---------------------------------------------------------------- drawing
  const draw = useCallback(() => {
    const g = glide.current;
    const a = aim.current;
    const ph = phase.current;
    worldRef.current?.setAttribute('transform', `translate(${(-cam.current).toFixed(1)} 0)`);

    let px: number = ANCHOR.x;
    let py: number = ANCHOR.y;
    let ang = a.angle;
    if (ph === 'aim') {
      const pull = a.power * 30;
      const rad = (a.angle * Math.PI) / 180;
      px = ANCHOR.x - Math.cos(rad) * pull;
      py = ANCHOR.y + Math.sin(rad) * pull;
      const band = bandRef.current;
      if (band) band.setAttribute('d', `M${ANCHOR.x - 10} ${ANCHOR.y + 4} L${(px - 14 * Math.cos(rad)).toFixed(1)} ${(py + 14 * Math.sin(rad)).toFixed(1)} L${ANCHOR.x + 10} ${ANCHOR.y + 4}`);
      const gl = guideRef.current;
      if (gl) {
        const secs = GUIDE[difficulty];
        gl.setAttribute('points', secs > 0 ? previewPath(a.angle, a.power, secs).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') : '');
      }
    } else {
      bandRef.current?.setAttribute('d', '');
      guideRef.current?.setAttribute('points', '');
      if (g) {
        px = g.x;
        py = g.mode === 'fly' ? g.y : g.y - 5;
        ang = g.mode === 'fly' ? (Math.atan2(g.vy, Math.max(0.01, g.vx)) * 180) / Math.PI : 0;
        if (g.stalled && !reduced) ang += Math.sin(g.t * 24) * 9;
      }
    }
    planeRef.current?.setAttribute('transform', `translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${(ph === 'aim' ? -ang : ang).toFixed(1)}) scale(1.45)`);
    const tr = trailRef.current;
    if (tr) tr.setAttribute('points', trail.current.join(' '));
    const st = stallRef.current;
    if (st) {
      st.style.display = ph === 'fly' && g?.stalled ? 'block' : 'none';
      st.setAttribute('x', px.toFixed(1));
      st.setAttribute('y', (py - 20).toFixed(1));
    }
    puffs.current.forEach((p, i) => {
      const el = puffEls.current[i];
      if (!el) return;
      if (p.age >= 0.5) { el.style.display = 'none'; return; }
      el.style.display = 'block';
      el.setAttribute('cx', p.x.toFixed(1));
      el.setAttribute('cy', (p.y + p.age * 30).toFixed(1));
      el.setAttribute('r', (5 + p.age * 36).toFixed(1));
      el.setAttribute('opacity', (1 - p.age / 0.5).toFixed(2));
    });
    // live readout
    const live = liveRef.current;
    if (live) {
      const text = g && ph !== 'aim' ? `${distanceM(g)} m   rings ${ringCount(g)}/3` : '';
      if (text !== liveKey.current) { liveKey.current = text; live.textContent = text; }
    }
    const hint = hintRef.current;
    if (hint) {
      hint.style.opacity = ph === 'aim' || (ph === 'fly' && nudgeLeft.current > 0 && (g?.t ?? 9) < 3) ? '1' : '0';
      hint.textContent = ph === 'aim' ? 'Drag back and let go!' : 'Tap for an updraft!';
    }
  }, [difficulty, reduced]);

  useLayoutEffect(() => { draw(); }, [draw]);

  // ---------------------------------------------------------------- simulation
  const finishAll = useCallback(() => {
    if (ended.current) return;
    ended.current = true;
    const b = bestRef.current;
    const stars = starsFor(b.score, STAR_SCORE);
    apiRef.current.finish(stars, `Best flight: ${b.dist} m with ${b.rings} ${b.rings === 1 ? 'ring' : 'rings'} (${b.score} points).${stars === 3 ? ' Ace pilot!' : ' Try again for more stars!'}`);
  }, []);

  const doLaunch = useCallback(() => {
    if (phase.current !== 'aim' || !apiRef.current.active) return;
    const a = aim.current;
    if (a.power < MIN_POWER) return;
    glide.current = launch(a.angle, a.power, nudgeLeft.current);
    phase.current = 'fly';
    trail.current = [`${ANCHOR.x},${ANCHOR.y}`];
    trailT.current = 0;
    setRingsDone(RINGS.map(() => false));
    setBanner('');
    setStatus(`Throw ${throwIdx.current + 1}. Angle ${Math.round(a.angle)} degrees, power ${Math.round(a.power * 100)} percent.`);
    feedback.tick();
  }, []);

  const doNudge = useCallback(() => {
    const g = glide.current;
    if (phase.current !== 'fly' || !g || !apiRef.current.active) return;
    if (nudge(g)) {
      nudgeLeft.current = g.nudges;
      setLifts(g.nudges);
      feedback.tick();
      if (!reduced) {
        const slot = puffs.current.reduce((bi, p, k, arr) => (p.age > arr[bi].age ? k : bi), 0);
        puffs.current[slot] = { x: g.x, y: g.y + 8, age: 0 };
      }
      setStatus(`Updraft! ${g.nudges} left.`);
    }
  }, [reduced]);

  const step = useCallback((dt: number) => {
    if (ended.current) return;
    for (const p of puffs.current) p.age += dt;
    const g = glide.current;
    const ph = phase.current;
    // camera follows the plane; eases back to the tower between throws
    const target = ph === 'aim' ? 0 : clamp((g?.x ?? 0) - 150, 0, MAX_CAM);
    cam.current = reduced || ph === 'fly' ? target : cam.current + (target - cam.current) * Math.min(1, dt * 4);
    if (ph === 'fly' && g) {
      cam.current = target;
      stepGlide(g, dt);
      trailT.current += dt;
      if (trailT.current >= 0.05) { trailT.current = 0; trail.current.push(`${g.x.toFixed(0)},${g.y.toFixed(0)}`); }
      for (const e of g.events.splice(0)) {
        if (e === 'stall') { feedback.miss(); setStatus('Stall! Too steep. Nose down to recover.'); }
        if (e === 'crash') feedback.miss();
      }
      for (const i of g.fresh.splice(0)) {
        feedback.hit();
        setRingsDone((r) => r.map((v, k) => (k === i ? true : v)));
        setStatus(`Ring ${i + 1}! Plus 25.`);
      }
      if (g.mode === 'done') {
        phase.current = 'rest';
        restT.current = 0;
        const sc = scoreOf(g);
        scores.current.push(sc);
        const n = throwIdx.current + 1;
        const dist = distanceM(g);
        if (sc >= bestRef.current.score) bestRef.current = { score: sc, dist, rings: ringCount(g) };
        setBest(bestRef.current.score);
        setMarks((m) => [...m, { x: g.x, n }]);
        setBanner(`${dist} m + ${ringCount(g)} ${ringCount(g) === 1 ? 'ring' : 'rings'} = ${sc}`);
        setStatus(`Landed at ${dist} metres with ${ringCount(g)} rings. Score ${sc}.`);
      }
    } else if (ph === 'rest') {
      restT.current += dt;
      if (restT.current >= REST_SECONDS) {
        if (throwIdx.current >= THROWS - 1) { finishAll(); return; }
        throwIdx.current += 1;
        setThrowNo(throwIdx.current + 1);
        nudgeLeft.current = NUDGES[difficulty];
        setLifts(NUDGES[difficulty]);
        setRingsDone(RINGS.map(() => false));
        setBanner('');
        glide.current = null;
        trail.current = [];
        phase.current = 'aim';
      }
    }
  }, [difficulty, finishAll, reduced]);

  useLoop(step, draw, api.active);

  // ---------------------------------------------------------------- input: drag back to aim (mouse / touch / pen), tap = updraft
  const pullFrom = (x: number, y: number) => {
    const svg = svgRef.current;
    const s = start.current;
    if (!svg || !s) return;
    const p = clientToStage(svg, x, y);
    const dx = s.x - p.x; // direction the plane will fly
    const dy = s.y - p.y;
    const len = Math.hypot(dx, dy);
    aim.current.power = dx < 3 ? 0 : clamp(len / MAX_PULL, 0, 1);
    aim.current.angle = clamp((Math.atan2(-dy, Math.max(dx, 0.001)) * 180) / Math.PI, MIN_ANGLE, MAX_ANGLE);
  };
  usePointerDrag(fieldRef, {
    onStart: (i) => {
      if (!apiRef.current.active) return false;
      if (phase.current === 'fly') { doNudge(); return false; }
      if (phase.current !== 'aim' || !svgRef.current) return false;
      start.current = clientToStage(svgRef.current, i.x, i.y);
      aimBackup.current = { ...aim.current };
      aim.current.dragging = true;
      aim.current.power = 0;
      return true;
    },
    onMove: (i) => { if (aim.current.dragging) pullFrom(i.x, i.y); },
    onEnd: (i, cancelled) => {
      if (!aim.current.dragging) return;
      aim.current.dragging = false;
      if (!cancelled) pullFrom(i.x, i.y);
      if (cancelled || aim.current.power < MIN_POWER) {
        if (!cancelled) setStatus('Pull back a little further, then let go.');
        if (aimBackup.current) aim.current = { ...aimBackup.current, dragging: false };
        return;
      }
      doLaunch();
    },
  }, api.active);

  // a drag in flight when the game is paused is put back
  useEffect(() => {
    if (api.active || !aim.current.dragging) return;
    aim.current = { ...(aimBackup.current ?? aim.current), dragging: false };
  }, [api.active]);

  // keyboard: arrows aim, Space / Enter throws, then Space gives an updraft
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!api.active) return;
    const a = aim.current;
    const press = e.key === ' ' || e.key === 'Enter';
    if (press) {
      e.preventDefault();
      if (e.repeat) return;
      if (phase.current === 'aim') doLaunch();
      else doNudge();
      return;
    }
    if (phase.current !== 'aim') {
      if (e.key === 'ArrowUp') { e.preventDefault(); doNudge(); }
      return;
    }
    if (e.key === 'ArrowUp') a.angle = clamp(a.angle + 3, MIN_ANGLE, MAX_ANGLE);
    else if (e.key === 'ArrowDown') a.angle = clamp(a.angle - 3, MIN_ANGLE, MAX_ANGLE);
    else if (e.key === 'ArrowRight') a.power = clamp(a.power + 0.05, 0, 1);
    else if (e.key === 'ArrowLeft') a.power = clamp(a.power - 0.05, 0, 1);
    else return;
    e.preventDefault();
    setStatus(`Angle ${Math.round(a.angle)} degrees, power ${Math.round(a.power * 100)} percent.`);
  };

  const scene = useMemo(() => <Hangar />, []);

  return (
    <div className="hl-play">
      <div className="mg-hud hl-hud">
        <span>Throw {throwNo}/{THROWS}</span>
        <span>Best {best}</span>
        <span className="hl-lift" aria-label={`${lifts} updrafts left`}>
          Lift {Array.from({ length: NUDGES[difficulty] }, (_, i) => <span key={i} className={i < lifts ? '' : 'off'}>{'▲'}</span>)}
        </span>
      </div>
      <div
        className="hl-field"
        ref={fieldRef}
        tabIndex={0}
        data-game-focus=""
        role="application"
        aria-label="Sky Hangar. Drag back and let go to throw the paper plane, or use the arrow keys to aim and Space to throw. Tap or press Space in flight for an updraft."
        onKeyDown={onKeyDown}
      >
        <Stage ref={svgRef} width={W} height={H} label="Aircraft hangar. Throw the paper plane through the rings and land far along the floor.">
          <g ref={worldRef}>
            {scene}
            {marks.map((m) => (
              <g key={m.n} transform={`translate(${m.x} 214)`} stroke={INK} strokeWidth={2} strokeLinejoin="round">
                <line x1={0} y1={0} x2={0} y2={-22} /><path d="M0 -22 L14 -17 L0 -12 Z" fill="#c8372d" /><text x={5} y={-16} fontFamily="'Lilita One', sans-serif" fontSize={8} fill="#fff7e3" stroke="none">{m.n}</text>
              </g>
            ))}
            {RINGS.map((_, i) => <RingArt key={i} i={i} done={ringsDone[i]} />)}
            <polyline ref={trailRef} fill="none" stroke="#c8372d" strokeWidth={2.4} strokeDasharray="1 6" strokeLinecap="round" />
            <polyline ref={guideRef} fill="none" stroke="#1f8582" strokeWidth={3.2} strokeDasharray="1 7" strokeLinecap="round" />
            <path ref={bandRef} fill="none" stroke="#c8372d" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            {Array.from({ length: 3 }, (_, i) => (
              <circle key={i} ref={(el) => { puffEls.current[i] = el; }} r={5} fill="none" stroke="#fff" strokeWidth={4} style={{ display: 'none' }} />
            ))}
            <g ref={planeRef}><PaperPlane /></g>
            <text ref={stallRef} className="hl-text" fontSize={13} textAnchor="middle" style={{ display: 'none' }}>Stall!</text>
          </g>
          <text ref={liveRef} className="hl-text" x={200} y={44} fontSize={15} textAnchor="middle" />
          <text ref={hintRef} className="hl-text" x={200} y={254} fontSize={15} textAnchor="middle" style={{ transition: 'opacity .3s' }}>Drag back and let go!</text>
          {banner && (
            <g>
              <rect x={70} y={84} width={260} height={44} rx={12} fill="#fff7e3" stroke={INK} strokeWidth={3} />
              <text x={200} y={113} textAnchor="middle" fontFamily="'Lilita One', sans-serif" fontSize={20} fill={INK}>{banner}</text>
            </g>
          )}
        </Stage>
      </div>
      <p className="hl-keys">Keyboard: arrows aim (up/down angle, left/right power), Space throws, then Space for an updraft.</p>
      <div className="sr-only" role="status" aria-live="polite">{status}</div>
    </div>
  );
}

/** Hiller Aviation Museum (bonus): throw a paper plane through hangar rings and glide as far as you can. */
export function SkyHangar({ difficulty, timeScale: _timeScale, onFinish, paused = false }: ChallengeProps) {
  const diagram = useMemo(() => <HowToDiagram />, []);
  return (
    <MiniGameShell goal={GOALS[difficulty]} diagram={diagram} paused={paused} onFinish={onFinish}>
      {(api) => <Play difficulty={difficulty} api={api} />}
    </MiniGameShell>
  );
}
