import { sfx } from '../../audio/sfx';
import { buzz, buzzCorrect, buzzWrong } from '../../audio/haptics';

/** One place for the sound + vibration pairs games use. Both are no-ops until M4 / on desktop. */
export const feedback = {
  /** a good action (snap, goal, right answer) */
  hit: () => { sfx('correct'); buzzCorrect(); },
  /** a small good beat (collect, step) */
  tick: () => { sfx('coin'); buzz(15); },
  /** a miss or wrong drop */
  miss: () => { sfx('wrong'); buzzWrong(); },
  /** the game is won (2-3 stars) or finished (1 star) */
  win: (stars: 1 | 2 | 3) => { sfx(stars >= 2 ? 'fanfare' : 'star'); buzz([30, 40, 30, 40, 60]); },
};
