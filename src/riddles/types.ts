import type { LonLat, StopId } from '../data/stops';

export type Tier = 'easy' | 'medium' | 'hard' | 'expert';
export const TIERS: Tier[] = ['easy', 'medium', 'hard', 'expert'];
/** Riddles for every stop after the depot: you solve the riddle to learn where the next stop is. */
export type RiddleStopId = Exclude<StopId, 'depot'>;
export type RiddleKind = 'choice' | 'map' | 'cipher' | 'scramble';

/** ---- authored content (what the writers type) ---- */
export interface ChoiceDef { kind: 'choice'; text: string; answer: string; wrong: [string, string, string]; hint: string }
export interface ScrambleDef { kind: 'scramble'; text: string; word: string; hint: string }
/** `msg` is the telegram in plain capitals; the player picks which stop it describes. */
export interface CipherDef { kind: 'cipher'; msg: string; answer: string; wrong: [string, string, string]; hint: string }
/** The target is the stop's own spot on the map. */
export interface MapDef { kind: 'map'; text: string; hint: string }
export type RiddleDef = ChoiceDef | ScrambleDef | CipherDef | MapDef;

/** ---- resolved riddles (what the cards render; options shuffled and numbers drawn from the run seed) ---- */
interface Base { id: string; stop: RiddleStopId; tier: Tier; text: string; hint: string }
export interface ChoiceRiddle extends Base { kind: 'choice'; options: string[]; answer: number }
export interface ScrambleRiddle extends Base { kind: 'scramble'; word: string; tiles: string[]; decoy?: string }
export interface CipherRiddle extends Base {
  kind: 'cipher'; plain: string; encoded: string; shift: number;
  /** easy / medium show the shift as a clue; harder tiers do not */
  clue: boolean;
  options: string[]; answer: number;
}
export interface MapRiddle extends Base {
  kind: 'map'; target: LonLat; radiusM: number;
  /** centre of the dashed hint circle (offset from the target) and its radius */
  hintCenter: LonLat; hintRadiusM: number;
}
export type Riddle = ChoiceRiddle | ScrambleRiddle | CipherRiddle | MapRiddle;
