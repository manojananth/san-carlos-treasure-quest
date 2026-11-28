/** Golden spikes hidden along the trail (M5). Phase 2 fills in `lonLat` (real spots near unlocked trails). */
export interface SpikeDef {
  id: string;
  name: string;
  /** [lon, lat] once placed; null until phase 2 */
  lonLat: [number, number] | null;
}

export const SPIKES: SpikeDef[] = [
  { id: 'spike-depot', name: 'Depot Spike', lonLat: null },
  { id: 'spike-laurel', name: 'Merchant Spike', lonLat: null },
  { id: 'spike-cityhall', name: 'Scroll Spike', lonLat: null },
  { id: 'spike-burton', name: 'Fort Spike', lonLat: null },
  { id: 'spike-canyon', name: 'Echo Spike', lonLat: null },
  { id: 'spike-highlands', name: 'Summit Spike', lonLat: null },
  { id: 'spike-hiller', name: 'Hangar Spike', lonLat: null },
  { id: 'spike-trail', name: 'Trailside Spike', lonLat: null },
];

export const isSpikeId = (v: unknown): v is string => typeof v === 'string' && SPIKES.some((s) => s.id === v);
export const spikeDef = (id: string): SpikeDef | undefined => SPIKES.find((s) => s.id === id);
