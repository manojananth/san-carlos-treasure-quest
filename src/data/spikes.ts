/** Golden spikes hidden along the trail (M5). Each sits beside a prebuilt trail leg and shows only once that leg is unlocked. */
export interface SpikeDef {
  id: string;
  name: string;
  /** [lon, lat] of the spike */
  lonLat: [number, number];
  /** "from>to" key of the trail leg it sits beside (the spike appears once that leg is unlocked) */
  leg: string;
}

/**
 * Positions were computed once from src/data/routes.json: take a fixed fraction of the leg's length
 * (fraction noted per entry), then nudge the point 22 m sideways (alternating sides, towards the sidewalk/park
 * edge rather than the roadway) so a spike is "right beside" the dashed trail and never hidden under it.
 */
export const SPIKES: SpikeDef[] = [
  { id: 'spike-depot', name: 'Depot Spike', lonLat: [-122.259599, 37.507616], leg: 'depot>laurel' }, // 10 %, by the station
  { id: 'spike-laurel', name: 'Laurel Spike', lonLat: [-122.263102, 37.504977], leg: 'laurel>cityhall' }, // 50 %
  { id: 'spike-cityhall', name: 'Scroll Spike', lonLat: [-122.260087, 37.501104], leg: 'cityhall>burton' }, // 50 %
  { id: 'spike-burton', name: 'Fort Spike', lonLat: [-122.265887, 37.495012], leg: 'burton>bigcanyon' }, // 25 %
  { id: 'spike-canyon', name: 'Echo Spike', lonLat: [-122.276473, 37.485999], leg: 'burton>bigcanyon' }, // 70 %
  { id: 'spike-highlands', name: 'Summit Spike', lonLat: [-122.275272, 37.486509], leg: 'bigcanyon>highlands' }, // 50 %
  { id: 'spike-hiller', name: 'Hangar Spike', lonLat: [-122.264263, 37.504483], leg: 'highlands>hiller' }, // 50 %
  { id: 'spike-trail', name: 'Trailside Spike', lonLat: [-122.260839, 37.507064], leg: 'depot>laurel' }, // 60 %
];

export const isSpikeId = (v: unknown): v is string => typeof v === 'string' && SPIKES.some((s) => s.id === v);
export const spikeDef = (id: string): SpikeDef | undefined => SPIKES.find((s) => s.id === id);
