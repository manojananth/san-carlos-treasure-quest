import type { StopId } from '../data/stops';
import type { HatId } from '../data/hats';

export type Difficulty = 'rookie' | 'pro' | 'legend';
export type Phase = 'intro' | 'challenge' | 'riddle' | 'travel' | 'walking' | 'summary';
export type Stars = 1 | 2 | 3;
export type BadgeId =
  | 'first-clue'
  | 'sharp-mind'
  | 'no-peeking'
  | 'star-collector'
  | 'sky-high'
  | 'trailblazer'
  | 'legend';

export interface RiddleState {
  tries: number;
  hinted: boolean;
  /** still true while no wrong answer / timeout happened */
  firstTry: boolean;
  /** indexes of choices already ruled out */
  wrong: number[];
}

export interface Run {
  phase: Phase;
  /** stop the explorer is standing at */
  at: StopId;
  /** stops revealed so far, in order (always a prefix of the stop list) */
  unlocked: StopId[];
  riddles: Partial<Record<StopId, RiddleState>>;
  stars: Partial<Record<StopId, Stars>>;
  /** map fragments (main stops only) */
  fragments: StopId[];
  xp: number;
  /** badges earned during this run */
  earned: BadgeId[];
  startedAt: number;
  finishedAt?: number;
  /** difficulty was changed mid-run, so the Legend badge is not available */
  mixed?: boolean;
}

export interface Best {
  xp: number;
  stars: number;
  difficulty: Difficulty;
  finishedAt: number;
}

export interface Profile {
  id: string;
  name: string;
  avatar: HatId;
  difficulty: Difficulty;
  run: Run | null;
  best: Best | null;
  badges: BadgeId[];
  createdAt: number;
}

export interface Settings {
  /** reserved for M4 (sound mute etc.) */
  muted: boolean;
}

export interface GameState {
  profiles: Profile[];
  activeId: string | null;
  settings: Settings;
}

export interface SaveFile extends GameState {
  version: 1;
}
