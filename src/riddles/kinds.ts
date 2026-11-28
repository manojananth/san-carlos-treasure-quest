import type { ReactNode } from 'react';

/** The card judges every answer: `mark` names a wrong answer so a repeat is not counted twice; `msg` overrides the wrong-answer line. */
export type Judge = (correct: boolean, mark: string, msg?: string) => void;

/** What the card hands to a kind-specific riddle component. */
export interface KindProps<R> {
  riddle: R;
  hinted: boolean;
  /** marks of earlier wrong answers (choice index, "lon,lat", ...) */
  wrong: string[];
  /** a menu is open: ignore input */
  paused: boolean;
  /** already answered correctly */
  solved: boolean;
  judge: Judge;
  /** the prompt, timer and hint box */
  head: ReactNode;
  /** feedback line and the hint / skip buttons */
  foot: ReactNode;
}
