/**
 * Original inline-SVG art for the depot game: a chunky 1880s steam train, ink outlines, red / teal / gold.
 * Every piece is drawn around its own origin (0,0) so games can position and rotate it with GSAP.
 * Cars live in a 60 x 46 box, the locomotive in an 80 x 46 box; wheels end at y = 19 (the rail).
 * `ghost` draws the same shape as a flat ink silhouette (used for the Rookie slot hints).
 */
export type CarKind = 'tender' | 'mail' | 'passenger' | 'coach' | 'freight' | 'caboose';

export const INK = '#1b2430';
export const RED = '#c8372d';
export const RED_DARK = '#9c2620';
export const TEAL = '#2ba8a4';
export const TEAL_DARK = '#1f8582';
export const GOLD = '#f2b632';
export const GOLD_DARK = '#c98f12';
export const PAPER = '#fff7e3';
const GLASS = '#e8f6f4';

export const CAR_W = 60;
export const CAR_H = 46;
export const LOCO_W = 80;

export const CAR_NAMES: Record<CarKind, string> = {
  tender: 'black tender',
  mail: 'gold mail car',
  passenger: 'teal passenger car',
  coach: 'cream coach',
  freight: 'brown freight car',
  caboose: 'red caboose',
};

const sw = { stroke: INK, strokeWidth: 2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

function Wheel({ x, y = 14, r = 5, fill = INK, ghost }: { x: number; y?: number; r?: number; fill?: string; ghost?: boolean }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={ghost ? INK : fill} {...sw} />
      {!ghost && <circle cx={x} cy={y} r={r * 0.4} fill={GOLD} />}
    </g>
  );
}

/** couplers + undercarriage shared by every car */
function Chassis({ ghost }: { ghost?: boolean }) {
  return (
    <g>
      <rect x={-33} y={6} width={66} height={4} rx={2} fill={INK} {...sw} />
      <rect x={-33} y={5.5} width={5} height={5} rx={1.5} fill={ghost ? INK : GOLD_DARK} {...sw} />
      <rect x={28} y={5.5} width={5} height={5} rx={1.5} fill={ghost ? INK : GOLD_DARK} {...sw} />
      <Wheel x={-17} ghost={ghost} />
      <Wheel x={17} ghost={ghost} />
    </g>
  );
}

function Body({ ghost, kind }: { ghost: boolean; kind: CarKind }) {
  const f = (c: string) => (ghost ? INK : c);
  switch (kind) {
    case 'tender':
      return (
        <g>
          <path d="M-22 -6 Q-17 -17 -9 -13 Q-3 -20 5 -14 Q14 -18 19 -6 Z" fill={f('#2b3340')} {...sw} />
          {!ghost && <><circle cx={-8} cy={-10} r={2} fill="#5b6676" /><circle cx={7} cy={-10} r={1.6} fill="#5b6676" /></>}
          <rect x={-28} y={-6} width={56} height={16} rx={3} fill={f('#46505f')} {...sw} />
          <rect x={-28} y={1} width={56} height={3} fill={f(GOLD)} stroke={INK} strokeWidth={1.5} />
        </g>
      );
    case 'mail':
      return (
        <g>
          <rect x={-28} y={-14} width={56} height={24} rx={3} fill={f(GOLD)} {...sw} />
          <rect x={-29} y={-19} width={58} height={6} rx={2} fill={f(RED)} {...sw} />
          <rect x={-28} y={5} width={56} height={4} fill={f(RED_DARK)} stroke={INK} strokeWidth={1.5} />
          {!ghost && (
            <>
              <rect x={-24} y={-10} width={10} height={9} rx={1.5} fill={GLASS} {...sw} strokeWidth={1.5} />
              <text x={8} y={-1.5} textAnchor="middle" fontFamily="'Lilita One', 'Rubik', sans-serif" fontSize={12} fill={INK}>MAIL</text>
            </>
          )}
        </g>
      );
    case 'passenger':
      return (
        <g>
          <rect x={-28} y={-14} width={56} height={24} rx={3} fill={f(TEAL)} {...sw} />
          <rect x={-29} y={-19} width={58} height={6} rx={2} fill={f(TEAL_DARK)} {...sw} />
          <rect x={-28} y={4} width={56} height={3} fill={f(GOLD)} stroke={INK} strokeWidth={1.5} />
          {!ghost && [-23, -9, 5, 19].map((x) => <rect key={x} x={x} y={-10} width={9} height={9} rx={2} fill={GLASS} {...sw} strokeWidth={1.5} />)}
        </g>
      );
    case 'coach':
      return (
        <g>
          <rect x={-28} y={-14} width={56} height={24} rx={3} fill={f('#fff1c9')} {...sw} />
          <rect x={-29} y={-19} width={58} height={6} rx={2} fill={f(RED)} {...sw} />
          <rect x={-28} y={4} width={56} height={3} fill={f(TEAL_DARK)} stroke={INK} strokeWidth={1.5} />
          {!ghost && [-22, -6, 10].map((x) => <rect key={x} x={x} y={-10} width={13} height={9} rx={2} fill={TEAL} {...sw} strokeWidth={1.5} />)}
        </g>
      );
    case 'freight':
      return (
        <g>
          <rect x={-28} y={-16} width={56} height={26} rx={2} fill={f('#8a5a33')} {...sw} />
          <rect x={-29} y={-20} width={58} height={5} rx={2} fill={f('#6b4526')} {...sw} />
          {!ghost && (
            <>
              {[-22, -16, 16, 22].map((x) => <line key={x} x1={x} y1={-14} x2={x} y2={8} stroke="#6b4526" strokeWidth={1.4} />)}
              <rect x={-10} y={-12} width={20} height={20} rx={1.5} fill="#a06b3d" {...sw} strokeWidth={1.5} />
              <path d="M-10 -12 L10 8 M10 -12 L-10 8" stroke={GOLD} strokeWidth={2} />
            </>
          )}
        </g>
      );
    case 'caboose':
      return (
        <g>
          <rect x={-10} y={-23} width={20} height={11} rx={2} fill={f(RED_DARK)} {...sw} />
          {!ghost && <rect x={-6} y={-20} width={12} height={5} rx={1} fill={GOLD} {...sw} strokeWidth={1.4} />}
          <rect x={-28} y={-14} width={56} height={24} rx={3} fill={f(RED)} {...sw} />
          <rect x={-29} y={-17} width={58} height={5} rx={2} fill={f(RED_DARK)} {...sw} />
          {!ghost && [-22, 12].map((x) => <rect key={x} x={x} y={-9} width={10} height={9} rx={2} fill={GOLD} {...sw} strokeWidth={1.5} />)}
          {!ghost && <rect x={-28} y={5} width={56} height={3} fill={GOLD_DARK} stroke={INK} strokeWidth={1.5} />}
        </g>
      );
  }
}

/** a freight / passenger car around (0,0) */
export function CarArt({ kind, ghost = false }: { kind: CarKind; ghost?: boolean }) {
  return (
    <g>
      <Chassis ghost={ghost} />
      <Body kind={kind} ghost={ghost} />
    </g>
  );
}

/** the locomotive, facing left, around (0,0) */
export function LocoArt() {
  return (
    <g>
      <rect x={-34} y={-10} width={46} height={19} rx={6} fill="#313b49" {...sw} />
      <rect x={-23} y={-10} width={3.5} height={19} fill={GOLD} stroke={INK} strokeWidth={1.2} />
      <rect x={-5} y={-10} width={3.5} height={19} fill={GOLD} stroke={INK} strokeWidth={1.2} />
      <rect x={-39} y={-9} width={8} height={18} rx={3} fill="#232b36" {...sw} />
      <circle cx={-38} cy={-1} r={3.5} fill={GOLD} {...sw} strokeWidth={1.5} />
      <path d="M-30 -10 L-28 -21 L-18 -21 L-16 -10 Z" fill={INK} {...sw} />
      <rect x={-31} y={-24} width={16} height={4} rx={2} fill={GOLD} {...sw} strokeWidth={1.5} />
      <path d="M-12 -10 a6 6 0 0 1 12 0 z" fill={GOLD} {...sw} />
      <rect x={10} y={-19} width={28} height={29} rx={2} fill={RED} {...sw} />
      <rect x={8} y={-24} width={32} height={6} rx={2} fill={INK} {...sw} />
      <rect x={17} y={-13} width={14} height={11} rx={2} fill={GLASS} {...sw} strokeWidth={1.5} />
      <path d="M-41 12 L-34 3 L-34 12 Z" fill={GOLD} {...sw} />
      <rect x={-30} y={9} width={64} height={4} rx={2} fill={INK} {...sw} />
      <rect x={36} y={6} width={6} height={5} rx={1.5} fill={GOLD_DARK} {...sw} />
      <line x1={-4} y1={12} x2={16} y2={12} stroke={INK} strokeWidth={3} />
      <Wheel x={-26} y={14} r={5} fill={INK} />
      <Wheel x={-4} y={12} r={7} fill={RED} />
      <Wheel x={16} y={12} r={7} fill={RED} />
    </g>
  );
}
