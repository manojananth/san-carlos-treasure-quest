import type { StopId } from '../data/stops';
import type { HatId } from '../data/hats';
import type { GearSlot } from '../data/gear';

export type Difficulty = 'rookie' | 'pro' | 'legend' | 'hunter';
export type Phase = 'intro' | 'challenge' | 'riddle' | 'travel' | 'walking' | 'finale' | 'summary';
/** Sub-steps of the `finale` phase. `done` = chest opened, waiting for the player to see the summary. */
export type FinaleStep = 'return' | 'walking' | 'puzzle' | 'chest' | 'done';
export type Stars = 1 | 2 | 3;
export type BadgeId =
  | 'first-clue'
  | 'sharp-mind'
  | 'no-peeking'
  | 'star-collector'
  | 'sky-high'
  | 'trailblazer'
  | 'legend'
  | 'treasure-finder'
  | 'master-hunter'
  | 'spike-collector';

export interface RiddleState {
  tries: number;
  hinted: boolean;
  /** still true while no wrong answer / timeout happened */
  firstTry: boolean;
  /** marks already ruled out, as strings: choice index ("2"), tapped spot, guessed word... (old saves held numbers) */
  wrong: string[];
  /** timed riddles: epoch ms when the current try runs out (set while the timer is running) */
  deadlineAt?: number;
  /** timed riddles: ms left on the current try while the timer is paused (menu open) */
  remainingMs?: number;
}

export interface Run {
  phase: Phase;
  /** only in the `finale` phase */
  finaleStep?: FinaleStep;
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
  /** picks riddles from a pool so replays differ while a reload stays stable (set when the run starts) */
  seed: number;
  finishedAt?: number;
  /** difficulty was changed mid-run, so the Legend badge is not available */
  mixed?: boolean;
  /** the treasure chest was opened this run (treasure XP paid) */
  treasure?: boolean;
  /** treasure XP actually paid by the chest (difficulty multiplier included) */
  treasureXp?: number;
  /** this run set a new personal best XP */
  newBest?: boolean;
}

export interface Best {
  xp: number;
  stars: number;
  difficulty: Difficulty;
  finishedAt: number;
}

export interface Gear {
  /** owned catalog ids (src/data/gear.ts) */
  owned: string[];
  equipped: Partial<Record<GearSlot, string>>;
}

export interface Profile {
  id: string;
  name: string;
  avatar: HatId;
  difficulty: Difficulty;
  run: Run | null;
  best: Best | null;
  badges: BadgeId[];
  /** coins: flat rewards, spent in the gear shop; persist across runs */
  coins: number;
  gear: Gear;
  /** found golden spike ids (src/data/spikes.ts) */
  spikes: string[];
  createdAt: number;
}

export interface Settings {
  /** sound effects off */
  muted: boolean;
  /** phone vibration on (default true) */
  haptics: boolean;
}

export interface GameState {
  profiles: Profile[];
  activeId: string | null;
  settings: Settings;
}

export interface SaveFile extends GameState {
  version: 1;
}
