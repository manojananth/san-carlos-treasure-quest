import { useId } from 'react';

export const INK = '#1b2430';
const RED = '#c8372d';
const TEAL = '#2ba8a4';
const TEAL_DARK = '#1f8582';
const GOLD = '#f2b632';
const GOLD_DARK = '#c98f12';
const PAPER = '#fff7e3';

export type ItemKind = 'coin' | 'compass' | 'ticket' | 'key' | 'lantern';

export interface Hidden { kind: ItemKind; label: string; x: number; y: number; rot: number }

/** stage is 400 x 250 game units; (x, y) is the item centre */
export const HIDDEN: Hidden[] = [
  { kind: 'coin', label: 'gold coin', x: 169, y: 196, rot: 0 },
  { kind: 'compass', label: 'compass', x: 188, y: 134, rot: 0 },
  { kind: 'ticket', label: 'old train ticket', x: 231, y: 198, rot: -18 },
  { kind: 'key', label: 'brass key', x: 126, y: 120, rot: 35 },
  { kind: 'lantern', label: 'lantern', x: 376, y: 180, rot: 0 },
];

/** item art around (0,0), about 16 units wide */
export function ItemArt({ kind }: { kind: ItemKind }) {
  const sw = 1.6;
  switch (kind) {
    case 'coin':
      return (
        <g>
          <circle r={7.5} fill={GOLD} stroke={INK} strokeWidth={sw} />
          <circle r={4.6} fill="none" stroke={GOLD_DARK} strokeWidth={1.4} />
          <path d="M-1.5 -2.4 h3 M0 -2.4 v5" stroke={GOLD_DARK} strokeWidth={1.4} strokeLinecap="round" />
        </g>
      );
    case 'compass':
      return (
        <g>
          <circle r={8} fill={PAPER} stroke={INK} strokeWidth={sw} />
          <circle r={6} fill="none" stroke={GOLD_DARK} strokeWidth={1.8} />
          <path d="M0 -5 L2 0 L0 5 L-2 0 Z" fill={RED} stroke={INK} strokeWidth={0.8} />
          <path d="M0 5 L2 0 L-2 0 Z" fill="#fff" />
          <circle r={0.9} fill={INK} />
        </g>
      );
    case 'ticket':
      return (
        <g>
          <path d="M-9 -5 H9 V-1.5 a1.6 1.6 0 0 0 0 3 V5 H-9 V1.5 a1.6 1.6 0 0 0 0 -3 Z" fill="#f4e5c0" stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
          <rect x={-6} y={-3} width={7} height={1.8} fill={RED} />
          <rect x={-6} y={0.2} width={11} height={1.4} fill={GOLD_DARK} />
          <path d="M5 -5 v10" stroke={INK} strokeWidth={0.8} strokeDasharray="1.4 1.4" />
        </g>
      );
    case 'key':
      return (
        <g>
          <circle cx={-6.5} cy={0} r={4} fill="none" stroke={INK} strokeWidth={4.6} />
          <circle cx={-6.5} cy={0} r={4} fill="none" stroke={GOLD} strokeWidth={2.2} />
          <path d="M-2.5 0 H8" stroke={INK} strokeWidth={4.4} strokeLinecap="round" />
          <path d="M-2.5 0 H8" stroke={GOLD} strokeWidth={2.2} strokeLinecap="round" />
          <path d="M5 0 v4 M8 0 v3" stroke={INK} strokeWidth={4} strokeLinecap="round" />
          <path d="M5 0 v4 M8 0 v3" stroke={GOLD_DARK} strokeWidth={1.8} strokeLinecap="round" />
        </g>
      );
    case 'lantern':
      return (
        <g>
          <path d="M-3.5 -8 q3.5 -5 7 0" fill="none" stroke={INK} strokeWidth={1.6} />
          <rect x={-5} y={-8} width={10} height={2.6} rx={1} fill={INK} />
          <rect x={-5.5} y={-5.4} width={11} height={11} rx={2} fill={GOLD} stroke={INK} strokeWidth={sw} />
          <path d="M-3 -3.5 q3 2 0 7 q-3 -3 0 -7z M2 -2 q2 1.6 0 5 q-2 -2 0 -5z" fill="#ffd96e" stroke="none" />
          <rect x={-6.4} y={5.4} width={12.8} height={2.6} rx={1} fill={INK} />
        </g>
      );
  }
}

/** checklist icon */
export function ItemIcon({ kind, size = 30 }: { kind: ItemKind; size?: number }) {
  return (
    <svg viewBox="-11 -11 22 22" width={size} height={size} aria-hidden="true">
      <ItemArt kind={kind} />
    </svg>
  );
}

function Stripes({ x, w, y, c1 }: { x: number; w: number; y: number; c1: string }) {
  const n = Math.round(w / 12);
  const sw = w / n;
  return (
    <g stroke={INK} strokeWidth={1.8} strokeLinejoin="round">
      {Array.from({ length: n }, (_, i) => (
        <path key={i} d={`M${x + i * sw} ${y} h${sw} v13 a${sw / 2} 6 0 0 1 ${-sw} 0 z`} fill={i % 2 ? '#fff' : c1} />
      ))}
    </g>
  );
}

/** everything behind the hidden items */
export function SceneBack() {
  const gid = useId();
  return (
    <g>
      <defs>
        <linearGradient id={`${gid}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={TEAL} />
          <stop offset="1" stopColor="#dff2ef" />
        </linearGradient>
      </defs>
      <rect width={400} height={250} fill={`url(#${gid}s)`} />
      <circle cx={364} cy={26} r={11} fill={GOLD} stroke={INK} strokeWidth={2} />
      <path d="M150 28 q4 -9 13 -5 q6 -7 15 -1 q9 -1 9 7 z" fill="#fff" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
      {/* far hills */}
      <path d="M0 52 q60 -22 130 -4 q70 -22 140 -2 q70 -12 130 4 V60 H0z" fill="#9fd4cb" stroke="none" />

      {/* bakery */}
      <rect x={4} y={42} width={128} height={130} fill="#f1c59a" stroke={INK} strokeWidth={2.5} />
      <rect x={0} y={38} width={136} height={8} fill="#c9835b" stroke={INK} strokeWidth={2.5} />
      <rect x={104} y={22} width={14} height={18} fill="#c9835b" stroke={INK} strokeWidth={2.5} />
      {[56, 66, 76].map((y) => <path key={y} d={`M5 ${y} H131`} stroke="#d99f74" strokeWidth={1.2} />)}
      <rect x={26} y={52} width={80} height={20} rx={4} fill={RED} stroke={INK} strokeWidth={2.2} />
      <text x={66} y={67} textAnchor="middle" fontFamily="'Lilita One', sans-serif" fontSize={15} fill={PAPER}>BAKERY</text>
      <rect x={12} y={100} width={64} height={48} rx={3} fill="#cfeeea" stroke={INK} strokeWidth={2.2} />
      <rect x={10} y={146} width={68} height={6} fill="#a6724f" stroke={INK} strokeWidth={2} />
      {[26, 44, 62].map((x) => (
        <g key={x}><ellipse cx={x} cy={141} rx={9} ry={5} fill="#d89a4a" stroke={INK} strokeWidth={1.6} /><path d={`M${x - 4} 139 l3 -2 M${x} 139 l3 -2`} stroke="#f6d59c" strokeWidth={1.4} /></g>
      ))}
      <rect x={85} y={104} width={32} height={68} rx={3} fill="#a6724f" stroke={INK} strokeWidth={2.2} />
      <rect x={90} y={110} width={22} height={26} rx={2} fill="#cfeeea" stroke={INK} strokeWidth={1.8} />
      <circle cx={110} cy={146} r={2} fill={GOLD} stroke={INK} strokeWidth={1} />
      <Stripes x={6} w={124} y={80} c1={GOLD} />

      {/* bookshop */}
      <rect x={136} y={42} width={128} height={130} fill="#79c4bd" stroke={INK} strokeWidth={2.5} />
      <rect x={132} y={38} width={136} height={8} fill={TEAL_DARK} stroke={INK} strokeWidth={2.5} />
      <rect x={158} y={52} width={84} height={20} rx={4} fill={TEAL_DARK} stroke={INK} strokeWidth={2.2} />
      <text x={200} y={67} textAnchor="middle" fontFamily="'Lilita One', sans-serif" fontSize={15} fill={PAPER}>BOOKS</text>
      <rect x={146} y={100} width={64} height={48} rx={3} fill="#cfeeea" stroke={INK} strokeWidth={2.2} />
      <rect x={144} y={146} width={68} height={6} fill="#a6724f" stroke={INK} strokeWidth={2} />
      <rect x={222} y={104} width={32} height={68} rx={3} fill="#c8372d" stroke={INK} strokeWidth={2.2} />
      <rect x={227} y={110} width={22} height={26} rx={2} fill="#cfeeea" stroke={INK} strokeWidth={1.8} />
      <circle cx={226} cy={146} r={2} fill={GOLD} stroke={INK} strokeWidth={1} />
      <Stripes x={138} w={124} y={80} c1={TEAL} />

      {/* toy shop */}
      <rect x={268} y={42} width={128} height={130} fill="#f6d36b" stroke={INK} strokeWidth={2.5} />
      <rect x={264} y={38} width={136} height={8} fill="#d6a321" stroke={INK} strokeWidth={2.5} />
      <rect x={292} y={52} width={80} height={20} rx={4} fill="#3e86c4" stroke={INK} strokeWidth={2.2} />
      <text x={332} y={67} textAnchor="middle" fontFamily="'Lilita One', sans-serif" fontSize={15} fill={PAPER}>TOYS</text>
      <rect x={278} y={100} width={64} height={48} rx={3} fill="#cfeeea" stroke={INK} strokeWidth={2.2} />
      <rect x={276} y={146} width={68} height={6} fill="#a6724f" stroke={INK} strokeWidth={2} />
      <rect x={288} y={132} width={12} height={12} fill={RED} stroke={INK} strokeWidth={1.8} />
      <rect x={300} y={132} width={12} height={12} fill={TEAL} stroke={INK} strokeWidth={1.8} />
      <rect x={294} y={120} width={12} height={12} fill={GOLD} stroke={INK} strokeWidth={1.8} />
      <circle cx={326} cy={136} r={8} fill="#c98f5a" stroke={INK} strokeWidth={1.8} />
      <circle cx={326} cy={124} r={5.5} fill="#c98f5a" stroke={INK} strokeWidth={1.8} />
      <rect x={352} y={104} width={32} height={68} rx={3} fill={RED} stroke={INK} strokeWidth={2.2} />
      <rect x={357} y={110} width={22} height={26} rx={2} fill="#cfeeea" stroke={INK} strokeWidth={1.8} />
      <circle cx={356} cy={146} r={2} fill={GOLD} stroke={INK} strokeWidth={1} />
      <Stripes x={270} w={124} y={80} c1={RED} />

      {/* pavement and road */}
      <rect x={0} y={170} width={400} height={38} fill="#ece1c8" stroke={INK} strokeWidth={2.5} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <path key={i} d={`M${i * 54 + 10} 170 v38`} stroke="#d3c7a8" strokeWidth={1.2} />)}
      <rect x={0} y={208} width={400} height={42} fill="#6f7c89" stroke={INK} strokeWidth={2.5} />
      <rect x={0} y={208} width={400} height={6} fill="#cfc4a8" stroke={INK} strokeWidth={2} />
      <path d="M8 232 h40 M78 232 h40 M148 232 h40 M218 232 h40 M288 232 h40 M358 232 h40" stroke="#fff7e3" strokeWidth={3} strokeLinecap="round" />
    </g>
  );
}

function Planter({ x, y = 190 }: { x: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g fill={TEAL_DARK} stroke={INK} strokeWidth={1.8} strokeLinejoin="round">
        <path d="M-9 -12 q-9 -8 -3 -16 q6 2 6 10 q0 -12 6 -14 q6 4 2 14 q6 -8 11 -2 q2 8 -9 8 z" />
        <circle cx={-4} cy={-17} r={3} fill={RED} />
        <circle cx={7} cy={-20} r={3} fill={GOLD} />
      </g>
      <path d="M-13 -9 h26 l-3 18 h-20 z" fill="#c9835b" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
    </g>
  );
}

function Table({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-14 -2 v-9 M14 -2 v-9" stroke={INK} strokeWidth={5} strokeLinecap="round" />
      <path d="M-14 -2 v-9 M14 -2 v-9" stroke="#c8372d" strokeWidth={2.4} strokeLinecap="round" />
      <path d="M0 -2 v12 M-7 10 h14" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
      <ellipse cx={0} cy={-4} rx={11} ry={4} fill="#fff" stroke={INK} strokeWidth={2} />
      <path d="M-4 -7 q4 -5 8 0" fill="none" stroke={INK} strokeWidth={1.4} />
    </g>
  );
}

function Lamp({ x }: { x: number }) {
  return (
    <g>
      <rect x={x - 2.5} y={64} width={5} height={112} fill="#3a4757" stroke={INK} strokeWidth={1.8} />
      <rect x={x - 6} y={168} width={12} height={8} rx={2} fill="#3a4757" stroke={INK} strokeWidth={1.8} />
      <path d={`M${x - 8} 62 h16 l-3 -9 h-10 z`} fill="#3a4757" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
      <rect x={x - 6} y={63} width={12} height={9} rx={2} fill="#ffe08a" stroke={INK} strokeWidth={1.8} />
    </g>
  );
}

function Bike({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {/* rack */}
      <path d="M-24 0 v-16 a5 5 0 0 1 10 0 v16 M-6 0 v-16 a5 5 0 0 1 10 0 v16 M12 0 v-16 a5 5 0 0 1 10 0 v16" stroke={INK} strokeWidth={3.4} />
      <path d="M-24 0 v-16 a5 5 0 0 1 10 0 v16 M-6 0 v-16 a5 5 0 0 1 10 0 v16 M12 0 v-16 a5 5 0 0 1 10 0 v16" stroke="#9aa6b2" strokeWidth={1.4} />
      {/* bike */}
      <circle cx={-12} cy={-2} r={9} stroke={INK} />
      <circle cx={12} cy={-2} r={9} stroke={INK} />
      <path d="M-12 -2 L-3 -14 L8 -14 L12 -2 M-3 -14 L2 -2 H-12 M8 -14 l-1 -4 h5" stroke={RED} strokeWidth={2.4} />
      <path d="M-4 -17 h7" stroke={INK} />
    </g>
  );
}

/** everything in front of the hidden items: items peek out from behind these */
export function SceneFront() {
  return (
    <g>
      {/* bookshop window: books in front of the sill */}
      <g stroke={INK} strokeWidth={1.6}>
        {[
          [150, 118, 7, 28, RED], [158, 122, 6, 24, GOLD], [165, 116, 8, 30, TEAL_DARK], [174, 121, 6, 25, '#3e86c4'],
          [181, 117, 7, 29, GOLD], [193, 120, 7, 26, RED], [201, 123, 6, 23, TEAL],
        ].map(([x, y, w, h, c], i) => <rect key={i} x={x as number} y={y as number} width={w as number} height={h as number} fill={c as string} />)}
      </g>
      <Lamp x={134} />
      <Lamp x={266} />
      <Table x={28} y={192} />
      <Table x={62} y={196} />
      <Planter x={152} />
      <Planter x={290} />
      <Planter x={392} y={192} />
      <Bike x={232} y={198} />
    </g>
  );
}
