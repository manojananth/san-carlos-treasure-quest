import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import type { StopId } from '../data/stops';
import type { ChallengeProps } from './types';

/** Each mini-game is its own chunk: a stop's game loads only when it is first played. */
export const GAMES: Record<StopId, LazyExoticComponent<ComponentType<ChallengeProps>>> = {
  depot: lazy(() => import('./depot/CoupleTheCars').then((m) => ({ default: m.CoupleTheCars }))),
  laurel: lazy(() => import('./laurel/MerchantRoad').then((m) => ({ default: m.MerchantRoad }))),
  cityhall: lazy(() => import('./cityhall/HallOfScrolls').then((m) => ({ default: m.HallOfScrolls }))),
  burton: lazy(() => import('./burton/FieldGoal').then((m) => ({ default: m.FieldGoal }))),
  bigcanyon: lazy(() => import('./bigcanyon/BigCanyon').then((m) => ({ default: m.BigCanyon }))),
  highlands: lazy(() => import('./highlands/Penalty').then((m) => ({ default: m.PenaltyShootout }))),
  hiller: lazy(() => import('./hiller/SkyHangar').then((m) => ({ default: m.SkyHangar }))),
};
