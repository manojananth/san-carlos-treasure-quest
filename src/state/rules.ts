import type { StopId } from '../data/stops';
import type { Tier } from '../data/riddles';
import { SPIKES } from '../data/spikes';
import type { BadgeId, Difficulty } from './types';

export const MAX_PROFILES = 4;
export const MAX_NAME = 12;

export interface DifficultyRules {
  label: string;
  tier: Tier;
  /** seconds per riddle attempt, null = untimed */
  riddleSeconds: number | null;
  hintCost: number;
  xpMult: number;
  /** multiplies coins from stars and the treasure chest (spike and first-try coins stay flat) */
  coinMult: number;
  /** passed to mini-games: bigger = more forgiving */
  timeScale: number;
}

export const DIFFICULTY: Record<Difficulty, DifficultyRules> = {
  rookie: { label: 'Rookie', tier: 'easy', riddleSeconds: null, hintCost: 5, xpMult: 1.0, coinMult: 1, timeScale: 1.3 },
  pro: { label: 'Pro', tier: 'medium', riddleSeconds: 60, hintCost: 10, xpMult: 1.25, coinMult: 1, timeScale: 1.0 },
  legend: { label: 'Legend', tier: 'hard', riddleSeconds: 35, hintCost: 20, xpMult: 1.5, coinMult: 1.5, timeScale: 0.75 },
  hunter: { label: 'Treasure Hunter', tier: 'expert', riddleSeconds: 25, hintCost: 30, xpMult: 2.0, coinMult: 2, timeScale: 0.6 },
};
export const DIFFICULTIES: Difficulty[] = ['rookie', 'pro', 'legend', 'hunter'];

/** Stops that give a map fragment (the bonus stop does not). */
export const MAIN_STOPS: StopId[] = ['depot', 'laurel', 'cityhall', 'burton', 'bigcanyon', 'highlands'];
export const BONUS_STOP: StopId = 'hiller';
/** Flat bonus XP for finishing the bonus stop (before the difficulty multiplier). */
export const BONUS_XP = 40;
export const STAR_XP = 20;
/** Treasure chest bonus (before the difficulty multiplier), paid once per run. */
export const TREASURE_XP = 100;
/** Base coins (before the difficulty coinMult, except spikes and first-try riddles which stay flat). */
export const COIN_PER_STAR = 5;
export const COIN_FIRST_TRY_RIDDLE = 5;
export const COIN_SPIKE = 15;
export const COIN_CHEST = 50;
export const SHARP_MIND_COUNT = 3;
export const STAR_COLLECTOR_COUNT = 15;

export const BADGES: { id: BadgeId; name: string; desc: string }[] = [
  { id: 'first-clue', name: 'First Clue', desc: 'Solve your first riddle.' },
  { id: 'sharp-mind', name: 'Sharp Mind', desc: 'Solve 3 riddles on the first try in one run.' },
  { id: 'no-peeking', name: 'No Peeking', desc: 'Finish the main stops without using a hint.' },
  { id: 'star-collector', name: 'Star Collector', desc: 'Earn 15 stars in one run.' },
  { id: 'sky-high', name: 'Sky High', desc: 'Visit the bonus stop, Sky Hangar.' },
  { id: 'trailblazer', name: 'Trailblazer', desc: 'Finish a whole run.' },
  { id: 'legend', name: 'Legend of San Carlos', desc: 'Finish a run on Legend.' },
  { id: 'treasure-finder', name: 'Treasure Finder', desc: "Open the railroad worker's chest." },
  { id: 'master-hunter', name: 'Master Treasure Hunter', desc: 'Finish a run on Treasure Hunter.' },
  { id: 'spike-collector', name: 'Spike Collector', desc: `Find all ${SPIKES.length} golden spikes.` },
];
export const BADGE_IDS: BadgeId[] = BADGES.map((b) => b.id);
export const badgeName = (id: BadgeId) => BADGES.find((b) => b.id === id)?.name ?? id;

export const riddleXp = (tries: number, mult: number) => Math.round((tries === 0 ? 30 : tries === 1 ? 15 : 5) * mult);
export const challengeXp = (stars: number, mult: number) => Math.round(stars * STAR_XP * mult);
export const bonusXp = (mult: number) => Math.round(BONUS_XP * mult);
export const treasureXp = (mult: number) => Math.round(TREASURE_XP * mult);

/** A reloaded timed riddle never restarts from full, but always gets at least this long. */
export const RIDDLE_MIN_RESUME_MS = 5000;
/**
 * Milliseconds on the clock when a timed riddle (re)appears. Running timer: until its saved deadline; paused timer:
 * what was left; none saved: the full time. Clamped to [RIDDLE_MIN_RESUME_MS, full] so a long absence is not punished.
 */
export function riddleStartMs(fullSeconds: number, saved: { deadlineAt?: number; remainingMs?: number } | undefined, now: number): number {
  const full = fullSeconds * 1000;
  const left = saved?.deadlineAt !== undefined ? saved.deadlineAt - now : saved?.remainingMs;
  if (left === undefined) return full;
  return Math.min(full, Math.max(Math.min(RIDDLE_MIN_RESUME_MS, full), left));
}
