import type { StopId } from '../data/stops';

export const INK = '#1b2430';
export const RED = '#c8372d';
export const TEAL = '#2ba8a4';
export const GOLD = '#f2b632';
export const PAPER = '#fff7e3';
const PARCH = '#f3dfae';

/** Where each stop's icon sits on the 300 x 200 map (one per cell, so every piece carries exactly one stop). */
export const ICON_AT: Record<string, { x: number; y: number }> = {
  highlands: { x: 52, y: 56 },
  laurel: { x: 150, y: 50 },
  depot: { x: 236, y: 46 },
  bigcanyon: { x: 52, y: 150 },
  burton: { x: 150, y: 150 },
  cityhall: { x: 234, y: 150 },
};
/** The red X, just in front of the depot. */
export const X_AT = { x: 247, y: 76 };

/** A small illustrated glyph for a stop, drawn around (0, 0), about 34 units wide. */
export function StopIcon({ id }: { id: StopId }) {
  const sw = 1.6;
  switch (id) {
    case 'depot':
      return (
        <g stroke={INK} strokeWidth={sw} strokeLinejoin="round">
          <rect x={-17} y={-6} width={34} height={20} fill="#c9c3b2" />
          <path d="M-20 -6 L0 -20 L20 -6 Z" fill={RED} />
          <rect x={-3} y={4} width={6} height={10} rx={3} fill={INK} />
          <rect x={-13} y={0} width={5} height={7} rx={2.5} fill={INK} />
          <rect x={8} y={0} width={5} height={7} rx={2.5} fill={INK} />
          <rect x={-3} y={-17} width={6} height={9} fill="#c9c3b2" />
          <circle cx={0} cy={-12} r={2} fill={PAPER} strokeWidth={1} />
        </g>
      );
    case 'laurel':
      return (
        <g stroke={INK} strokeWidth={sw} strokeLinejoin="round">
          <rect x={-15} y={-4} width={30} height={19} fill="#e8c98c" />
          <path d="M-18 -4 L-14 -14 L14 -14 L18 -4 Z" fill={RED} />
          <path d="M-9 -14 L-11 -4 M-1 -14 L-3 -4 M7 -14 L5 -4" fill="none" stroke={PAPER} strokeWidth={3} />
          <rect x={-4} y={4} width={8} height={11} fill={INK} />
          <rect x={-13} y={2} width={7} height={7} fill="#9ad7d4" />
          <rect x={6} y={2} width={7} height={7} fill="#9ad7d4" />
        </g>
      );
    case 'cityhall':
      return (
        <g stroke={INK} strokeWidth={sw} strokeLinejoin="round">
          <path d="M-18 -4 L0 -16 L18 -4 Z" fill="#e8dcc0" />
          <rect x={-16} y={-4} width={32} height={4} fill="#e8dcc0" />
          <rect x={-13} y={0} width={4} height={14} fill="#fff" />
          <rect x={-5} y={0} width={4} height={14} fill="#fff" />
          <rect x={3} y={0} width={4} height={14} fill="#fff" />
          <rect x={11} y={0} width={4} height={14} fill="#fff" />
          <rect x={-19} y={14} width={38} height={4} fill="#c9c3b2" />
          <circle cx={0} cy={-8} r={2.5} fill={GOLD} strokeWidth={1} />
        </g>
      );
    case 'burton':
      return (
        <g stroke={INK} strokeWidth={sw} strokeLinejoin="round">
          <rect x={-16} y={0} width={32} height={15} fill="#a9774a" />
          <path d="M-16 0 V-8 H-10 V-4 H-4 V-8 H4 V-4 H10 V-8 H16 V0 Z" fill="#a9774a" />
          <rect x={-4} y={5} width={8} height={10} rx={4} fill={INK} />
          <path d="M0 -8 V-24" fill="none" />
          <path d="M0 -24 L12 -20 L0 -16 Z" fill={RED} />
          <path d="M-22 18 q6 -8 12 0 M12 18 q6 -8 12 0" fill="none" stroke="#3f8a35" strokeWidth={3} />
        </g>
      );
    case 'bigcanyon':
      return (
        <g stroke={INK} strokeWidth={sw} strokeLinejoin="round">
          <path d="M-22 -10 L-10 -14 L-6 4 L-12 16 L-22 16 Z" fill="#c4764a" />
          <path d="M22 -10 L10 -14 L6 4 L12 16 L22 16 Z" fill="#a85f3a" />
          <path d="M-6 4 L-2 16 L2 16 L6 4 Z" fill="#7bc7c3" />
          <path d="M-18 -4 H-9 M-18 4 H-11 M18 -4 H9 M18 4 H11" fill="none" strokeWidth={1.1} />
        </g>
      );
    default: // highlands
      return (
        <g stroke={INK} strokeWidth={sw} strokeLinejoin="round">
          <path d="M-24 16 L-6 -14 L4 2 L10 -8 L24 16 Z" fill="#6aa65a" />
          <path d="M-6 -14 L-12 -4 L-8 -6 L-5 -3 L-1 -6 Z" fill="#fff" />
          <path d="M-6 -14 V-24" fill="none" />
          <path d="M-6 -24 L5 -21 L-6 -18 Z" fill={RED} />
        </g>
      );
  }
}

/** The 300 x 200 treasure map of San Carlos: hills in the west, the Bay in the east, six stops, a dotted trail and the X. */
export function TreasureMapArt() {
  return (
    <g>
      <rect width={300} height={200} fill={PARCH} />
      {/* faint paper stains */}
      <ellipse cx={120} cy={110} rx={60} ry={30} fill="#ecd39a" opacity={0.5} />
      <ellipse cx={200} cy={30} rx={40} ry={14} fill="#ecd39a" opacity={0.4} />
      {/* the Bay (east) */}
      <path
        d="M272 0 C262 24 282 42 270 66 C260 88 280 108 268 132 C258 154 276 176 266 200 L300 200 L300 0 Z"
        fill={TEAL} stroke={INK} strokeWidth={2} strokeLinejoin="round"
      />
      <path d="M284 20 q6 -4 12 0 M280 60 q6 -4 12 0 M286 96 q6 -4 12 0 M280 176 q6 -4 12 0" fill="none" stroke="#e6f6f5" strokeWidth={2} strokeLinecap="round" />
      {/* the railroad along the shore */}
      <path d="M258 0 C250 24 270 42 258 66 C248 88 268 108 256 132 C246 154 264 176 254 200" fill="none" stroke={INK} strokeWidth={3.2} />
      <path d="M258 0 C250 24 270 42 258 66 C248 88 268 108 256 132 C246 154 264 176 254 200" fill="none" stroke={PAPER} strokeWidth={1.4} strokeDasharray="4 4" />
      {/* hills (west) */}
      <path d="M0 40 Q30 10 62 36 Q84 52 110 30 L110 0 L0 0 Z" fill="#7dba68" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <path d="M0 108 Q26 74 58 100 Q80 118 100 96 L100 70 L0 70 Z" fill="#5fa24f" stroke={INK} strokeWidth={2} strokeLinejoin="round" opacity={0.9} />
      <path d="M0 200 V160 Q30 130 66 156 Q86 170 108 150 V200 Z" fill="#7dba68" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      {/* trees */}
      {[[18, 78], [90, 82], [24, 188], [96, 186], [196, 16], [186, 118], [196, 186], [112, 92], [122, 190]].map(([x, y]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`} stroke={INK} strokeWidth={1.4} strokeLinejoin="round">
          <rect x={-1.2} y={0} width={2.4} height={5} fill="#7a5230" />
          <path d="M-6 1 L0 -11 L6 1 Z" fill="#3f8a35" />
        </g>
      ))}
      {/* a pond in Burton's meadow */}
      <ellipse cx={188} cy={150} rx={9} ry={5} fill="#7bc7c3" stroke={INK} strokeWidth={1.4} />
      {/* the trail, dotted: depot > laurel > city hall > burton > canyon > highlands */}
      <path
        d="M236 56 C214 60 176 52 152 58 C170 90 218 112 234 142 C214 168 176 164 152 160 C120 164 84 168 56 160 C40 130 40 96 52 66"
        fill="none" stroke={RED} strokeWidth={2.6} strokeLinecap="round" strokeDasharray="1 6.5"
      />
      {/* compass rose in the Bay */}
      <g transform="translate(284 182)" stroke={INK} strokeWidth={1.3} strokeLinejoin="round">
        <path d="M0 -12 L3 -3 L12 0 L3 3 L0 12 L-3 3 L-12 0 L-3 -3 Z" fill={GOLD} />
        <path d="M0 -12 L3 -3 L-3 -3 Z" fill={RED} />
      </g>
      {/* a little sailboat */}
      <g transform="translate(284 118)" stroke={INK} strokeWidth={1.3} strokeLinejoin="round">
        <path d="M-9 4 L9 4 L5 10 L-5 10 Z" fill={RED} />
        <path d="M0 3 V-12 L8 2 Z" fill="#fff" />
      </g>
      {/* title ribbon */}
      <g transform="translate(150 12)">
        <path d="M-40 -8 H40 L36 0 L40 8 H-40 L-36 0 Z" fill={GOLD} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
        <text y={4.5} textAnchor="middle" fontFamily="'Lilita One', system-ui, sans-serif" fontSize={11} fill={INK} letterSpacing={0.6}>SAN CARLOS</text>
      </g>
      {/* the six stops */}
      {(Object.keys(ICON_AT) as StopId[]).map((id) => (
        <g key={id} transform={`translate(${ICON_AT[id].x} ${ICON_AT[id].y})`}><StopIcon id={id} /></g>
      ))}
      {/* X marks the spot */}
      <g transform={`translate(${X_AT.x} ${X_AT.y})`} strokeLinecap="round">
        <path d="M-7 -7 L7 7 M7 -7 L-7 7" stroke={INK} strokeWidth={7.5} />
        <path d="M-7 -7 L7 7 M7 -7 L-7 7" stroke={RED} strokeWidth={4.5} />
      </g>
    </g>
  );
}
