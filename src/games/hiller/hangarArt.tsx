import type { ReactNode } from 'react';
import { ANCHOR, FLOOR_Y, RINGS, RING_R, UNITS_PER_M, WALL_X } from './glide';

/**
 * Original inline-SVG art for "Sky Hangar": an aircraft-museum hangar (world is 960 wide, the stage scrolls over it).
 * Banners carry generic words only, no logos.
 */
export const INK = '#1b2430';
const RED = '#c8372d';
const TEAL = '#2ba8a4';
const TEAL_DARK = '#1f8582';
const GOLD = '#f2b632';
const PAPER = '#fff7e3';
const WALL = '#d3e6e2';
const WALL_RIB = '#b7d0cb';
const FLOOR = '#e0d5b8';
export const WORLD_W = 960;

const SIL = '#34576a'; // museum-piece silhouette colour

function Banner({ x, y = 18, w = 46, h = 56, color, text, tilt = 0 }: { x: number; y?: number; w?: number; h?: number; color: string; text: string; tilt?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt})`} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round">
      <line x1={-w / 2 + 4} y1={0} x2={-w / 2 + 4} y2={-8} />
      <line x1={w / 2 - 4} y1={0} x2={w / 2 - 4} y2={-8} />
      <path d={`M${-w / 2} 0 H${w / 2} V${h} L0 ${h - 12} L${-w / 2} ${h} Z`} fill={color} />
      <text x={0} y={h / 2 - 2} textAnchor="middle" fontFamily="'Lilita One', sans-serif" fontSize={11} fill={PAPER} stroke="none">{text}</text>
      <path d={`M${-w / 2 + 5} ${h - 22} H${w / 2 - 5}`} stroke={GOLD} strokeWidth={2.4} />
    </g>
  );
}

function Biplane({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={INK} strokeWidth={2 / s} strokeLinejoin="round" strokeLinecap="round">
      <line x1={-14} y1={-6} x2={-14} y2={-30} strokeWidth={1.4 / s} /><line x1={16} y1={-6} x2={16} y2={-30} strokeWidth={1.4 / s} />
      <path d="M-34 4 Q-34 -3 -22 -4 L26 -2 Q36 0 34 5 Q20 10 -22 8 Q-34 8 -34 4 Z" fill={SIL} />
      <path d="M-34 4 L-46 -6 L-42 8 Z" fill={SIL} /><path d="M-40 -2 L-46 -12 L-36 0 Z" fill={SIL} />
      <rect x={-26} y={-14} width={56} height={7} rx={2} fill={SIL} />
      <rect x={-26} y={9} width={50} height={6} rx={2} fill={SIL} />
      <line x1={-18} y1={-7} x2={-18} y2={9} /><line x1={20} y1={-7} x2={20} y2={9} />
      <line x1={36} y1={-8} x2={36} y2={16} strokeWidth={2.4 / s} />
      <path d="M-6 8 L-8 20 M8 8 L10 20" /><circle cx={-8} cy={22} r={4} fill={SIL} /><circle cx={10} cy={22} r={4} fill={SIL} />
    </g>
  );
}

function Helicopter({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={INK} strokeWidth={2 / s} strokeLinejoin="round" strokeLinecap="round">
      <line x1={-34} y1={-24} x2={34} y2={-24} strokeWidth={3 / s} />
      <line x1={0} y1={-24} x2={0} y2={-14} />
      <path d="M-18 -4 Q-18 -16 0 -14 Q16 -14 20 -4 Q20 10 4 10 L-12 10 Q-18 10 -18 -4 Z" fill={SIL} />
      <path d="M-18 -2 L-52 -8 L-52 -2 L-18 6 Z" fill={SIL} />
      <path d="M-52 -14 L-50 2" strokeWidth={3 / s} />
      <path d="M4 -10 Q14 -10 15 -3 L4 -3 Z" fill="#cfe9e7" strokeWidth={1.4 / s} />
      <path d="M-14 14 H18 M-8 10 L-8 14 M10 10 L10 14" />
    </g>
  );
}

/** the big sliding doors, open on a sunny day */
function Doors({ x }: { x: number }) {
  const w = 168;
  const top = 80;
  return (
    <g strokeLinejoin="round">
      <defs>
        <linearGradient id={`hlsky${x}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={TEAL} /><stop offset="1" stopColor="#e8f6f4" /></linearGradient>
      </defs>
      <rect x={x} y={top} width={w} height={FLOOR_Y - top} fill={`url(#hlsky${x})`} />
      <circle cx={x + 120} cy={top + 30} r={10} fill={GOLD} stroke={INK} strokeWidth={2} />
      <path d={`M${x} ${FLOOR_Y - 26} Q${x + 40} ${FLOOR_Y - 48} ${x + 84} ${FLOOR_Y - 30} Q${x + 130} ${FLOOR_Y - 52} ${x + w} ${FLOOR_Y - 28} V${FLOOR_Y} H${x} Z`} fill="#8cc16f" stroke={INK} strokeWidth={2} />
      <path d={`M${x + 20} ${top + 46} q4 -9 14 -5 q6 -7 15 -1 q10 0 9 7 z`} fill="#fff" stroke={INK} strokeWidth={1.8} />
      {/* door leaves slid to the sides */}
      <rect x={x - 22} y={top - 2} width={30} height={FLOOR_Y - top + 2} fill="#9db3ad" stroke={INK} strokeWidth={2.4} />
      <rect x={x + w - 8} y={top - 2} width={30} height={FLOOR_Y - top + 2} fill="#9db3ad" stroke={INK} strokeWidth={2.4} />
      {[0.25, 0.5, 0.75].map((f) => <g key={f}><line x1={x - 22} y1={top + (FLOOR_Y - top) * f} x2={x + 8} y2={top + (FLOOR_Y - top) * f} stroke={INK} strokeWidth={1.6} /><line x1={x + w - 8} y1={top + (FLOOR_Y - top) * f} x2={x + w + 22} y2={top + (FLOOR_Y - top) * f} stroke={INK} strokeWidth={1.6} /></g>)}
      <rect x={x - 22} y={top - 12} width={w + 44} height={12} fill={GOLD} stroke={INK} strokeWidth={2.4} />
      {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${x - 22 + i * 16 + 4} ${top - 12} l8 0 l-8 12 l-8 0 z`} fill={INK} />)}
      <rect x={x} y={top} width={w} height={FLOOR_Y - top} fill="none" stroke={INK} strokeWidth={2.4} />
    </g>
  );
}

export function Hangar() {
  const ribs: ReactNode[] = [];
  for (let x = 0; x <= WORLD_W; x += 16) ribs.push(<line key={x} x1={x} y1={22} x2={x} y2={FLOOR_Y} stroke={WALL_RIB} strokeWidth={2} />);
  const trusses: ReactNode[] = [];
  for (let x = 0; x < WORLD_W; x += 80) trusses.push(<path key={x} d={`M${x} 0 L${x + 40} 20 L${x + 80} 0`} fill="none" stroke="#5b7184" strokeWidth={3} />);
  const marks: ReactNode[] = [];
  const total = Math.floor((WALL_X - ANCHOR.x) / (UNITS_PER_M * 10));
  for (let k = 0; k <= total; k++) {
    const x = ANCHOR.x + k * UNITS_PER_M * 10;
    marks.push(
      <g key={k}>
        {k % 2 === 0 && <rect x={x} y={FLOOR_Y} width={UNITS_PER_M * 10} height={12} fill="#cdbf9b" />}
        <line x1={x} y1={FLOOR_Y} x2={x} y2={FLOOR_Y + (k % 5 === 0 ? 16 : 12)} stroke={INK} strokeWidth={k % 5 === 0 ? 3 : 2} />
        {k > 0 && <text x={x + 2} y={FLOOR_Y + 25} fontFamily="'Lilita One', sans-serif" fontSize={k % 5 === 0 ? 13 : 10.5} fill={k % 5 === 0 ? RED : INK} textAnchor="middle" transform={`translate(${-2} 0)`}>{k * 10}{k % 5 === 0 ? 'm' : ''}</text>}
      </g>,
    );
  }
  return (
    <g>
      <rect x={0} y={0} width={WORLD_W} height={FLOOR_Y} fill={WALL} />
      {ribs}
      <rect x={0} y={0} width={WORLD_W} height={22} fill="#2e3f4f" />
      {trusses}
      <line x1={0} y1={22} x2={WORLD_W} y2={22} stroke={INK} strokeWidth={3} />
      <Doors x={150} />
      <Doors x={590} />
      <Banner x={40} color={RED} text="AIR SHOW" w={52} />
      <Banner x={118} color={TEAL_DARK} text="WINGS" tilt={-2} />
      <Banner x={395} color={GOLD} text="SOAR" h={50} />
      <Banner x={500} color={RED} text="FLY HIGH" w={58} tilt={2} />
      <Banner x={560} color={TEAL_DARK} text="GLIDE" tilt={-1.5} />
      <Banner x={845} color={RED} text="WINGS" />
      {/* hanging museum aircraft */}
      <g><line x1={300} y1={22} x2={290} y2={36} stroke={INK} strokeWidth={1.6} /><line x1={330} y1={22} x2={338} y2={36} stroke={INK} strokeWidth={1.6} /><Biplane x={318} y={56} s={0.9} /></g>
      <g><line x1={690} y1={22} x2={690} y2={34} stroke={INK} strokeWidth={1.6} /><Helicopter x={692} y={54} s={0.85} /></g>
      <g><line x1={760} y1={22} x2={760} y2={38} stroke={INK} strokeWidth={1.6} /><Biplane x={780} y={60} s={0.7} /></g>
      <g><line x1={215} y1={22} x2={215} y2={40} stroke={INK} strokeWidth={1.6} /><Helicopter x={216} y={58} s={0.6} /></g>
      {/* floor */}
      <rect x={0} y={FLOOR_Y} width={WORLD_W} height={260 - FLOOR_Y} fill={FLOOR} />
      {marks}
      <line x1={0} y1={FLOOR_Y} x2={WORLD_W} y2={FLOOR_Y} stroke={INK} strokeWidth={3} />
      {/* crash mats at the far wall */}
      <rect x={WALL_X} y={FLOOR_Y - 60} width={WORLD_W - WALL_X + 40} height={60} fill={TEAL} stroke={INK} strokeWidth={3} />
      {[1, 2, 3].map((i) => <line key={i} x1={WALL_X} y1={FLOOR_Y - i * 15} x2={WORLD_W + 40} y2={FLOOR_Y - i * 15} stroke={INK} strokeWidth={1.6} opacity={0.5} />)}
      {/* launch tower */}
      <g stroke={INK} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round">
        <rect x={ANCHOR.x - 22} y={FLOOR_Y - 8} width={44} height={8} rx={2} fill="#7a4d28" />
        <path d={`M${ANCHOR.x - 5} ${FLOOR_Y - 8} V${ANCHOR.y + 22} H${ANCHOR.x + 5} V${FLOOR_Y - 8} Z`} fill="#a8703f" />
        <path d={`M${ANCHOR.x} ${ANCHOR.y + 24} L${ANCHOR.x - 10} ${ANCHOR.y + 4} M${ANCHOR.x} ${ANCHOR.y + 24} L${ANCHOR.x + 10} ${ANCHOR.y + 4}`} strokeWidth={6} stroke={INK} fill="none" />
        <path d={`M${ANCHOR.x} ${ANCHOR.y + 24} L${ANCHOR.x - 10} ${ANCHOR.y + 4} M${ANCHOR.x} ${ANCHOR.y + 24} L${ANCHOR.x + 10} ${ANCHOR.y + 4}`} strokeWidth={2.6} stroke="#a8703f" fill="none" />
      </g>
    </g>
  );
}

/** the folded paper plane, side view, nose to the right, centred on (0,0) */
export function PaperPlane() {
  return (
    <g stroke={INK} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round">
      <path d="M20 0 L-17 4 L-4 2.5 L-8 -0.5 Z" fill="#cfe9e7" />
      <path d="M20 0 L-17 -9 L-8 -0.5 Z" fill="#fff" />
      <path d="M20 0 L-8 -0.5 L-4 2.5 Z" fill="#e8f6f4" />
      <path d="M12 -2 L-6 -1" fill="none" stroke={TEAL} strokeWidth={1.6} />
      <path d="M20 0 L11 -3.4 L11.5 0.2 Z" fill={RED} strokeWidth={1.4} />
    </g>
  );
}

/** a hoop seen from the side; `done` turns it teal */
export function RingArt({ i, done }: { i: number; done: boolean }) {
  const r = RINGS[i];
  return (
    <g transform={`translate(${r.x} ${r.y})`}>
      <ellipse rx={7} ry={RING_R + 3} fill="none" stroke={INK} strokeWidth={9} />
      <ellipse rx={7} ry={RING_R + 3} fill="none" stroke={done ? TEAL : GOLD} strokeWidth={5} />
      <circle cy={RING_R + 12} r={7.5} fill={done ? TEAL : PAPER} stroke={INK} strokeWidth={2} />
      <text y={RING_R + 16.5} textAnchor="middle" fontFamily="'Lilita One', sans-serif" fontSize={11} fill={done ? PAPER : INK}>{done ? '✓' : i + 1}</text>
    </g>
  );
}
