import { describe, expect, it } from 'vitest';
import { SPIKES } from '../data/spikes';
import { SPIKE_MIN_ZOOM, visibleSpikes } from './secrets';

describe('visibleSpikes', () => {
  const legs = ['depot>laurel'];
  it('hides at low zoom', () => expect(visibleSpikes(legs, [], SPIKE_MIN_ZOOM - 0.1)).toEqual([]));
  it('shows spikes of unlocked legs when zoomed in', () => {
    expect(visibleSpikes(legs, [], 15.5).map((s) => s.id)).toEqual(['spike-depot', 'spike-trail']);
  });
  it('hides locked legs and found spikes', () => {
    expect(visibleSpikes([], [], 16)).toEqual([]);
    expect(visibleSpikes(legs, ['spike-depot'], 16).map((s) => s.id)).toEqual(['spike-trail']);
  });
  it('every spike has a position and a known leg shape', () => {
    for (const s of SPIKES) expect(s.leg).toMatch(/^\w+>\w+$/);
    expect(visibleSpikes(SPIKES.map((s) => s.leg), [], 16)).toHaveLength(8);
  });
});
