import type { ComponentType } from 'react';
import type { StopId } from '../data/stops';
import type { ChallengeProps } from './types';
import { PlaceholderChallenge } from './PlaceholderChallenge';
import { CoupleTheCars } from './depot/CoupleTheCars';

/** Stop -> mini-game. Milestone 3 swaps each entry for its own game. */
export const GAMES: Record<StopId, ComponentType<ChallengeProps>> = {
  depot: CoupleTheCars,
  laurel: PlaceholderChallenge,
  cityhall: PlaceholderChallenge,
  burton: PlaceholderChallenge,
  bigcanyon: PlaceholderChallenge,
  highlands: PlaceholderChallenge,
  hiller: PlaceholderChallenge,
};
