import { rngFrom, shuffleWith } from './rng';

/** Letters of a word or phrase, without spaces (one tile per letter). */
export const lettersOf = (word: string): string[] => word.replace(/[^A-Z]/g, '').split('');

/** Decoy letters used on the hardest tier; one that is not in the word is added to the tray. */
const DECOYS = 'QXZJKVWYB';

export function decoyFor(word: string, seed: number): string {
  const free = DECOYS.split('').filter((c) => !word.includes(c));
  return free[Math.floor(rngFrom(seed)() * free.length)];
}

/** Shuffled tray tiles (never already in order when the word has two or more different letters). */
export function makeTiles(word: string, seed: number, decoy?: string): string[] {
  const base = [...lettersOf(word), ...(decoy ? [decoy] : [])];
  const rnd = rngFrom(seed);
  const target = lettersOf(word).join('');
  let tiles = shuffleWith(base, rnd);
  for (let k = 0; k < 8 && (tiles.join('') === target); k++) tiles = shuffleWith(base, rnd);
  return tiles;
}

/** `slots` holds the letter placed in each position (null = empty); spaces in the word are not slots. */
export function slotWord(word: string, slots: (string | null)[]): string {
  let i = 0;
  return word.replace(/[A-Z]/g, () => slots[i++] ?? '_');
}

export const isScrambleSolved = (word: string, slots: (string | null)[]): boolean =>
  slots.length === lettersOf(word).length && slots.every((s, i) => s === lettersOf(word)[i]);

/** Index of the first slot that is empty or wrong (-1 when the word is complete). */
export const firstUnsolved = (word: string, slots: (string | null)[]): number => {
  const w = lettersOf(word);
  return w.findIndex((c, i) => slots[i] !== c);
};
