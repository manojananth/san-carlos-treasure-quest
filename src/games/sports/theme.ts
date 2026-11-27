/** Shared palette and tiny helpers for the two ball games (burton + highlands). Generic sports only. */
export const INK = '#1b2430';
export const RED = '#c8372d';
export const RED_DARK = '#9c2620';
export const TEAL = '#2ba8a4';
export const TEAL_DARK = '#1f8582';
export const GOLD = '#f2b632';
export const GOLD_DARK = '#c98f12';
export const PAPER = '#fff7e3';
export const GRASS = '#5fae4e';
export const GRASS_DARK = '#4b9a40';

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** how many goals earn which stars for a 5-attempt game: 4-5 -> 3, 2-3 -> 2, else 1 */
export const starsForGoals = (goals: number): 1 | 2 | 3 => (goals >= 4 ? 3 : goals >= 2 ? 2 : 1);
