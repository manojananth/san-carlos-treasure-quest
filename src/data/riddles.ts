import type { StopId } from './stops';
import { STOPS } from './stops';
import { POOLS } from '../riddles/content';
import { encode } from '../riddles/cipher';
import { HINT_FACTOR, MAP_RADIUS, offsetLonLat } from '../riddles/geo';
import { hash, rngFrom, shuffleWith } from '../riddles/rng';
import { decoyFor, makeTiles } from '../riddles/scramble';
import type { ChoiceRiddle, CipherRiddle, MapRiddle, Riddle, RiddleDef, RiddleStopId, ScrambleRiddle, Tier } from '../riddles/types';

export type { Tier, Riddle, RiddleKind, RiddleStopId, ChoiceRiddle, CipherRiddle, MapRiddle, ScrambleRiddle } from '../riddles/types';
export { TIERS } from '../riddles/types';
export { POOLS } from '../riddles/content';

/** The order riddles come up in a run (the depot has none). */
export const RIDDLE_ORDER: RiddleStopId[] = ['laurel', 'cityhall', 'burton', 'bigcanyon', 'highlands', 'hiller'];

/** Caesar shift range per tier, and whether the shift is shown as a clue. */
export const CIPHER_SHIFT: Record<Tier, { min: number; max: number; clue: boolean }> = {
  easy: { min: 1, max: 3, clue: true },
  medium: { min: 2, max: 6, clue: true },
  hard: { min: 3, max: 12, clue: false },
  expert: { min: 1, max: 25, clue: false },
};

export const poolFor = (stop: RiddleStopId, tier: Tier): RiddleDef[] => POOLS[stop][tier];

/**
 * Index of the riddle this run gets for `stop`: a hash of seed, stop and tier, so a reload gives the same one and a
 * new run (new seed) varies. Never two map riddles in a row along one run when another kind is available.
 */
export function pickIndex(stop: RiddleStopId, tier: Tier, seed: number): number {
  let prevMap = false;
  for (const s of RIDDLE_ORDER) {
    const pool = poolFor(s, tier);
    let i = hash(seed, s, tier) % pool.length;
    if (prevMap && pool[i].kind === 'map') {
      for (let k = 1; k < pool.length; k++) {
        const j = (i + k) % pool.length;
        if (pool[j].kind !== 'map') { i = j; break; }
      }
    }
    if (s === stop) return i;
    prevMap = pool[i].kind === 'map';
  }
  return 0;
}

/** Turn an authored riddle into what the card renders (options shuffled, shift and hint circle drawn from the seed). */
export function resolveRiddle(stop: RiddleStopId, tier: Tier, index: number, seed: number): Riddle {
  const def = poolFor(stop, tier)[index];
  const id = `${stop}-${tier}-${index}`;
  const rnd = rngFrom(hash(seed, id));
  const base = { id, stop, tier, hint: def.hint };
  switch (def.kind) {
    case 'choice': {
      const options = shuffleWith([def.answer, ...def.wrong], rnd);
      const r: ChoiceRiddle = { ...base, kind: 'choice', text: def.text, options, answer: options.indexOf(def.answer) };
      return r;
    }
    case 'scramble': {
      const decoy = tier === 'expert' ? decoyFor(def.word, hash(seed, id, 'decoy')) : undefined;
      const r: ScrambleRiddle = { ...base, kind: 'scramble', text: def.text, word: def.word, tiles: makeTiles(def.word, hash(seed, id, 'tiles'), decoy), decoy };
      return r;
    }
    case 'cipher': {
      const { min, max, clue } = CIPHER_SHIFT[tier];
      const shift = min + Math.floor(rnd() * (max - min + 1));
      const options = shuffleWith([def.answer, ...def.wrong], rnd);
      const r: CipherRiddle = {
        ...base, kind: 'cipher', text: 'A railroad telegram! Turn the wheel until the message reads clearly, then pick the stop it describes.',
        plain: def.msg, encoded: encode(def.msg, shift), shift, clue, options, answer: options.indexOf(def.answer),
      };
      return r;
    }
    case 'map': {
      const target = STOPS.find((s) => s.id === stop)!.lonLat;
      const radiusM = MAP_RADIUS[tier];
      const hintRadiusM = radiusM * HINT_FACTOR;
      // the target sits somewhere inside the circle, never dead centre
      const hintCenter = offsetLonLat(target, rnd() * 360, hintRadiusM * (0.25 + rnd() * 0.4));
      const r: MapRiddle = { ...base, kind: 'map', text: def.text, target, radiusM, hintCenter, hintRadiusM };
      return r;
    }
  }
}

/** Riddle for a stop and tier; `seed` (Run.seed) picks from the pool deterministically. */
export const getRiddle = (stop: StopId, tier: Tier, seed = 0): Riddle | null =>
  stop === 'depot' ? null : resolveRiddle(stop, tier, pickIndex(stop, tier, seed), seed);

/**
 * Legacy shape used by older state tests (`RIDDLES[stop][tier].answer` as a mark index). The card judges answers now,
 * so any mark works; `answer` is just option 0. New code should use `getRiddle` / `POOLS`.
 */
export const RIDDLES: Record<RiddleStopId, Record<'easy' | 'medium' | 'hard', { answer: 0 | 1 | 2 }>> = Object.fromEntries(
  RIDDLE_ORDER.map((s) => [s, { easy: { answer: 0 }, medium: { answer: 0 }, hard: { answer: 0 } }]),
) as Record<RiddleStopId, Record<'easy' | 'medium' | 'hard', { answer: 0 | 1 | 2 }>>;
