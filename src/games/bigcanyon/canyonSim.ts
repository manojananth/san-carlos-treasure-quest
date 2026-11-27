/**
 * Pure simulation for "Canyon of Echoes" (no React, no DOM) so the pacing can be unit-tested.
 * Units: world x runs along the trail (1 unit = 1 stage unit), `h` is the height above the trail.
 */
export const RUN_SPEED = 110; // units / s on the flat
export const BOOST = 1.12; // while the player holds
export const STUMBLE_TIME = 1.0; // s
export const STUMBLE_SPEED = 0.25; // speed factor while stumbling
export const JUMP_V = 380;
export const GRAVITY = 1200;
export const JUMP_BUFFER = 0.14; // s a too-early tap is remembered
export const COURSE_LEN = 2700;
export const RUNNER_HW = 4;
export const GEM_BONUS = 0.3; // s of extra time per echo-gem
export const BASE_SECONDS = 35;
export const WIN_COAST = 0.7; // s the explorer coasts to the cairn before the result appears
/** score = % of the time limit left - 5 per stumble */
export const STUMBLE_COST = 5;
export const STAR_SCORE: [number, number] = [15, 40];

export type ObstacleKind = 'root' | 'rock';
export interface Obstacle { x: number; kind: ObstacleKind; h: number; hw: number }
export interface Gem { x: number; h: number }
export interface Course { length: number; obstacles: Obstacle[]; gems: Gem[] }

/** the trail itself: y of the walking surface at world x (negative = up) */
export const groundY = (x: number) => -0.35 * x + 4 * Math.sin(x / 57);
/** slope angle of the trail in degrees */
export const groundAngle = (x: number) => (Math.atan(-0.35 + (4 / 57) * Math.cos(x / 57)) * 180) / Math.PI;
/** the footbridge spans the creek gully */
export const BRIDGE: [number, number] = [1500, 1660];

const OBSTACLE_X = [420, 600, 790, 960, 1150, 1330, 1760, 1950, 2130, 2310, 2490];

function buildCourse(): Course {
  const obstacles: Obstacle[] = OBSTACLE_X.map((x, i) =>
    i % 2 === 0 ? { x, kind: 'root', h: 8, hw: 8 } : { x, kind: 'rock', h: 14, hw: 8 });
  const gems: Gem[] = [];
  // arcs of 3 over every other obstacle: they pay out only when the jump is on time
  obstacles.forEach((o, i) => {
    if (i % 2 === 0 && i !== 4) for (const [dx, h] of [[-16, 24], [0, 32], [16, 24]]) gems.push({ x: o.x + dx, h });
  });
  // lines of 3 on the ground in the quiet stretches (the last one is on the bridge)
  for (const cx of [695, 1055, 1580, 2040, 2400]) for (const dx of [-18, 0, 18]) gems.push({ x: cx + dx, h: 6 });
  gems.sort((a, b) => a.x - b.x);
  return { length: COURSE_LEN, obstacles, gems };
}
export const COURSE: Course = buildCourse();

export type SimEvent = 'gem' | 'stumble' | 'jump' | 'land' | 'win';

export interface SimState {
  t: number;
  x: number;
  h: number;
  vh: number;
  stumbleT: number;
  jumpBuf: number;
  gems: number;
  stumbles: number;
  /** extra seconds earned from gems */
  bonus: number;
  hit: boolean[];
  got: boolean[];
  won: boolean;
  /** sim time at which the summit was reached */
  wonAt: number;
  events: SimEvent[];
  /** indexes (into course.gems) collected since the UI last looked */
  collected: number[];
}

export function createSim(course: Course = COURSE): SimState {
  return {
    t: 0, x: 0, h: 0, vh: 0, stumbleT: 0, jumpBuf: 0, gems: 0, stumbles: 0, bonus: 0,
    hit: course.obstacles.map(() => false), got: course.gems.map(() => false),
    won: false, wonAt: 0, events: [], collected: [],
  };
}

/** a tap / Space press: remembered for a moment so an early press still jumps on landing */
export function pressJump(s: SimState): void { s.jumpBuf = JUMP_BUFFER; }

export const remainingSeconds = (s: SimState, limit: number) => limit + s.bonus - s.t;
export const scoreOf = (s: SimState, limit: number, remaining = remainingSeconds(s, limit)) =>
  (remaining / limit) * 100 - STUMBLE_COST * s.stumbles;

export function stepSim(s: SimState, dt: number, held: boolean, course: Course = COURSE): void {
  s.t += dt;
  if (s.jumpBuf > 0) s.jumpBuf = Math.max(0, s.jumpBuf - dt);
  if (s.stumbleT > 0) s.stumbleT = Math.max(0, s.stumbleT - dt);

  // vertical
  if (s.h > 0 || s.vh > 0) {
    s.vh -= GRAVITY * dt;
    s.h += s.vh * dt;
    if (s.h <= 0) { s.h = 0; s.vh = 0; s.events.push('land'); }
  }
  if (s.h === 0 && s.vh === 0 && s.jumpBuf > 0 && !s.won) {
    s.vh = JUMP_V; s.h = 0.001; s.jumpBuf = 0; s.events.push('jump');
  }

  // horizontal
  let speed = RUN_SPEED * (s.stumbleT > 0 ? STUMBLE_SPEED : held ? BOOST : 1);
  if (s.won) speed *= Math.max(0, 1 - (s.t - s.wonAt) / WIN_COAST);
  s.x += speed * dt;

  if (s.won) return;
  // obstacles
  course.obstacles.forEach((o, i) => {
    if (s.hit[i] || Math.abs(s.x - o.x) > o.hw + RUNNER_HW) return;
    if (s.h < o.h) {
      s.hit[i] = true; s.stumbles++; s.stumbleT = STUMBLE_TIME;
      if (s.h === 0) { s.vh = 150; s.h = 0.001; } // little hop of surprise
      s.events.push('stumble');
    }
  });
  // gems
  course.gems.forEach((g, i) => {
    if (s.got[i] || Math.abs(s.x - g.x) > 12 || Math.abs(s.h - g.h) > 16) return;
    s.got[i] = true; s.gems++; s.bonus += GEM_BONUS; s.collected.push(i); s.events.push('gem');
  });
  if (s.x >= course.length) { s.x = course.length; s.won = true; s.wonAt = s.t; s.events.push('win'); }
}
