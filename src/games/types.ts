import type { Difficulty } from '../state/types';

export interface ChallengeProps {
  difficulty: Difficulty;
  /** >1 = more forgiving (Rookie 1.3), <1 = tighter (Legend 0.75) */
  timeScale: number;
  /** call once with the result; the shell closes the challenge afterwards */
  onFinish: (stars: 1 | 2 | 3) => void;
}
