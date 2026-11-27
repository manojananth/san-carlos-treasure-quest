import type { ComponentType } from 'react';
import type { StopId } from '../data/stops';
import type { ChallengeProps } from './types';
import { PlaceholderChallenge } from './PlaceholderChallenge';
import { FieldGoal } from './burton/FieldGoal';
import { PenaltyShootout } from './highlands/Penalty';
import { CoupleTheCars } from './depot/CoupleTheCars';
import { BigCanyon } from './bigcanyon/BigCanyon';
import { SkyHangar } from './hiller/SkyHangar';
import { MerchantRoad } from './laurel/MerchantRoad';
import { HallOfScrolls } from './cityhall/HallOfScrolls';

/** Stop -> mini-game. Milestone 3 swaps each entry for its own game. */
export const GAMES: Record<StopId, ComponentType<ChallengeProps>> = {
  depot: CoupleTheCars,
  laurel: MerchantRoad,
  cityhall: HallOfScrolls,
  burton: FieldGoal,
  bigcanyon: BigCanyon,
  highlands: PenaltyShootout,
  hiller: SkyHangar,
};
