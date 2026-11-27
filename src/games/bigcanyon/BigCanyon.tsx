import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ChallengeProps } from '../types';
import type { Difficulty } from '../../state/types';
import { MiniGameShell, Stage, feedback, starsFor, useLoop } from '../kit';
import type { ShellApi } from '../kit';
import { EXPLORER_SVG } from '../../components/explorerSvg';
import {
  BASE_SECONDS, COURSE, GEM_BONUS, STAR_SCORE, WIN_COAST, createSim, groundAngle, groundY, pressJump, remainingSeconds, scoreOf, stepSim,
} from './canyonSim';
import {
  Bridge, Clouds, GemArt, HillLayer, INK, ObstacleArt, Signs, SkyBackdrop, Terrain, Trees, Tufts,
} from './canyonArt';
import './BigCanyon.css';

const W = 400;
const H = 260;
const RUN_SX = 110; // where the explorer stands on screen
const RUN_SY = 185;
const SHAKE_TIME = 0.3;
const RIPPLES = 4;

const RUNNER_INNER = EXPLORER_SVG.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

const GOALS: Record<Difficulty, string> = {
  rookie: 'Run up the canyon! Tap or press Space to jump roots and rocks. Grab echo-gems for extra time.',
  pro: 'Beat the clock to the summit! Tap or press Space to jump roots and rocks. Gems add time.',
  legend: 'Tight clock! Jump every root and rock, grab gems, and hold to run a bit faster.',
};

function HowToDiagram() {
  return (
    <svg viewBox="0 0 220 68" role="presentation">
      <rect x={1.5} y={1.5} width={217} height={65} rx={12} fill="#e8f6f4" stroke={INK} strokeWidth={3} />
      <path d="M2 54 L218 26 L218 66 L2 66 Z" fill="#e2b66f" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M2 54 L218 26" stroke={INK} strokeWidth={3} />
      <g transform="translate(146 35) rotate(-8)" stroke={INK} strokeWidth={2.2} strokeLinejoin="round">
        <path d="M-12 1 L-10 -8 L-3 -14 L5 -15 L10 -7 L12 1 Z" fill="#a9b0b8" />
      </g>
      <g transform="translate(52 46) rotate(-8) scale(.46) translate(-32 -77)" dangerouslySetInnerHTML={{ __html: RUNNER_INNER }} />
      <path d="M66 20 Q104 -2 138 20" fill="none" stroke="#c8372d" strokeWidth={4} strokeLinecap="round" strokeDasharray="1 9" />
      <path d="M138 20 L130 17 M138 20 L137 28" fill="none" stroke="#c8372d" strokeWidth={4} strokeLinecap="round" />
      <g transform="translate(100 12)" stroke={INK} strokeWidth={1.8} strokeLinejoin="round"><path d="M0 -8 L6 0 L0 8 L-6 0 Z" fill="#2ba8a4" /></g>
      <text x={188} y={15} textAnchor="middle" fontFamily="'Lilita One', sans-serif" fontSize={12} fill={INK}>SUMMIT</text>
    </svg>
  );
}

interface Hud { remaining: number; gems: number; stumbles: number; pop: boolean }

function Play({ difficulty: _difficulty, timeScale, api }: { difficulty: Difficulty; timeScale: number; api: ShellApi }) {
  const limit = BASE_SECONDS * timeScale;
  const reduced = api.reducedMotion;
  const apiRef = useRef(api);
  apiRef.current = api;

  const sim = useRef(createSim());
  const held = useRef(false);
  const ended = useRef(false);
  const shake = useRef(0);
  const lastGemT = useRef(-9);
  const ripples = useRef<{ x: number; y: number; age: number }[]>([]);
  const hudKey = useRef('');
  const [hud, setHud] = useState<Hud>({ remaining: limit, gems: 0, stumbles: 0, pop: false });
  const [status, setStatus] = useState('');

  const farRef = useRef<SVGGElement>(null);
  const midRef = useRef<SVGGElement>(null);
  const cloudRef = useRef<SVGGElement>(null);
  const worldRef = useRef<SVGGElement>(null);
  const runnerRef = useRef<SVGGElement>(null);
  const shadowRef = useRef<SVGEllipseElement>(null);
  const oofRef = useRef<SVGTextElement>(null);
  const hintRef = useRef<SVGTextElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const gemEls = useRef<(SVGGElement | null)[]>([]);
  const rippleEls = useRef<(SVGCircleElement | null)[]>([]);
  const legs = useRef<{ f: Element | null; b: Element | null }>({ f: null, b: null });

  // ---------------------------------------------------------------- drawing (direct DOM writes, no React per frame)
  const draw = useCallback(() => {
    const s = sim.current;
    const x = s.x;
    const camX = x - RUN_SX;
    const camY = -0.35 * x - RUN_SY;
    let sx = 0;
    let sy = 0;
    if (!reduced && shake.current > 0) {
      const k = shake.current / SHAKE_TIME;
      sx = Math.sin(s.t * 95) * 3 * k;
      sy = Math.cos(s.t * 80) * 2 * k;
    }
    worldRef.current?.setAttribute('transform', `translate(${(-camX + sx).toFixed(1)} ${(-camY + sy).toFixed(1)})`);
    farRef.current?.setAttribute('transform', `translate(${(-camX * 0.1).toFixed(1)} ${(-camY * 0.05).toFixed(1)})`);
    midRef.current?.setAttribute('transform', `translate(${(-camX * 0.3).toFixed(1)} ${(-camY * 0.11).toFixed(1)})`);
    if (!reduced) cloudRef.current?.setAttribute('transform', `translate(${(-camX * 0.04).toFixed(1)} 0)`);

    const gy = groundY(x);
    const stumbling = s.stumbleT > 0;
    const ang = groundAngle(x) + (stumbling ? 12 : 0);
    runnerRef.current?.setAttribute('transform', `translate(${x.toFixed(1)} ${(gy - s.h).toFixed(1)}) rotate(${ang.toFixed(1)}) scale(.62) translate(-32 -77)`);
    const sh = shadowRef.current;
    if (sh) {
      sh.setAttribute('cx', x.toFixed(1));
      sh.setAttribute('cy', (gy + 1).toFixed(1));
      sh.setAttribute('rx', Math.max(4, 10 - s.h * 0.1).toFixed(1));
    }
    const swing = s.h > 0 ? 22 : stumbling ? 6 : Math.sin(x * 0.17) * 28;
    legs.current.f?.setAttribute('transform', `rotate(${swing.toFixed(0)} 36 58)`);
    legs.current.b?.setAttribute('transform', `rotate(${(s.h > 0 ? -18 : -swing).toFixed(0)} 30 58)`);
    const oof = oofRef.current;
    if (oof) {
      oof.setAttribute('x', x.toFixed(1));
      oof.setAttribute('y', (gy - s.h - 52).toFixed(1));
      oof.style.display = stumbling ? 'block' : 'none';
    }
    ripples.current.forEach((r, i) => {
      const el = rippleEls.current[i];
      if (!el) return;
      if (r.age >= 0.6) { el.style.display = 'none'; return; }
      el.style.display = 'block';
      el.setAttribute('cx', r.x.toFixed(1));
      el.setAttribute('cy', r.y.toFixed(1));
      el.setAttribute('r', (6 + r.age * 44).toFixed(1));
      el.setAttribute('opacity', (1 - r.age / 0.6).toFixed(2));
    });
    const hint = hintRef.current;
    if (hint) hint.style.opacity = s.t < 4 && s.stumbles === 0 && x < 380 ? '1' : '0';
    dotRef.current?.setAttribute('cx', ((x / COURSE.length) * 252).toFixed(1));

    // HUD: React state only when a visible number changes (about 10 per second)
    const remaining = Math.max(0, s.won ? limit + s.bonus - s.wonAt : remainingSeconds(s, limit));
    const pop = s.t - lastGemT.current < 0.9;
    const key = `${(remaining * 10) | 0}|${s.gems}|${s.stumbles}|${pop}`;
    if (key !== hudKey.current) {
      hudKey.current = key;
      setHud({ remaining, gems: s.gems, stumbles: s.stumbles, pop });
    }
  }, [limit, reduced]);

  useLayoutEffect(() => {
    const g = runnerRef.current;
    legs.current = { f: g?.querySelector('.leg-f') ?? null, b: g?.querySelector('.leg-b') ?? null };
    draw();
  }, [draw]);

  // ---------------------------------------------------------------- simulation
  const step = useCallback((dt: number) => {
    if (ended.current) return;
    const s = sim.current;
    stepSim(s, dt, held.current);
    if (shake.current > 0) shake.current = Math.max(0, shake.current - dt);
    for (const r of ripples.current) r.age += dt;
    for (const e of s.events.splice(0)) {
      if (e === 'gem') {
        feedback.tick();
        lastGemT.current = s.t;
        setStatus(`Echo-gem! ${s.gems} so far, plus ${GEM_BONUS} seconds.`);
      } else if (e === 'stumble') {
        feedback.miss();
        shake.current = SHAKE_TIME;
        setStatus('Stumble! Slowing down for a moment.');
      }
    }
    for (const i of s.collected.splice(0)) {
      gemEls.current[i]?.setAttribute('display', 'none');
      const g = COURSE.gems[i];
      const slot = ripples.current.reduce((best, r, k, a) => (r.age > a[best].age ? k : best), 0);
      ripples.current[slot] = { x: g.x, y: groundY(g.x) - g.h, age: 0 };
    }
    if (s.won) {
      if (s.t - s.wonAt >= WIN_COAST) {
        ended.current = true;
        const left = limit + s.bonus - s.wonAt;
        const stars = starsFor(scoreOf(s, limit, left), STAR_SCORE);
        const m = s.stumbles;
        const detail = `${m === 0 ? 'No stumbles' : `${m} ${m === 1 ? 'stumble' : 'stumbles'}`}, ${s.gems} echo-gems, ${left.toFixed(1)} s to spare.`;
        apiRef.current.finish(stars, `${stars === 3 ? 'Summit! The canyon echoes your name. ' : 'You made it to the summit! '}${detail}`);
      }
    } else if (remainingSeconds(s, limit) <= 0) {
      ended.current = true;
      apiRef.current.finish(1, `So close! The summit was just ahead. You grabbed ${s.gems} echo-gems. Try again!`);
    }
  }, [limit]);

  useLoop(step, draw, api.active);

  // ---------------------------------------------------------------- input: tap / click / Space jump, hold = run a bit faster
  const jump = useCallback(() => { if (apiRef.current.active) pressJump(sim.current); }, []);
  useEffect(() => { if (!api.active) held.current = false; }, [api.active]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!api.active || (e.pointerType === 'mouse' && e.button !== 0)) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    held.current = true;
    jump();
  };
  const release = () => { held.current = false; };
  const isJumpKey = (k: string) => k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W';
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!api.active) return;
    if (isJumpKey(e.key)) {
      e.preventDefault();
      held.current = true;
      if (!e.repeat) jump();
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      held.current = true;
    }
  };
  const onKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isJumpKey(e.key) || e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') release();
  };

  // ---------------------------------------------------------------- scene (static; memoised so React never touches it again)
  const scene = useMemo(() => (
    <>
      <Terrain />
      <Tufts />
      <Bridge />
      <Signs />
      {COURSE.obstacles.map((o, i) => (
        <g key={`o${i}`} transform={`translate(${o.x} ${groundY(o.x) + 1}) rotate(${groundAngle(o.x).toFixed(1)})`}><ObstacleArt o={o} /></g>
      ))}
    </>
  ), []);
  const frontTrees = useMemo(() => <Trees front />, []);

  const low = hud.remaining / limit < 0.25;

  return (
    <div className="bc-play">
      <div className="mg-hud">
        <div className="mg-bar" aria-hidden="true"><div className={`mg-bar-fill${low ? ' low' : ''}`} style={{ width: `${Math.min(1, hud.remaining / limit) * 100}%` }} /></div>
        <span className="bc-time">{hud.remaining.toFixed(1)}s{hud.pop ? <b style={{ color: 'var(--teal-dark)' }}> +{GEM_BONUS}</b> : null}</span>
        <span>Gems {hud.gems}</span>
        <span>Oops {hud.stumbles}</span>
      </div>
      <div
        className="bc-field"
        tabIndex={0}
        data-game-focus=""
        role="button"
        aria-label="Canyon trail. Tap, click or press Space to jump. Hold to run a little faster."
        onPointerDown={onPointerDown}
        onPointerUp={release}
        onPointerCancel={release}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
      >
        <Stage width={W} height={H} label="Canyon trail running up and to the right. The explorer runs by itself; jump over roots and rocks.">
          <SkyBackdrop id="bc" />
          <g ref={farRef}><HillLayer kind="far" /></g>
          {!reduced && <g ref={midRef}><HillLayer kind="mid" /></g>}
          <g ref={cloudRef}><Clouds /><Clouds x={420} /></g>
          <g>
            <g ref={worldRef}>
              {scene}
              <ellipse ref={shadowRef} cx={0} cy={0} rx={10} ry={2.6} fill={INK} opacity={0.28} />
              {COURSE.gems.map((g, i) => (
                <g key={`g${i}`} ref={(el) => { gemEls.current[i] = el; }} transform={`translate(${g.x} ${groundY(g.x) - g.h})`}><GemArt /></g>
              ))}
              {Array.from({ length: RIPPLES }, (_, i) => (
                <circle key={i} ref={(el) => { rippleEls.current[i] = el; }} r={6} fill="none" stroke="#2ba8a4" strokeWidth={3} style={{ display: 'none' }} />
              ))}
              <g ref={runnerRef} dangerouslySetInnerHTML={{ __html: RUNNER_INNER }} />
              <text ref={oofRef} className="bc-text" fontSize={15} textAnchor="middle" style={{ display: 'none' }}>Oof!</text>
              {frontTrees}
            </g>
          </g>
          {/* fixed overlay: progress strip + hint */}
          <g transform="translate(74 16)" pointerEvents="none">
            <line x1={0} y1={0} x2={252} y2={0} stroke={INK} strokeWidth={7} strokeLinecap="round" />
            <line x1={0} y1={0} x2={252} y2={0} stroke="#fff7e3" strokeWidth={3.5} strokeLinecap="round" />
            <path d="M252 -14 V4" stroke={INK} strokeWidth={2.5} /><path d="M252 -14 L266 -10 L252 -5 Z" fill="#c8372d" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
            <circle ref={dotRef} cx={0} cy={0} r={6} fill="#f2b632" stroke={INK} strokeWidth={2.5} />
          </g>
          <text ref={hintRef} className="bc-text" x={200} y={238} fontSize={17} textAnchor="middle" style={{ transition: 'opacity .3s' }}>Tap or press Space to jump!</text>
        </Stage>
      </div>
      <div className="sr-only" role="status" aria-live="polite">{status}</div>
    </div>
  );
}

/** Big Canyon Park: race up the canyon trail to the summit before the clock runs out. */
export function BigCanyon({ difficulty, timeScale, onFinish, paused = false }: ChallengeProps) {
  const diagram = useMemo(() => <HowToDiagram />, []);
  return (
    <MiniGameShell goal={GOALS[difficulty]} diagram={diagram} paused={paused} onFinish={onFinish}>
      {(api) => <Play difficulty={difficulty} timeScale={timeScale} api={api} />}
    </MiniGameShell>
  );
}
