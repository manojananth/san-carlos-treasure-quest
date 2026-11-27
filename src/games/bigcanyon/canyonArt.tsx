import type { ReactNode } from 'react';
import { BRIDGE, COURSE, groundY } from './canyonSim';
import type { Obstacle } from './canyonSim';

/**
 * Original inline-SVG scenery for "Canyon of Echoes". World coordinates: x along the trail, y negative = up
 * (see groundY). Everything is static; the game moves one <g> around.
 */
export const INK = '#1b2430';
const SKY_TOP = '#2ba8a4';
const GRASS = '#8cc16f';
const GRASS_DARK = '#5d9a55';
const DIRT = '#e2b66f';
const SAND = '#e6b783';
const SAND_DARK = '#c98f5a';
const OAK = '#4f9a54';
const BAY = '#2f7152';
const WATER = '#5cc3d6';
const WOOD = '#a8703f';
const WOOD_DARK = '#7a4d28';

const X_MIN = -220;
const X_MAX = COURSE.length + 420;

/** where the trail surface really is: the line, dipping into the creek gully under the bridge */
export function surfaceY(x: number): number {
  const [a, b] = BRIDGE;
  if (x <= a || x >= b) return groundY(x);
  const u = (x - a) / (b - a);
  return groundY(x) + 40 * Math.sin(Math.PI * u) ** 2;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pts = (f: (x: number) => number, x0: number, x1: number, step: number) => {
  const out: string[] = [];
  for (let x = x0; step > 0 ? x <= x1 + 0.01 : x >= x1 - 0.01; x += step) out.push(`${x.toFixed(1)},${f(x).toFixed(1)}`);
  return out;
};
const edge = (f: (x: number) => number, x0 = X_MIN, x1 = X_MAX, step = 12) => pts(f, x0, x1, step);
const poly = (top: string[], bottomY: (x: number) => number, x0 = X_MIN, x1 = X_MAX, step = 12) =>
  [...top, ...pts(bottomY, x1, x0, -step)].join(' ');

// ------------------------------------------------------------------ parallax (screen space)
export function HillLayer({ kind }: { kind: 'far' | 'mid' }) {
  const far = kind === 'far';
  const w = far ? 800 : 1500;
  const y = (x: number) => (far ? 96 : 100) + (far ? 20 : 26) * Math.sin(x / (far ? 85 : 120)) + (far ? 12 : 16) * Math.sin(x / (far ? 37 : 53) + 1.7);
  return (
    <g>
      <polygon points={poly(edge(y, -150, w, 20), () => 700, -150, w, 20)} fill={far ? '#9fd0c8' : '#7dbb8f'} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      {!far && Array.from({ length: 34 }, (_, i) => {
        const x = 20 + i * 44 + ((i * 37) % 17);
        const yy = y(x) + 6;
        return <path key={i} d={`M${x - 6} ${yy + 10} L${x} ${yy - 8} L${x + 6} ${yy + 10} Z`} fill="#4a8f6a" opacity={0.8} />;
      })}
    </g>
  );
}

export function Clouds({ x = 0 }: { x?: number }) {
  return (
    <g fill="#fff" stroke={INK} strokeWidth={2} strokeLinejoin="round" transform={`translate(${x} 0)`}>
      <path d="M40 54 q4 -12 16 -8 q8 -10 20 -2 q14 -2 12 10 z" />
      <path d="M190 34 q4 -10 14 -6 q6 -8 16 -2 q12 0 10 8 z" />
      <path d="M300 78 q4 -10 14 -6 q8 -8 18 0 q10 0 10 8 z" />
    </g>
  );
}

export function SkyBackdrop({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={SKY_TOP} />
          <stop offset="1" stopColor="#e8f6f4" />
        </linearGradient>
      </defs>
      <rect width={400} height={260} fill={`url(#${id}sky)`} />
      <circle cx={338} cy={44} r={15} fill="#f2b632" stroke={INK} strokeWidth={2.5} />
    </g>
  );
}

// ------------------------------------------------------------------ trees
function Oak({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={INK} strokeWidth={2.2 / s} strokeLinejoin="round">
      <path d="M-4 0 L-3 -22 L3 -22 L4 0 Z" fill={WOOD} />
      <circle cx={-12} cy={-28} r={13} fill={OAK} />
      <circle cx={12} cy={-27} r={13} fill={OAK} />
      <circle cx={0} cy={-38} r={15} fill="#5fae5c" />
      <path d="M-6 -42 q4 -4 8 0" fill="none" stroke="#3c7d45" strokeWidth={2 / s} />
    </g>
  );
}
function Bay({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={INK} strokeWidth={2.2 / s} strokeLinejoin="round">
      <path d="M-3 0 L-2 -14 L2 -14 L3 0 Z" fill={WOOD_DARK} />
      <path d="M0 -62 C16 -48 18 -26 8 -12 L-8 -12 C-18 -26 -16 -48 0 -62 Z" fill={BAY} />
      <path d="M-4 -44 L1 -38 M3 -30 L-2 -24 M4 -46 L8 -40" fill="none" stroke="#5aa57f" strokeWidth={2 / s} strokeLinecap="round" />
    </g>
  );
}

const inGully = (x: number) => x > BRIDGE[0] - 40 && x < BRIDGE[1] + 40;

export function Trees({ front }: { front: boolean }) {
  const r = rng(front ? 91 : 17);
  const items: ReactNode[] = [];
  for (let x = front ? 140 : 60; x < COURSE.length + 300; x += front ? 150 + r() * 120 : 46 + r() * 70) {
    if (inGully(x)) continue;
    const s = front ? 1.05 + r() * 0.35 : 0.65 + r() * 0.5;
    const y = front ? groundY(x) + 34 + r() * 26 : groundY(x) - 2 - r() * 6;
    items.push(r() > 0.5 ? <Oak key={x} x={x} y={y} s={s} /> : <Bay key={x} x={x} y={y} s={s * 1.05} />);
  }
  return <g>{items}</g>;
}

// ------------------------------------------------------------------ terrain
export function Terrain() {
  const cliffTop = (x: number) => groundY(x) - 46 - 26 * Math.abs(Math.sin(x / 230)) - 8 * Math.sin(x / 21 + 1) - 8 * Math.sin(x / 9);
  const creek = (x: number) => surfaceY(x) + 78 + 6 * Math.sin(x / 40);
  const strata = [28, 54, 80].map((dy) => edge((x) => cliffTop(x) + dy + 5 * Math.sin(x / 33 + dy), X_MIN, X_MAX, 24).join(' '));
  return (
    <g>
      {/* sandstone canyon wall behind the trail */}
      <polygon points={poly(edge(cliffTop), (x) => groundY(x) + 50)} fill={SAND} />
      {strata.map((p, i) => <polyline key={i} points={p} fill="none" stroke={SAND_DARK} strokeWidth={2.4} strokeLinejoin="round" opacity={0.8} />)}
      <polyline points={edge(cliffTop).join(' ')} fill="none" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      <Trees front={false} />
      {/* hillside + trail */}
      <polygon points={poly(edge(surfaceY, X_MIN, X_MAX, 8), (x) => surfaceY(x) + 900, X_MIN, X_MAX, 8)} fill={GRASS} />
      <polyline points={edge((x) => surfaceY(x) + 38, X_MIN, X_MAX, 24).join(' ')} fill="none" stroke={GRASS_DARK} strokeWidth={2.4} strokeDasharray="10 14" />
      {/* the creek, running down the hill beside the trail */}
      <polyline points={edge(creek, X_MIN, X_MAX, 16).join(' ')} fill="none" stroke={INK} strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={edge(creek, X_MIN, X_MAX, 16).join(' ')} fill="none" stroke={WATER} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={edge((x) => creek(x) - 1, X_MIN, X_MAX, 16).join(' ')} fill="none" stroke="#fff" strokeWidth={1.8} strokeDasharray="6 30" strokeLinecap="round" />
      {/* dirt trail band */}
      <polygon points={poly(edge(surfaceY, X_MIN, X_MAX, 8), (x) => surfaceY(x) + 15, X_MIN, X_MAX, 8)} fill={DIRT} />
      <polyline points={edge((x) => surfaceY(x) + 8, X_MIN, X_MAX, 16).join(' ')} fill="none" stroke="#c99a52" strokeWidth={2} strokeDasharray="14 20" />
      <polyline points={edge(surfaceY, X_MIN, X_MAX, 8).join(' ')} fill="none" stroke={INK} strokeWidth={2.8} strokeLinejoin="round" />
      {/* creek in the gully under the bridge */}
      <polyline points={edge((x) => surfaceY(x) + 3, BRIDGE[0] + 20, BRIDGE[1] - 20, 8).join(' ')} fill="none" stroke={WATER} strokeWidth={7} strokeLinecap="round" />
      <polyline points={edge((x) => surfaceY(x) + 1, BRIDGE[0] + 24, BRIDGE[1] - 24, 8).join(' ')} fill="none" stroke="#fff" strokeWidth={1.8} strokeDasharray="5 11" strokeLinecap="round" />
    </g>
  );
}

export function Bridge() {
  const [a, b] = BRIDGE;
  const deckTop = (x: number) => groundY(x);
  const deckBot = (x: number) => groundY(x) + 8;
  const planks: ReactNode[] = [];
  for (let x = a + 6; x < b; x += 10) planks.push(<line key={x} x1={x} y1={deckTop(x)} x2={x} y2={deckBot(x)} stroke={WOOD_DARK} strokeWidth={1.5} />);
  const posts: ReactNode[] = [];
  for (let x = a + 2; x <= b + 0.1; x += 32) posts.push(<line key={x} x1={x} y1={deckTop(x)} x2={x} y2={deckTop(x) - 20} stroke={INK} strokeWidth={5} strokeLinecap="round" />, <line key={`p${x}`} x1={x} y1={deckTop(x)} x2={x} y2={deckTop(x) - 20} stroke={WOOD} strokeWidth={2.2} strokeLinecap="round" />);
  const rail = (dy: number) => edge((x) => deckTop(x) - dy, a + 2, b + 2, 16).join(' ');
  return (
    <g>
      {[a + 36, a + 80, b - 36].map((x) => (
        <g key={x}>
          <line x1={x} y1={deckBot(x)} x2={x} y2={surfaceY(x) + 6} stroke={INK} strokeWidth={9} strokeLinecap="round" />
          <line x1={x} y1={deckBot(x)} x2={x} y2={surfaceY(x) + 6} stroke={WOOD_DARK} strokeWidth={5} strokeLinecap="round" />
        </g>
      ))}
      <polygon points={poly(edge(deckTop, a, b, 8), deckBot, a, b, 8)} fill={WOOD} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      {planks}
      {posts}
      <polyline points={rail(20)} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
      <polyline points={rail(20)} fill="none" stroke={WOOD} strokeWidth={2.2} strokeLinecap="round" />
      <polyline points={rail(10)} fill="none" stroke={INK} strokeWidth={4.2} strokeLinecap="round" />
      <polyline points={rail(10)} fill="none" stroke={WOOD} strokeWidth={1.8} strokeLinecap="round" />
    </g>
  );
}

// ------------------------------------------------------------------ props
export function ObstacleArt({ o }: { o: Obstacle }) {
  return o.kind === 'root' ? (
    <g stroke={INK} strokeWidth={2.2} strokeLinejoin="round">
      <path d="M-12 1 C-10 -9 -3 -12 0 -4 C3 -13 9 -10 12 1 Z" fill="#8a5a33" />
      <path d="M-6 -6 q3 -3 5 0 M4 -7 q3 -2 4 1" fill="none" stroke="#b9855a" strokeWidth={1.4} />
    </g>
  ) : (
    <g stroke={INK} strokeWidth={2.2} strokeLinejoin="round">
      <path d="M-11 1 L-9 -8 L-3 -14 L5 -15 L10 -7 L12 1 Z" fill="#a9b0b8" />
      <path d="M-3 -14 L-1 -7 L-9 -8 M5 -15 L3 -6 L10 -7" fill="none" strokeWidth={1.6} stroke="#6d7782" />
      <path d="M-6 -11 L-2 -12" stroke="#e8edf1" strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

export function GemArt() {
  return (
    <g stroke={INK} strokeWidth={1.8} strokeLinejoin="round">
      <path d="M0 -9 L7 0 L0 9 L-7 0 Z" fill="#2ba8a4" />
      <path d="M0 -9 L7 0 L0 0 Z" fill="#5fd0cb" stroke="none" />
      <path d="M-3 -3 L0 -6" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

export function Signs() {
  const x0 = 34;
  const xs = COURSE.length;
  return (
    <g stroke={INK} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round">
      {/* trailhead sign */}
      <g transform={`translate(${x0} ${groundY(x0)})`}>
        <line x1={0} y1={0} x2={0} y2={-44} stroke={WOOD_DARK} strokeWidth={5} />
        <path d="M-26 -62 H20 L30 -53 L20 -44 H-26 Z" fill="#f2b632" />
        <text x={-3} y={-48.5} textAnchor="middle" fontFamily="'Lilita One', sans-serif" fontSize={10} fill={INK} stroke="none">CANYON TRAIL</text>
      </g>
      {/* summit cairn + flag */}
      <g transform={`translate(${xs} ${groundY(xs)})`}>
        <path d="M-22 2 L-18 -10 L18 -10 L22 2 Z" fill="#a9b0b8" />
        <path d="M-15 -10 L-12 -20 L12 -20 L15 -10 Z" fill="#c4cad0" />
        <path d="M-8 -20 L-5 -28 L6 -28 L8 -20 Z" fill="#a9b0b8" />
        <line x1={0} y1={-28} x2={0} y2={-84} stroke={WOOD_DARK} strokeWidth={5} />
        <path d="M2 -84 L36 -76 L2 -64 Z" fill="#c8372d" />
        <circle cx={0} cy={-86} r={4} fill="#f2b632" />
        <path d="M-44 -4 H-18 L-12 -12 L-18 -20 H-44 Z" fill="#f2b632" transform="translate(-4 -2)" />
        <text x={-34} y={-18} textAnchor="middle" fontFamily="'Lilita One', sans-serif" fontSize={9} fill={INK} stroke="none">SUMMIT</text>
      </g>
    </g>
  );
}

export function Tufts() {
  const r = rng(5);
  const out: ReactNode[] = [];
  for (let x = 40; x < COURSE.length + 200; x += 38 + r() * 40) {
    if (inGully(x)) continue;
    const y = surfaceY(x) + 20 + r() * 16;
    out.push(<path key={x} d={`M${x - 5} ${y} L${x - 3} ${y - 8} L${x} ${y - 3} L${x + 3} ${y - 9} L${x + 5} ${y}`} fill="none" stroke={GRASS_DARK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />);
  }
  const rocks = [180, 520, 880, 1240, 1860, 2260, 2590].map((x) => (
    <ellipse key={x} cx={x} cy={surfaceY(x) + 30} rx={9} ry={5} fill="#b8bec5" stroke={INK} strokeWidth={2} />
  ));
  return <g>{out}{rocks}</g>;
}
