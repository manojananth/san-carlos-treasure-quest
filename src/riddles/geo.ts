import type { LonLat } from '../data/stops';

const R = 6371008.8;
const M_PER_DEG = (R * Math.PI) / 180;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in metres. */
export function distanceM(a: LonLat, b: LonLat): number {
  const dLat = rad(b[1] - a[1]);
  const dLon = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The point `distM` metres from `p` along compass `bearingDeg` (flat-earth maths, fine at city scale). */
export function offsetLonLat(p: LonLat, bearingDeg: number, distM: number): LonLat {
  const dy = Math.cos(rad(bearingDeg)) * distM;
  const dx = Math.sin(rad(bearingDeg)) * distM;
  return [p[0] + dx / (M_PER_DEG * Math.cos(rad(p[1]))), p[1] + dy / M_PER_DEG];
}

/** Closed ring of `steps` points approximating a circle of `radiusM` around `center`. */
export function circleRing(center: LonLat, radiusM: number, steps = 64): LonLat[] {
  const ring: LonLat[] = [];
  for (let i = 0; i < steps; i++) ring.push(offsetLonLat(center, (i / steps) * 360, radiusM));
  ring.push(ring[0]);
  return ring;
}

/** Accept radius in metres for a map riddle by tier. */
export const MAP_RADIUS = { easy: 450, medium: 300, hard: 200, expert: 130 } as const;
/** The hint circle is this many times the accept radius. */
export const HINT_FACTOR = 2.5;

export const isHit = (tap: LonLat, target: LonLat, radiusM: number): boolean => distanceM(tap, target) <= radiusM;
/** "lon,lat" rounded to about 10 m: the wrong-answer mark for a map riddle. */
export const pickMark = (p: LonLat): string => `${p[0].toFixed(4)},${p[1].toFixed(4)}`;
