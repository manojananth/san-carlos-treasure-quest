import { hatColor } from '../data/hats';
import type { Profile } from '../state/types';

/** What the explorer looks like: the player's colour plus equipped gear ids (all optional). */
export interface Look {
  /** default-hat tint, #rrggbb */
  color?: string;
  hat?: string;
  pack?: string;
  pet?: string;
}

export const DEFAULT_COLOR = hatColor('red');

export const lookOf = (p: Pick<Profile, 'avatar' | 'gear'>): Look => ({
  color: hatColor(p.avatar),
  hat: p.gear.equipped.hat,
  pack: p.gear.equipped.pack,
  pet: p.gear.equipped.pet,
});

/** Stable key so views can skip redundant re-renders. */
export const lookKey = (l: Look) => `${l.color ?? ''}|${l.hat ?? ''}|${l.pack ?? ''}|${l.pet ?? ''}`;
