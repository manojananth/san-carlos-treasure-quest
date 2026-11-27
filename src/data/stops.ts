import coords from './stops.json';

export type StopId = 'depot' | 'laurel' | 'cityhall' | 'burton' | 'bigcanyon' | 'highlands' | 'hiller';
export type LonLat = [number, number];

export interface Stop {
  id: StopId;
  order: number;
  /** Real-world place */
  name: string;
  /** Game theme name */
  theme: string;
  bonus?: boolean;
  /** Refined by scripts/build-routes.ts (snapped to the street graph) */
  lonLat: LonLat;
}

const c = coords as Record<StopId, LonLat>;

export const STOPS: Stop[] = [
  { id: 'depot', order: 1, name: 'San Carlos Depot (1888)', theme: 'Base Camp', lonLat: c.depot },
  { id: 'laurel', order: 2, name: 'Laurel Street', theme: 'Merchant Road', lonLat: c.laurel },
  { id: 'cityhall', order: 3, name: 'City Hall & Library, Elm St', theme: 'Hall of Scrolls', lonLat: c.cityhall },
  { id: 'burton', order: 4, name: 'Burton Park', theme: 'Fort Burton', lonLat: c.burton },
  { id: 'bigcanyon', order: 5, name: 'Big Canyon Park', theme: 'Canyon of Echoes', lonLat: c.bigcanyon },
  { id: 'highlands', order: 6, name: 'Highlands Park', theme: 'Summit Outpost', lonLat: c.highlands },
  { id: 'hiller', order: 7, name: 'Hiller Aviation Museum', theme: 'Sky Hangar', bonus: true, lonLat: c.hiller },
];
