import { clamp } from './theme';

/** Tiny perspective + projectile helpers for the Burton field-goal game. Units are yards; stage units are pixels. */
export const HORIZON = 85;
export const CAM_H = 3.5;
const F = 380;
export const scaleAt = (z: number) => F / (z + 8);
export const px = (x: number, z: number) => 200 + x * scaleAt(z);
export const py = (y: number, z: number) => HORIZON + (CAM_H - y) * scaleAt(z);

export const BAR_H = 3; // crossbar height
export const POST_TOP = 9; // top of the uprights
export const HALF_GAP = 3; // half the width between the uprights
export const BALL_R = 0.28;
const G = 10.7;
const ELEV = (38 * Math.PI) / 180;
export const MAX_YAW = 14;

export type KickOutcome = 'goal' | 'short' | 'high' | 'wide-left' | 'wide-right';

export interface KickSim {
  pos: (t: number) => { x: number; y: number; z: number };
  /** time the ball passes the plane of the posts */
  tc: number;
  /** time the flight animation stops */
  tEnd: number;
  outcome: KickOutcome;
}

/** yaw in degrees (+ = right), power 0..1, wind = sideways acceleration in yd/s^2 */
export function simulate(yawDeg: number, power: number, wind: number, d: number): KickSim {
  const v = 13 + 14 * clamp(power, 0, 1);
  const vz = v * Math.cos(ELEV);
  const vy = v * Math.sin(ELEV);
  const vx = vz * Math.tan((clamp(yawDeg, -MAX_YAW, MAX_YAW) * Math.PI) / 180);
  const pos = (t: number) => ({ x: vx * t + 0.5 * wind * t * t, y: Math.max(0, vy * t - 0.5 * G * t * t), z: vz * t });
  const tc = d / vz;
  const tLand = (2 * vy) / G;
  const at = pos(tc);
  let outcome: KickOutcome;
  if (tLand <= tc || at.y < BAR_H + 0.1) outcome = 'short';
  else if (at.y > POST_TOP - 0.3) outcome = 'high';
  else if (Math.abs(at.x) > HALF_GAP - 0.2) outcome = at.x < 0 ? 'wide-left' : 'wide-right';
  else outcome = 'goal';
  const tEnd = outcome === 'short' ? Math.min(tLand, tc + 0.2) : Math.min(tLand, tc + 0.45);
  return { pos, tc, tEnd, outcome };
}
