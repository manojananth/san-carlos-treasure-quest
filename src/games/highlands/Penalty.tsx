import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import type { ChallengeProps } from '../types';
import type { Difficulty } from '../../state/types';
import { MiniGameShell, Stage, clientToStage, feedback, usePausableTimeline, usePointerDrag } from '../kit';
import type { ShellApi } from '../kit';
import { GOLD, GRASS, GRASS_DARK, INK, PAPER, RED, RED_DARK, TEAL, TEAL_DARK, clamp, lerp, starsForGoals } from '../sports/theme';
import { useConfetti } from '../sports/confetti';
import { Pips } from '../sports/Pips';
import '../sports/sports.css';
import './Penalty.css';

const W = 400;
const H = 300;
const SHOTS = 5;
const GX0 = 90; // goal mouth, left post
const GX1 = 310;
const GY0 = 104; // crossbar
const GY1 = 188; // ground line
const SPOT = { x: 200, y: 254 };
const BALL_R0 = 13;
const ZW = (GX1 - GX0) / 3;
const ZH = (GY1 - GY0) / 2;
const ZONE_NAMES = ['top left', 'top middle', 'top right', 'bottom left', 'bottom middle', 'bottom right'];
const zoneCentre = (i: number) => ({ x: GX0 + ZW * ((i % 3) + 0.5), y: GY0 + ZH * (Math.floor(i / 3) + 0.5) });
const GOALIE_HOME = { x: 200, y: 166 };

interface Dive { sx: number; ey: number; rot: number; high: boolean }
const DIVES: Dive[] = [
  { sx: -73, ey: 170, rot: -72, high: false },
  { sx: -73, ey: 132, rot: -52, high: true },
  { sx: 73, ey: 170, rot: 72, high: false },
  { sx: 73, ey: 132, rot: 52, high: true },
  { sx: 0, ey: 150, rot: 0, high: true },
];
/** chance a goalie reads the shot instead of trusting his own guess, per difficulty */
const READ: Record<Difficulty, number> = { rookie: 0, pro: 0.2, legend: 0.3 };
const GOALS: Record<Difficulty, string> = {
  rookie: 'Drag from the ball to a spot in the goal and let go, or tap a spot. Beat the goalie! Watch him lean.',
  pro: 'Drag from the ball to a spot in the goal, or tap one. The goalie leans before he dives. Spot the tell!',
  legend: 'Quick goalie, short tell, shot clock! Drag or tap a spot in the goal and score.',
};
const MSG = {
  goal: ['GOAL!', 'Nice shot, right past the goalie!'],
  saved: ['Saved!', 'The goalie got a glove on it.'],
  wide: ['Wide!', 'Aim between the posts.'],
  over: ['Over!', 'Keep it a little lower.'],
} as const;
type Kind = keyof typeof MSG;

// ---------------------------------------------------------------- art
function BallArt({ r = 1 }: { r?: number }) {
  return (
    <g transform={`scale(${r})`}>
      <circle r={1} fill="#fff" stroke={INK} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      <path d="M0 -0.38 L0.36 -0.12 L0.22 0.3 L-0.22 0.3 L-0.36 -0.12 Z" fill={INK} />
      <path d="M0 -0.38 V-1 M0.36 -0.12 L0.95 -0.3 M0.22 0.3 L0.6 0.8 M-0.22 0.3 L-0.6 0.8 M-0.36 -0.12 L-0.95 -0.3" stroke={INK} strokeWidth={0.12} fill="none" />
    </g>
  );
}

function Glove({ y }: { y: number }) {
  return <circle cx={0} cy={y} r={6.5} fill={RED} stroke={INK} strokeWidth={2} />;
}

interface GoalieRefs { root: (el: SVGGElement | null) => void; armL: (el: SVGGElement | null) => void; armR: (el: SVGGElement | null) => void }
function Goalie({ refs }: { refs: GoalieRefs }) {
  return (
    <g ref={refs.root}>
      <g stroke={INK} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round">
        <rect x={-10} y={10} width={8} height={22} rx={3} fill={INK} />
        <rect x={2} y={10} width={8} height={22} rx={3} fill={INK} />
        <rect x={-12} y={26} width={11} height={7} rx={3} fill={GOLD} />
        <rect x={1} y={26} width={11} height={7} rx={3} fill={GOLD} />
        <g ref={refs.armL} transform="translate(-13 -9)"><rect x={-4} y={0} width={8} height={18} rx={4} fill={TEAL} /><Glove y={21} /></g>
        <g ref={refs.armR} transform="translate(13 -9)"><rect x={-4} y={0} width={8} height={18} rx={4} fill={TEAL} /><Glove y={21} /></g>
        <rect x={-14} y={-15} width={28} height={30} rx={9} fill={TEAL} />
        <rect x={-14} y={-2} width={28} height={7} fill={GOLD} stroke="none" />
        <path d="M-14 -2 H14 M-14 5 H14" fill="none" />
        <circle cy={-26} r={11} fill="#f3c9a0" />
        <path d="M-11 -29 Q-9 -40 0 -38 Q10 -40 11 -29 Q0 -33 -11 -29 Z" fill="#6b4a2d" />
        <circle cx={-4} cy={-26} r={1.8} fill={INK} stroke="none" />
        <circle cx={4} cy={-26} r={1.8} fill={INK} stroke="none" />
        <path d="M-4 -20 Q0 -17 4 -20" fill="none" />
      </g>
    </g>
  );
}

function Scene() {
  const stripes = [160, 176, 196, 220, 252, 290];
  return (
    <g>
      <defs>
        <linearGradient id="pk-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={TEAL} />
          <stop offset="1" stopColor="#e8f6f4" />
        </linearGradient>
        <pattern id="pk-net" width={10} height={10} patternUnits="userSpaceOnUse">
          <path d="M0 0 L10 10 M10 0 L0 10" stroke="#fff" strokeOpacity={0.55} strokeWidth={1} />
        </pattern>
      </defs>
      <rect width={W} height={150} fill="url(#pk-sky)" />
      <circle cx={338} cy={34} r={13} fill={GOLD} stroke={INK} strokeWidth={2.5} />
      <path d="M44 44 q4 -10 14 -6 q6 -8 16 -2 q10 -2 10 8 z" fill="#fff" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <path d="M150 30 q4 -9 12 -5 q6 -7 14 -1 q8 -1 8 6 z" fill="#fff" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      {/* far hills with a summit flag */}
      <path d="M0 120 Q40 70 90 100 Q140 60 200 96 Q260 56 310 92 Q360 70 400 104 V170 H0 Z" fill="#8cc9a0" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M200 96 V74 L214 80 L200 86" fill={RED} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <path d="M0 140 Q60 108 120 132 Q180 112 240 134 Q320 106 400 136 V176 H0 Z" fill="#6fb77a" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      {[[34, 128], [64, 134], [344, 128], [372, 132]].map(([x, y]) => (
        <g key={x}><path d={`M${x} ${y} l-8 18 h16 z`} fill="#3f8f5a" stroke={INK} strokeWidth={2} strokeLinejoin="round" /><rect x={x - 1.5} y={y + 18} width={3} height={5} fill="#6b4a2d" /></g>
      ))}
      {/* hilltop pitch */}
      <rect y={152} width={W} height={H - 152} fill={GRASS} stroke={INK} strokeWidth={2.5} />
      {stripes.map((y, i) => i % 2 === 0 && <rect key={y} y={y} width={W} height={(stripes[i + 1] ?? H) - y} fill={GRASS_DARK} opacity={0.55} />)}
      <path d="M60 188 H340 L372 226 H28 Z" fill="none" stroke="#fff" strokeOpacity={0.8} strokeWidth={2.5} strokeLinejoin="round" />
      <circle cx={SPOT.x} cy={SPOT.y + 12} r={3.2} fill="#fff" stroke={INK} strokeWidth={1.2} />
    </g>
  );
}

function GoalFrame({ front }: { front: boolean }) {
  const d = `M${GX0} ${GY1} V${GY0} H${GX1} V${GY1}`;
  return front ? (
    <g>
      <path d={d} fill="none" stroke={INK} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ) : (
    <g>
      <path d={`M${GX0} ${GY0} L${GX0 + 14} ${GY0 - 12} H${GX1 - 14} L${GX1} ${GY0}`} fill="rgba(255,255,255,.35)" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      <rect x={GX0} y={GY0} width={GX1 - GX0} height={GY1 - GY0} fill="rgba(27,36,48,.22)" />
      <rect x={GX0} y={GY0} width={GX1 - GX0} height={GY1 - GY0} fill="url(#pk-net)" />
    </g>
  );
}

function HowToDiagram() {
  return (
    <svg viewBox="0 0 220 96" role="presentation">
      <rect x={1.5} y={1.5} width={217} height={93} rx={12} fill="#e8f6f4" stroke={INK} strokeWidth={3} />
      <rect x={4} y={50} width={212} height={42} rx={10} fill={GRASS} />
      <rect x={56} y={14} width={108} height={50} fill="#bfe3df" stroke={INK} strokeWidth={3} />
      <path d="M56 64 V14 H164 V64" fill="none" stroke="#fff" strokeWidth={4} />
      <g transform="translate(110 45) scale(.55)"><Goalie refs={{ root: () => {}, armL: () => {}, armR: () => {} }} /></g>
      <circle cx={142} cy={26} r={6} fill="none" stroke={RED} strokeWidth={2.5} />
      <path d="M110 80 Q130 50 140 31" fill="none" stroke={INK} strokeWidth={2.5} strokeDasharray="2 6" strokeLinecap="round" />
      <g transform="translate(110 80)"><BallArt r={9} /></g>
    </svg>
  );
}

// ---------------------------------------------------------------- the game
type Mode = 'aim' | 'fly' | 'result';

function Play({ difficulty, timeScale, api }: { difficulty: Difficulty; timeScale: number; api: ShellApi }) {
  const reduced = api.reducedMotion;
  const { tween, killTweensOf } = usePausableTimeline(!api.active);
  const confetti = useConfetti(tween, reduced);

  const [shot, setShot] = useState(0);
  const [mode, setMode] = useState<Mode>('aim');
  const [results, setResults] = useState<boolean[]>([]);
  const [reticle, setReticle] = useState<{ x: number; y: number } | null>(null);
  const [kbZone, setKbZone] = useState(1);
  const [kbUsed, setKbUsed] = useState(false);
  const [msg, setMsg] = useState<{ big: string; small: string; good: boolean } | null>(null);
  const [status, setStatus] = useState('');
  const [showHint, setShowHint] = useState(true);

  const modeRef = useRef<Mode>('aim');
  const shotRef = useRef(0);
  const goalsRef = useRef(0);
  const tokenRef = useRef(0);
  const decRef = useRef<Dive>(DIVES[4]);
  const svgRef = useRef<SVGSVGElement>(null);
  const goalieRef = useRef<SVGGElement | null>(null);
  const armL = useRef<SVGGElement | null>(null);
  const armR = useRef<SVGGElement | null>(null);
  const ballRef = useRef<SVGGElement>(null);
  const bannerRef = useRef<SVGGElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const barFill = useRef<HTMLElement>(null);
  const gs = useRef({ l: 0, p: 0 });
  const timerObj = useRef({ f: 1 });
  const flight = useRef({ tau: 0 });
  const wait = useRef({});
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const setModeBoth = (m: Mode) => { modeRef.current = m; setMode(m); };

  const renderGoalie = useCallback(() => {
    const { l, p } = gs.current;
    const d = decRef.current;
    const x = GOALIE_HOME.x + d.sx * (0.11 * l * (1 - p) + p);
    const y = GOALIE_HOME.y + (d.ey - GOALIE_HOME.y) * p + (d.sx === 0 ? 4 * l * (1 - p) : 0);
    const rot = d.rot * p + Math.sign(d.sx) * 9 * l * (1 - p);
    const arm = lerp(lerp(30, 65, l), d.sx === 0 ? 150 : 160, p);
    if (goalieRef.current) gsap.set(goalieRef.current, { x, y, rotation: rot, transformOrigin: '0 0' });
    if (armL.current) gsap.set(armL.current, { rotation: arm, transformOrigin: '0 0' });
    if (armR.current) gsap.set(armR.current, { rotation: -arm, transformOrigin: '0 0' });
  }, []);

  const placeBall = useCallback((x: number, y: number, s: number, rot: number) => {
    if (ballRef.current) gsap.set(ballRef.current, { x, y, scale: s, rotation: rot, transformOrigin: '0 0' });
  }, []);

  const setBar = useCallback((f: number) => {
    if (barFill.current) barFill.current.style.transform = `scaleX(${f})`;
    barRef.current?.classList.toggle('low', f < 0.25);
  }, []);

  // ---- start a shot: new goalie decision, tell, timer
  const startRound = useCallback(() => {
    const token = ++tokenRef.current;
    decRef.current = DIVES[Math.floor(Math.random() * DIVES.length)];
    gs.current = { l: 0, p: 0 };
    renderGoalie();
    placeBall(SPOT.x, SPOT.y - BALL_R0, 1, 0);
    timerObj.current.f = 1;
    setBar(1);
    // the tell: the goalie leans toward his dive side for a short while, then settles again
    const tellAt = (0.7 + Math.random() * 1.1) * timeScale;
    const hold = 1.5 * timeScale;
    tween(wait.current, {
      duration: tellAt,
      onComplete: () => {
        if (tokenRef.current !== token || modeRef.current !== 'aim') return;
        tween(gs.current, {
          l: 1, duration: 0.25, ease: 'power1.out', onUpdate: renderGoalie,
          onComplete: () => {
            tween(wait.current, {
              duration: hold,
              onComplete: () => {
                if (tokenRef.current !== token || modeRef.current !== 'aim') return;
                tween(gs.current, { l: 0, duration: 0.3, onUpdate: renderGoalie });
              },
            });
          },
        });
      },
    });
    tween(timerObj.current, {
      f: 0, duration: 8 * timeScale, ease: 'none',
      onUpdate: () => setBar(timerObj.current.f),
      onComplete: () => { if (tokenRef.current === token) shootRef.current(SPOT.x, 176, true); },
    });
  }, [placeBall, renderGoalie, setBar, timeScale, tween]);

  // ---- take the shot
  const shoot = useCallback((tx0: number, ty0: number, weak = false) => {
    if (modeRef.current !== 'aim') return;
    const i = shotRef.current;
    const token = ++tokenRef.current;
    const tx = clamp(tx0, 56, 344);
    const ty = clamp(ty0, 72, 186);
    setModeBoth('fly');
    setReticle(null);
    setShowHint(false);
    dragStart.current = null;
    killTweensOf(timerObj.current);
    killTweensOf(wait.current);
    killTweensOf(gs.current);
    const inGoal = tx > GX0 + 5 && tx < GX1 - 5 && ty > GY0 + 5;
    // maybe the goalie reads the shot instead of trusting his guess
    if (inGoal && Math.random() < READ[difficulty]) {
      const col = tx < GX0 + ZW ? -1 : tx > GX0 + 2 * ZW ? 1 : 0;
      decRef.current = col === 0 ? DIVES[4] : DIVES.find((d) => Math.sign(d.sx) === col && d.high === (ty < GY0 + ZH))!;
    }
    gs.current.l = Math.min(gs.current.l, 1);
    const ft = weak ? 1.1 : 0.55;
    const dv = gs.current;
    tween(dv, {
      p: 1, duration: 0.7 * timeScale, delay: 0.28 * timeScale, ease: 'power2.out', onUpdate: renderGoalie,
    });
    const fo = flight.current;
    fo.tau = 0;
    const bx0 = SPOT.x;
    const by0 = SPOT.y - BALL_R0;
    const sEnd = 0.5;
    setStatus('Shot!');
    tween(fo, {
      tau: 1, duration: ft, ease: 'power1.out',
      onUpdate: () => {
        const t = fo.tau;
        const x = lerp(bx0, tx, t);
        const y = lerp(by0, ty, t) - Math.sin(Math.PI * t) * 26;
        placeBall(x, y, lerp(1, sEnd, t), reduced ? 0 : t * 540);
      },
      onComplete: () => {
        if (tokenRef.current !== token) return;
        let kind: Kind;
        if (tx <= GX0 + 3 || tx >= GX1 - 3) kind = 'wide';
        else if (ty <= GY0 + 3) kind = 'over';
        else {
          const gx = GOALIE_HOME.x + decRef.current.sx * dv.p;
          const gy = GOALIE_HOME.y + (decRef.current.ey - GOALIE_HOME.y) * dv.p;
          const hit = ((tx - gx) / 46) ** 2 + ((ty - gy) / 36) ** 2 <= 1;
          kind = hit ? 'saved' : 'goal';
        }
        const good = kind === 'goal';
        setModeBoth('result');
        setResults((r) => [...r, good]);
        const [big, small] = MSG[kind];
        setMsg({ big, small, good });
        setStatus(`${big} ${small}`);
        if (good) { goalsRef.current += 1; feedback.hit(); confetti.fire(tx, ty); } else feedback.miss();
        if (kind === 'saved' && !reduced) tween(ballRef.current, { y: `+=${18}`, duration: 0.3, ease: 'power1.in' });
        const b = bannerRef.current;
        if (b) {
          gsap.set(b, { opacity: 1, scale: reduced ? 1 : 0.6, svgOrigin: '200 230' });
          if (!reduced) tween(b, { scale: 1, duration: 0.3, ease: 'back.out(2)' });
        }
        tween(wait.current, {
          duration: 1.5,
          onComplete: () => {
            if (b) gsap.set(b, { opacity: 0 });
            if (i + 1 >= SHOTS) {
              const g = goalsRef.current;
              api.finish(starsForGoals(g), `${g} of ${SHOTS} shots found the net!`);
              return;
            }
            shotRef.current = i + 1;
            setShot(i + 1);
            setMsg(null);
            setModeBoth('aim');
            startRound();
            setStatus(`Shot ${i + 2} of ${SHOTS}.`);
          },
        });
      },
    });
  }, [api, confetti, difficulty, killTweensOf, placeBall, reduced, renderGoalie, startRound, timeScale, tween]);
  const shootRef = useRef(shoot);
  shootRef.current = shoot;

  useEffect(() => { gsap.set(bannerRef.current, { opacity: 0 }); }, []);
  // first round starts when play begins (so the timer never runs behind the how-to card)
  const started = useRef(false);
  useEffect(() => {
    if (api.phase !== 'play' || started.current) return;
    started.current = true;
    startRound();
  }, [api.phase, startRound]);
  useEffect(() => { renderGoalie(); placeBall(SPOT.x, SPOT.y - BALL_R0, 1, 0); }, [renderGoalie, placeBall]);

  // ---- pointer: drag or flick from the ball, or tap a spot in the goal
  const targetFrom = (s0: { x: number; y: number }, e: { x: number; y: number }) => {
    if (e.y <= 200) return { x: e.x, y: e.y };
    const vx = e.x - s0.x;
    const vy = e.y - s0.y;
    if (vy > -8) return null;
    const f = (SPOT.y - 140) / -vy;
    return { x: SPOT.x + vx * f, y: 140 };
  };
  usePointerDrag(svgRef, {
    onStart: (i) => {
      if (!api.active || modeRef.current !== 'aim' || !svgRef.current) return false;
      dragStart.current = clientToStage(svgRef.current, i.x, i.y);
      return true;
    },
    onMove: (i) => {
      const s0 = dragStart.current;
      if (!s0 || !svgRef.current) return;
      const e = clientToStage(svgRef.current, i.x, i.y);
      setReticle(Math.hypot(e.x - s0.x, e.y - s0.y) < 10 ? null : targetFrom(s0, e));
    },
    onEnd: (i, cancelled) => {
      const s0 = dragStart.current;
      dragStart.current = null;
      setReticle(null);
      if (!s0 || cancelled || !api.active || !svgRef.current || modeRef.current !== 'aim') return;
      const e = clientToStage(svgRef.current, i.x, i.y);
      if (Math.hypot(e.x - s0.x, e.y - s0.y) < 10) {
        // a tap: shoot at that spot if it is in or near the goal
        if (e.x > GX0 - 10 && e.x < GX1 + 10 && e.y > GY0 - 10 && e.y < GY1 + 6) shoot(e.x, e.y);
        else setStatus('Tap a spot inside the goal, or drag from the ball.');
        return;
      }
      const t = targetFrom(s0, e);
      if (t) shoot(t.x, t.y);
    },
  });

  // a drag in flight when the menu opens is dropped
  useEffect(() => { if (!api.active) { dragStart.current = null; setReticle(null); } }, [api.active]);

  // ---- keyboard: arrows pick one of 6 zones, Enter / Space shoots
  const onKeyDown = (e: React.KeyboardEvent<SVGGElement>) => {
    if (!api.active || modeRef.current !== 'aim') return;
    let z = kbZone;
    if (e.key === 'ArrowLeft') z = z % 3 > 0 ? z - 1 : z;
    else if (e.key === 'ArrowRight') z = z % 3 < 2 ? z + 1 : z;
    else if (e.key === 'ArrowUp') z = z >= 3 ? z - 3 : z;
    else if (e.key === 'ArrowDown') z = z < 3 ? z + 3 : z;
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setKbUsed(true);
      const c = zoneCentre(kbZone);
      shoot(c.x, c.y);
      return;
    } else return;
    e.preventDefault();
    setKbUsed(true);
    setKbZone(z);
    setStatus(`Aiming ${ZONE_NAMES[z]}. Press Enter to shoot.`);
  };

  const goalie = useMemo<GoalieRefs>(() => ({
    root: (el) => { goalieRef.current = el; },
    armL: (el) => { armL.current = el; },
    armR: (el) => { armR.current = el; },
  }), []);

  const aiming = mode === 'aim';
  return (
    <div className="sp-play">
      <div className="sp-hud">
        <span>Shot {Math.min(shot + 1, SHOTS)}/{SHOTS}</span>
        <Pips results={results} total={SHOTS} label={`${results.filter(Boolean).length} goals from ${results.length} shots`} />
        <div className="sp-bar pk-bar" ref={barRef} aria-hidden="true"><i ref={barFill} /></div>
      </div>
      <Stage ref={svgRef} width={W} height={H} className="sp-stage" label="Penalty shootout. Drag from the ball to a spot in the goal, or tap a spot.">
        <Scene />
        <GoalFrame front={false} />
        <Goalie refs={goalie} />
        <GoalFrame front />
        {/* target zones */}
        <g pointerEvents="none">
          {ZONE_NAMES.map((n, i) => (
            <rect
              key={n} className={`pk-zone${aiming && kbUsed && kbZone === i ? ' kb' : ''}`}
              x={GX0 + ZW * (i % 3) + 3} y={GY0 + ZH * Math.floor(i / 3) + 3} width={ZW - 6} height={ZH - 6} rx={6}
              opacity={aiming ? 1 : 0.4}
            />
          ))}
        </g>
        {/* ball shadow + ball */}
        <ellipse cx={SPOT.x} cy={SPOT.y + 12} rx={13} ry={4} fill={INK} opacity={0.25} />
        <g ref={ballRef} pointerEvents="none"><BallArt r={BALL_R0} /></g>
        {aiming && reticle && (
          <g pointerEvents="none">
            <line x1={SPOT.x} y1={SPOT.y - BALL_R0} x2={reticle.x} y2={reticle.y} stroke={INK} strokeWidth={3} strokeDasharray="1 7" strokeLinecap="round" />
            <circle cx={reticle.x} cy={reticle.y} r={10} fill="none" stroke={RED_DARK} strokeWidth={5} />
            <circle cx={reticle.x} cy={reticle.y} r={10} fill="none" stroke={GOLD} strokeWidth={2.5} />
          </g>
        )}
        {aiming && showHint && !reticle && shot === 0 && (
          <g pointerEvents="none">
            <rect x={78} y={270} width={244} height={24} rx={12} fill={PAPER} stroke={INK} strokeWidth={2.5} />
            <text className="pk-hint" x={200} y={286} textAnchor="middle" fontSize={12.5} fill={INK}>Drag from the ball to the goal, or tap a spot!</text>
          </g>
        )}
        {/* keyboard focus target */}
        <g
          className="sp-focus" role="button" tabIndex={0} data-game-focus onKeyDown={onKeyDown}
          aria-label="Goal. Arrow keys choose one of six target zones, Enter shoots."
        >
          <rect x={GX0 - 6} y={GY0 - 6} width={GX1 - GX0 + 12} height={GY1 - GY0 + 12} rx={8} fill="transparent" pointerEvents="none" />
          <rect className="sp-ring" x={GX0 - 8} y={GY0 - 8} width={GX1 - GX0 + 16} height={GY1 - GY0 + 16} rx={10} />
        </g>
        {confetti.node}
        <g ref={bannerRef} opacity={0} pointerEvents="none">
          <rect x={80} y={196} width={240} height={64} rx={16} fill={PAPER} stroke={INK} strokeWidth={3} />
          <text className="sp-msg" x={200} y={230} textAnchor="middle" fontSize={30} fill={msg?.good ? TEAL_DARK : RED} stroke={INK} strokeWidth={1} paintOrder="stroke">{msg?.big}</text>
          <text x={200} y={250} textAnchor="middle" fontSize={12} fontWeight={600} fill={INK} fontFamily="'Rubik', sans-serif">{msg?.small}</text>
        </g>
      </Stage>
      <div className="sr-only" role="status" aria-live="polite">{status}</div>
    </div>
  );
}

/** Summit Outpost: penalty shootout against a goalie who leans before he dives. */
export function PenaltyShootout({ difficulty, timeScale, onFinish, paused = false }: ChallengeProps) {
  const diagram = useMemo(() => <HowToDiagram />, []);
  return (
    <MiniGameShell goal={GOALS[difficulty]} diagram={diagram} paused={paused} onFinish={onFinish}>
      {(api) => <Play difficulty={difficulty} timeScale={timeScale} api={api} />}
    </MiniGameShell>
  );
}
