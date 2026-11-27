import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import type { ChallengeProps } from '../types';
import type { Difficulty } from '../../state/types';
import { MiniGameShell, Stage, clientToStage, feedback, usePausableTimeline, usePointerDrag } from '../kit';
import type { ShellApi } from '../kit';
import { GOLD, GOLD_DARK, GRASS, GRASS_DARK, INK, PAPER, RED, TEAL, TEAL_DARK, clamp, starsForGoals } from '../sports/theme';
import { BALL_R, BAR_H, HALF_GAP, MAX_YAW, POST_TOP, px, py, scaleAt, simulate } from '../sports/kick';
import type { KickOutcome } from '../sports/kick';
import { useConfetti } from '../sports/confetti';
import { Pips } from '../sports/Pips';
import '../sports/sports.css';
import './FieldGoal.css';

const W = 400;
const H = 300;
const KICKS = 5;
const DISTANCES = [15, 20, 25, 30, 35];
const GUIDE: Record<Difficulty, number> = { rookie: 0.9, pro: 0.6, legend: 0.35 };
const MAX_PULL = 80;
const GOALS: Record<Difficulty, string> = {
  rookie: 'Drag back from the ball to aim and set power, then let go. Send it between the posts and over the bar!',
  pro: 'Drag back from the ball to aim and set power. Watch the wind arrow: it bends the kick!',
  legend: 'Drag back to aim and set power. The wind is strong and the guide is short. Kick 5 times!',
};
const MSG: Record<KickOutcome, [string, string]> = {
  goal: ['It’s good!', 'Right between the posts!'],
  short: ['Short!', 'Kick it a little harder.'],
  high: ['Too high!', 'Ease off the power a bit.'],
  'wide-left': ['Wide left!', 'Aim a touch to the right.'],
  'wide-right': ['Wide right!', 'Aim a touch to the left.'],
};

// ---------------------------------------------------------------- how-to diagram
function HowToDiagram() {
  return (
    <svg viewBox="0 0 220 96" role="presentation">
      <rect x={1.5} y={1.5} width={217} height={93} rx={12} fill="#e8f6f4" stroke={INK} strokeWidth={3} />
      <rect x={4} y={44} width={212} height={48} rx={10} fill={GRASS} />
      <g stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none"><path d="M96 56 V30 M124 56 V30 M96 40 H124" /></g>
      <g stroke={GOLD} strokeWidth={2.5} strokeLinecap="round" fill="none"><path d="M96 56 V30 M124 56 V30 M96 40 H124" /></g>
      <g transform="translate(110 80)">
        <ellipse rx={10} ry={6.5} fill={RED} stroke={INK} strokeWidth={2} />
        <path d="M-3 0 H3" stroke="#fff" strokeWidth={1.5} />
      </g>
      <path d="M110 80 L84 90" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={82} cy={91} r={4.5} fill={GOLD} stroke={INK} strokeWidth={2} />
      <path d="M112 72 Q114 48 110 38" fill="none" stroke={RED} strokeWidth={3} strokeDasharray="1 7" strokeLinecap="round" />
    </svg>
  );
}

// ---------------------------------------------------------------- scenery
const STRIPES = Array.from({ length: 14 }, (_, i) => -6 + i * 5);
function Field({ d }: { d: number }) {
  const poly = (z0: number, z1: number) =>
    `${px(-22, z0)},${py(0, z0)} ${px(22, z0)},${py(0, z0)} ${px(22, z1)},${py(0, z1)} ${px(-22, z1)},${py(0, z1)}`;
  const sw = Math.max(2.5, scaleAt(d) * 0.2);
  const s = scaleAt(d);
  const post = `M${px(0, d)} ${py(0, d)} V${py(BAR_H, d)} M${px(-HALF_GAP, d)} ${py(BAR_H, d)} H${px(HALF_GAP, d)}`
    + ` M${px(-HALF_GAP, d)} ${py(BAR_H, d)} V${py(POST_TOP, d)} M${px(HALF_GAP, d)} ${py(BAR_H, d)} V${py(POST_TOP, d)}`;
  return (
    <g>
      <defs>
        <linearGradient id="fg-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={TEAL} />
          <stop offset="1" stopColor="#e8f6f4" />
        </linearGradient>
      </defs>
      <rect width={W} height={96} fill="url(#fg-sky)" />
      <circle cx={344} cy={30} r={12} fill={GOLD} stroke={INK} strokeWidth={2.5} />
      <path d="M40 40 q4 -10 14 -6 q6 -8 16 -2 q10 -2 10 8 z" fill="#fff" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      {/* far stands */}
      <rect x={0} y={68} width={W} height={20} fill={TEAL_DARK} stroke={INK} strokeWidth={2} />
      <g className="fg-dots">
        {Array.from({ length: 40 }, (_, i) => (
          <circle key={i} cx={5 + i * 10} cy={74 + (i % 3) * 4.5} r={2.6} fill={['#fff7e3', GOLD, '#e8f6f4', RED][i % 4]} stroke={INK} strokeWidth={0.8} />
        ))}
      </g>
      <rect x={0} y={86} width={W} height={H - 86} fill={GRASS_DARK} />
      <line x1={0} y1={85.5} x2={W} y2={85.5} stroke={INK} strokeWidth={2} />
      {STRIPES.map((z, i) => <polygon key={z} points={poly(z, z + 5)} fill={i % 2 ? GRASS : '#6cbd5a'} />)}
      {STRIPES.map((z) => <line key={`l${z}`} x1={px(-22, z)} y1={py(0, z)} x2={px(22, z)} y2={py(0, z)} stroke="#fff" strokeOpacity={0.75} strokeWidth={Math.max(0.8, scaleAt(z) * 0.05)} />)}
      <line x1={px(-22, -6)} y1={py(0, -6)} x2={px(-22, 60)} y2={py(0, 60)} stroke="#fff" strokeWidth={2} />
      <line x1={px(22, -6)} y1={py(0, -6)} x2={px(22, 60)} y2={py(0, 60)} stroke="#fff" strokeWidth={2} />
      {/* goalposts: stem, crossbar, uprights */}
      <path d={post} fill="none" stroke={INK} strokeWidth={sw + 4} strokeLinecap="round" strokeLinejoin="round" />
      <path d={post} fill="none" stroke={GOLD} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx={px(0, d)} cy={py(0, d)} rx={s * 0.5} ry={s * 0.12} fill={GOLD_DARK} stroke={INK} strokeWidth={2} />
    </g>
  );
}

// ---------------------------------------------------------------- the game
type Mode = 'aim' | 'fly' | 'result';

function Play({ difficulty, timeScale: _ts, api }: { difficulty: Difficulty; timeScale: number; api: ShellApi }) {
  void _ts;
  const reduced = api.reducedMotion;
  const { tween, killTweensOf } = usePausableTimeline(!api.active);
  const confetti = useConfetti(tween, reduced);

  const winds = useMemo(
    () => Array.from({ length: KICKS }, () => {
      const sign = Math.random() < 0.5 ? -1 : 1;
      if (difficulty === 'rookie') return 0;
      return sign * (difficulty === 'pro' ? 0.5 + Math.random() * 0.5 : 1.0 + Math.random() * 0.7);
    }),
    [difficulty],
  );

  const [kick, setKick] = useState(0);
  const [mode, setMode] = useState<Mode>('aim');
  const [results, setResults] = useState<boolean[]>([]);
  const [aim, setAimState] = useState({ yaw: 0, p: 0.6 });
  const [dragging, setDragging] = useState<{ x: number; y: number } | null>(null);
  const [behind, setBehind] = useState(false);
  const [msg, setMsg] = useState<{ big: string; small: string; good: boolean } | null>(null);
  const [status, setStatus] = useState('');
  const [charging, setCharging] = useState(false);

  const aimRef = useRef(aim);
  const modeRef = useRef<Mode>('aim');
  const kickRef = useRef(0);
  const goalsRef = useRef(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const ballRef = useRef<SVGGElement | null>(null);
  const shadowRef = useRef<SVGEllipseElement>(null);
  const bannerRef = useRef<SVGGElement>(null);
  const pose = useRef({ x: 200, y: 238, s: 1, rot: 0 });
  const chargeObj = useRef({ v: 0 });
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const flightObj = useRef({ tau: 0 });
  const behindRef = useRef(false);

  const d = DISTANCES[kick];
  const wind = winds[kick];
  const windLevel = Math.round(Math.abs(wind) / 0.35);
  const BALL0 = useMemo(() => ({ x: px(0, 0), y: py(BALL_R, 0), s: BALL_R * scaleAt(0) }), []);

  const setAim = useCallback((a: { yaw: number; p: number }) => { aimRef.current = a; setAimState(a); }, []);
  const setModeBoth = (m: Mode) => { modeRef.current = m; setMode(m); };

  const applyPose = useCallback(() => {
    const p = pose.current;
    if (ballRef.current) gsap.set(ballRef.current, { x: p.x, y: p.y, scale: p.s, rotation: p.rot, transformOrigin: '0 0' });
  }, []);
  const placeBall = useCallback((x: number, z: number, h: number, rot: number) => {
    const s = scaleAt(z);
    pose.current = { x: px(x, z), y: py(h + BALL_R, z), s: BALL_R * s, rot };
    applyPose();
    if (shadowRef.current) gsap.set(shadowRef.current, { x: px(x, z), y: py(0, z), scaleX: BALL_R * s * 1.5, scaleY: BALL_R * s * 0.5, opacity: 0.35, transformOrigin: '0 0' });
  }, [applyPose]);

  useEffect(() => { placeBall(0, 0, 0, 0); }, [placeBall]);
  useEffect(() => { gsap.set(bannerRef.current, { opacity: 0 }); }, []);

  // ---- run one kick
  const doKick = useCallback((yaw: number, p: number) => {
    if (!api.active || modeRef.current !== 'aim') return;
    const i = kickRef.current;
    const sim = simulate(yaw, p, winds[i], DISTANCES[i]);
    setModeBoth('fly');
    setDragging(null);
    dragStart.current = null;
    setCharging(false);
    killTweensOf(chargeObj.current);
    setStatus('Kick!');
    const dur = clamp(sim.tEnd * 0.8, 0.8, 1.7);
    behindRef.current = false;
    setBehind(false);
    const fo = flightObj.current;
    fo.tau = 0;
    const spin = reduced ? 0 : 720;
    tween(fo, {
      tau: 1, duration: dur, ease: 'none',
      onUpdate: () => {
        const t = fo.tau * sim.tEnd;
        const q = sim.pos(t);
        placeBall(q.x, q.z, q.y, fo.tau * spin);
        if (!behindRef.current && t >= sim.tc) { behindRef.current = true; setBehind(true); }
      },
      onComplete: () => {
        const good = sim.outcome === 'goal';
        const [big, small] = MSG[sim.outcome];
        setModeBoth('result');
        if (good) {
          goalsRef.current += 1;
          feedback.hit();
          const q = sim.pos(sim.tc);
          confetti.fire(px(q.x, q.z), py(q.y, q.z));
        } else feedback.miss();
        setResults((r) => [...r, good]);
        setMsg({ big, small, good });
        setStatus(`${big} ${small}`);
        const b = bannerRef.current;
        if (b) {
          gsap.set(b, { opacity: 1, scale: reduced ? 1 : 0.6, svgOrigin: '200 120' });
          if (!reduced) tween(b, { scale: 1, duration: 0.3, ease: 'back.out(2)' });
        }
        tween({}, {
          duration: 1.5,
          onComplete: () => {
            if (b) gsap.set(b, { opacity: 0 });
            if (i + 1 >= KICKS) {
              const goals = goalsRef.current;
              const stars = starsForGoals(goals);
              api.finish(stars, `${goals} of ${KICKS} kicks sailed through the posts!`);
              return;
            }
            kickRef.current = i + 1;
            setKick(i + 1);
            setMsg(null);
            setAim({ yaw: 0, p: 0.6 });
            behindRef.current = false;
            setBehind(false);
            placeBall(0, 0, 0, 0);
            setModeBoth('aim');
            setStatus(`Kick ${i + 2} of ${KICKS}, ${DISTANCES[i + 1]} yards.`);
          },
        });
      },
    });
  }, [api, confetti, killTweensOf, placeBall, reduced, setAim, tween, winds]);

  // ---- pointer: slingshot drag back from the ball
  const toAim = useCallback((x0: number, y0: number, x1: number, y1: number) => {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    return { yaw: clamp(-dx / 55, -1, 1) * MAX_YAW, p: clamp(len / MAX_PULL, 0, 1), len };
  }, []);
  usePointerDrag(svgRef, {
    onStart: (i) => {
      if (!api.active || modeRef.current !== 'aim' || !svgRef.current) return false;
      const s = clientToStage(svgRef.current, i.x, i.y);
      dragStart.current = s;
      setCharging(false);
      killTweensOf(chargeObj.current);
      setDragging({ x: 0, y: 0 });
      return true;
    },
    onMove: (i) => {
      const s0 = dragStart.current;
      if (!s0 || !svgRef.current) return;
      const s1 = clientToStage(svgRef.current, i.x, i.y);
      const a = toAim(s0.x, s0.y, s1.x, s1.y);
      setDragging({ x: s1.x - s0.x, y: s1.y - s0.y });
      setAim({ yaw: a.yaw, p: a.p });
    },
    onEnd: (i, cancelled) => {
      const s0 = dragStart.current;
      dragStart.current = null;
      setDragging(null);
      if (!s0 || cancelled || !svgRef.current || !api.active) return;
      const s1 = clientToStage(svgRef.current, i.x, i.y);
      const a = toAim(s0.x, s0.y, s1.x, s1.y);
      if (a.len < 14) { setStatus('Drag back from the ball, then let go to kick.'); return; }
      doKick(a.yaw, a.p);
    },
  });

  // paused: put everything back (drag in flight, key charge)
  useEffect(() => {
    if (api.active) return;
    dragStart.current = null;
    setDragging(null);
    setCharging(false);
    if (modeRef.current === 'aim') killTweensOf(chargeObj.current);
  }, [api.active, killTweensOf]);

  // ---- keyboard: arrows aim, Space charges the power meter, release Space / Enter kicks
  const onKeyDown = (e: React.KeyboardEvent<SVGGElement>) => {
    if (!api.active || modeRef.current !== 'aim') return;
    const a = aimRef.current;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      setAim({ ...a, yaw: clamp(a.yaw + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 3 : 1), -MAX_YAW, MAX_YAW) });
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      setAim({ ...a, p: clamp(a.p + (e.key === 'ArrowUp' ? 0.04 : -0.04), 0.05, 1) });
    } else if (e.key === ' ') {
      e.preventDefault();
      if (e.repeat || charging) return;
      const co = chargeObj.current;
      co.v = 0;
      setCharging(true);
      setAim({ ...aimRef.current, p: 0 });
      tween(co, {
        v: 1, duration: 0.9, ease: 'sine.inOut', yoyo: true, repeat: -1,
        onUpdate: () => setAim({ ...aimRef.current, p: co.v }),
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      doKick(aimRef.current.yaw, aimRef.current.p);
    }
  };
  const onKeyUp = (e: React.KeyboardEvent<SVGGElement>) => {
    if (e.key === ' ' && charging && api.active && modeRef.current === 'aim') {
      e.preventDefault();
      doKick(aimRef.current.yaw, aimRef.current.p);
    }
  };

  // ---- aim guide (no wind): fraction of the flight depends on difficulty
  const guide = useMemo(() => {
    const sim = simulate(aim.yaw, aim.p, 0, d);
    const n = 16;
    const out: { x: number; y: number; r: number }[] = [];
    for (let k = 1; k <= n; k++) {
      const q = sim.pos((k / n) * sim.tc * GUIDE[difficulty]);
      out.push({ x: px(q.x, q.z), y: py(q.y + BALL_R, q.z), r: Math.max(1.4, scaleAt(q.z) * 0.1) });
    }
    return out;
  }, [aim, d, difficulty]);

  const showAim = mode === 'aim';
  const ballEl = (
    <g ref={(el) => { ballRef.current = el; if (el) applyPose(); }} pointerEvents="none">
      <ellipse rx={1.45} ry={0.95} fill={RED} stroke={INK} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      <path d="M-0.55 -0.75 Q-0.7 0 -0.55 0.75 M0.55 -0.75 Q0.7 0 0.55 0.75" fill="none" stroke="#fff" strokeWidth={0.2} />
      <path d="M-0.35 0 H0.35 M-0.2 -0.2 V0.2 M0 -0.2 V0.2 M0.2 -0.2 V0.2" stroke="#fff" strokeWidth={0.12} />
    </g>
  );
  const bx = BALL0.x;
  const by = BALL0.y;
  const handle = dragging ? { x: bx + dragging.x, y: by + dragging.y } : null;

  return (
    <div className="sp-play">
      <div className="sp-hud">
        <span>Kick {Math.min(kick + 1, KICKS)}/{KICKS}</span>
        <Pips results={results} total={KICKS} label={`${results.filter(Boolean).length} goals from ${results.length} kicks`} />
        <span className="sp-grow" />
        <span>{d} yd</span>
      </div>
      <Stage ref={svgRef} width={W} height={H} className="sp-stage" label="Field goal kick. Drag back from the ball to aim, then let go.">
        <Field d={d} />
        <ellipse ref={shadowRef} r={1} rx={1} ry={1} fill={INK} opacity={0} pointerEvents="none" />
        {!behind && ballEl}
        {/* aim guide */}
        {showAim && (
          <g pointerEvents="none">
            {guide.map((g, i) => <circle key={i} cx={g.x} cy={g.y} r={g.r} fill="#fff" stroke={INK} strokeWidth={1.2} />)}
          </g>
        )}
        {behind && ballEl}
        {/* slingshot band + handle */}
        {showAim && handle && (
          <g pointerEvents="none">
            <line x1={bx} y1={by} x2={handle.x} y2={handle.y} stroke={INK} strokeWidth={6} strokeLinecap="round" />
            <line x1={bx} y1={by} x2={handle.x} y2={handle.y} stroke={GOLD} strokeWidth={3} strokeLinecap="round" />
            <circle cx={handle.x} cy={handle.y} r={9} fill={GOLD} stroke={INK} strokeWidth={2.5} />
          </g>
        )}
        {/* power meter */}
        {showAim && (
          <g pointerEvents="none" transform="translate(372 150)">
            <rect x={-8} y={0} width={16} height={90} rx={7} fill="#fff" stroke={INK} strokeWidth={2.5} />
            <rect x={-5} y={87 - 84 * aim.p} width={10} height={Math.max(0, 84 * aim.p)} rx={4} fill={aim.p > 0.85 ? RED : GOLD} />
            <text y={106} textAnchor="middle" fontFamily="'Lilita One', sans-serif" fontSize={11} fill={INK}>POWER</text>
          </g>
        )}
        {/* wind */}
        {difficulty !== 'rookie' && (
          <g className="fg-wind" transform="translate(58 28)" pointerEvents="none">
            <rect x={-52} y={-17} width={104} height={34} rx={10} fill={PAPER} stroke={INK} strokeWidth={2.5} />
            <g transform={`translate(${wind < 0 ? -30 : 30} 0) scale(${wind < 0 ? -1 : 1} 1)`}>
              <path d="M-12 -4 H4 V-10 L16 0 L4 10 V4 H-12 Z" fill={TEAL} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
            </g>
            <text x={wind < 0 ? 16 : -16} y={5} textAnchor="middle" fontSize={12.5} fill={INK} fontFamily="'Lilita One', sans-serif">WIND {windLevel}</text>
          </g>
        )}
        {kick === 0 && showAim && !dragging && !charging && (
          <g pointerEvents="none">
            <rect x={96} y={266} width={208} height={24} rx={12} fill={PAPER} stroke={INK} strokeWidth={2.5} />
            <text className="fg-hint" x={200} y={282} textAnchor="middle" fontSize={12.5} fill={INK}>Drag back from the ball, then let go!</text>
          </g>
        )}
        {/* keyboard focus target */}
        <g
          className="sp-focus" role="button" tabIndex={0} data-game-focus
          aria-label="Kicker. Arrow keys aim, hold Space to charge power, release Space or press Enter to kick."
          onKeyDown={onKeyDown} onKeyUp={onKeyUp}
        >
          <rect x={bx - 36} y={by - 28} width={72} height={56} rx={10} fill="transparent" />
          <rect className="sp-ring" x={bx - 36} y={by - 28} width={72} height={56} rx={10} />
        </g>
        {confetti.node}
        <g ref={bannerRef} opacity={0} pointerEvents="none">
          <rect x={80} y={90} width={240} height={64} rx={16} fill={PAPER} stroke={INK} strokeWidth={3} />
          <text className="sp-msg" x={200} y={124} textAnchor="middle" fontSize={30} fill={msg?.good ? TEAL_DARK : RED} stroke={INK} strokeWidth={1} paintOrder="stroke">{msg?.big}</text>
          <text x={200} y={144} textAnchor="middle" fontSize={12} fontWeight={600} fill={INK} fontFamily="'Rubik', sans-serif">{msg?.small}</text>
        </g>
      </Stage>
      <div className="sr-only" role="status" aria-live="polite">{status}</div>
    </div>
  );
}

/** Fort Burton: field-goal kick with a slingshot aim. */
export function FieldGoal({ difficulty, timeScale, onFinish, paused = false }: ChallengeProps) {
  const diagram = useMemo(() => <HowToDiagram />, []);
  return (
    <MiniGameShell goal={GOALS[difficulty]} diagram={diagram} paused={paused} onFinish={onFinish}>
      {(api) => <Play difficulty={difficulty} timeScale={timeScale} api={api} />}
    </MiniGameShell>
  );
}
