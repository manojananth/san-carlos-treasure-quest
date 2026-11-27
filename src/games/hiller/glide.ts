/**
 * Pure glide physics for "Sky Hangar" (no React, no DOM), so the feel can be unit-tested.
 * World units are stage units; y points down. 4 units = 1 metre on the floor markers.
 */
export const ANCHOR = { x: 62, y: 118 };
export const FLOOR_Y = 214; // belly of the plane touches the floor here
export const CEIL_Y = 16;
export const WALL_X = 930;
export const UNITS_PER_M = 4;
export const GRAV = 130;
export const V_EQ = 95; // speed at which lift balances gravity
export const LIFT_CAP = 1.15; // max lift as a multiple of gravity
export const K_DRAG = 0.0034;
export const V_STALL = 38;
export const V_RECOVER = 62;
export const STALL_ANGLE = 64; // degrees of climb that stalls the wings
export const NUDGE = 50; // upward kick of one updraft
export const FRICTION = 100; // floor skid deceleration
export const MIN_ANGLE = -8;
export const MAX_ANGLE = 70;
export const RING_POINTS = 25; // metres' worth per ring
export const RING_R = 16;

export interface Ring { x: number; y: number }
export const RINGS: Ring[] = [{ x: 240, y: 100 }, { x: 430, y: 135 }, { x: 620, y: 185 }];

export interface Glide {
  x: number; y: number; vx: number; vy: number;
  t: number;
  mode: 'fly' | 'slide' | 'done';
  stalled: boolean;
  /** rings flown through (true per ring) */
  rings: boolean[];
  nudges: number;
  /** indexes of rings passed since the UI last looked */
  fresh: number[];
  /** one-shot flags for the UI: 'stall' | 'land' | 'crash' | 'nudge' */
  events: string[];
}

export const NUDGES: Record<'rookie' | 'pro' | 'legend', number> = { rookie: 3, pro: 2, legend: 1 };

const rad = (d: number) => (d * Math.PI) / 180;
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** launch speed from pull power 0..1 */
export const launchSpeed = (power: number) => 70 + 150 * clamp(power, 0, 1);

export function launch(angleDeg: number, power: number, nudges: number): Glide {
  const a = rad(clamp(angleDeg, MIN_ANGLE, MAX_ANGLE));
  const v = launchSpeed(power);
  return {
    x: ANCHOR.x, y: ANCHOR.y, vx: Math.cos(a) * v, vy: -Math.sin(a) * v, t: 0, mode: 'fly', stalled: false,
    rings: RINGS.map(() => false), nudges, fresh: [], events: [],
  };
}

export const distanceM = (g: Glide) => Math.max(0, Math.round((g.x - ANCHOR.x) / UNITS_PER_M));
export const ringCount = (g: Glide) => g.rings.filter(Boolean).length;
export const scoreOf = (g: Glide) => distanceM(g) + RING_POINTS * ringCount(g);

/** one updraft: a kick up (and a hair forward). Returns false when none are left or the plane is not flying. */
export function nudge(g: Glide): boolean {
  if (g.mode !== 'fly' || g.nudges <= 0) return false;
  g.nudges--;
  g.vy -= NUDGE;
  g.vx += 24;
  g.stalled = false;
  g.events.push('nudge');
  return true;
}

export function stepGlide(g: Glide, dt: number): void {
  if (g.mode === 'done') return;
  g.t += dt;
  if (g.mode === 'slide') {
    g.vx = Math.max(0, g.vx - FRICTION * dt);
    g.x += g.vx * dt;
    if (g.x >= WALL_X) { g.x = WALL_X; g.vx = 0; }
    if (g.vx <= 0.5) { g.vx = 0; g.mode = 'done'; }
    return;
  }
  const v = Math.max(1, Math.hypot(g.vx, g.vy));
  const climb = (Math.atan2(-g.vy, Math.max(0.001, g.vx)) * 180) / Math.PI;
  if (!g.stalled && (v < V_STALL || climb > STALL_ANGLE)) { g.stalled = true; g.events.push('stall'); }
  else if (g.stalled && v > V_RECOVER && climb < 40) g.stalled = false;
  const lift = GRAV * Math.min(LIFT_CAP, (v / V_EQ) ** 2) * (g.stalled ? 0.12 : 1);
  const ax = (lift * g.vy) / v - K_DRAG * v * g.vx;
  const ay = GRAV - (lift * g.vx) / v - K_DRAG * v * g.vy;
  g.vx += ax * dt;
  g.vy += ay * dt;
  const px = g.x;
  const py = g.y;
  g.x += g.vx * dt;
  g.y += g.vy * dt;
  RINGS.forEach((r, i) => {
    if (g.rings[i] || px >= r.x || g.x < r.x) return;
    const yy = py + ((g.y - py) * (r.x - px)) / Math.max(1e-6, g.x - px);
    if (Math.abs(yy - r.y) <= RING_R) { g.rings[i] = true; g.fresh.push(i); }
  });
  if (g.y < CEIL_Y) { g.y = CEIL_Y; g.vy = Math.max(g.vy, 25); }
  if (g.x >= WALL_X) { g.x = WALL_X; g.vx = 0; g.mode = 'slide'; g.events.push('crash'); }
  if (g.y >= FLOOR_Y) {
    g.y = FLOOR_Y;
    const hard = g.vy > 105;
    if (hard) g.vx *= 0.5;
    g.vy = 0;
    g.mode = 'slide';
    g.events.push(hard ? 'crash' : 'land');
  }
}

/** the first `seconds` of a throw as points (for the Rookie/Pro aiming guide) */
export function previewPath(angleDeg: number, power: number, seconds: number, every = 0.08): { x: number; y: number }[] {
  const g = launch(angleDeg, power, 0);
  const out = [{ x: g.x, y: g.y }];
  let next = every;
  while (g.t < seconds && g.mode === 'fly') {
    stepGlide(g, 1 / 60);
    if (g.t >= next) { out.push({ x: g.x, y: g.y }); next += every; }
  }
  return out;
}

/** plays a whole throw to the end with a simple policy (tests / tuning) */
export function simulate(angleDeg: number, power: number, nudges = 0, nudgeAt: number[] = []): Glide {
  const g = launch(angleDeg, power, nudges);
  const ts = nudgeAt.slice();
  for (let i = 0; i < 60 * 60 && g.mode !== 'done'; i++) {
    if (ts.length && g.t >= ts[0]) { nudge(g); ts.shift(); }
    stepGlide(g, 1 / 60);
  }
  return g;
}
