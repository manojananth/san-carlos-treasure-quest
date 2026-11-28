import { describe, expect, it } from 'vitest';
import { initialState, reducer } from './reducer';
import { parseSave, SAVE_KEY } from './storage';

const save = (settings: unknown) => JSON.stringify({ version: 1, profiles: [], activeId: null, settings });

describe('settings', () => {
  it('defaults to sound on, vibration on', () => {
    expect(initialState().settings).toEqual({ muted: false, haptics: true });
  });
  it('setMuted and setHaptics toggle independently', () => {
    let s = reducer(initialState(), { type: 'setMuted', muted: true });
    expect(s.settings).toEqual({ muted: true, haptics: true });
    s = reducer(s, { type: 'setHaptics', haptics: false });
    expect(s.settings).toEqual({ muted: true, haptics: false });
    s = reducer(s, { type: 'setMuted', muted: false });
    expect(s.settings).toEqual({ muted: false, haptics: false });
  });
  it('returns the same state when nothing changes', () => {
    const s = initialState();
    expect(reducer(s, { type: 'setMuted', muted: false })).toBe(s);
    expect(reducer(s, { type: 'setHaptics', haptics: true })).toBe(s);
  });
  it('loads saved settings', () => {
    expect(parseSave(save({ muted: true, haptics: false })).settings).toEqual({ muted: true, haptics: false });
  });
  it('sanitizes missing or garbage settings to the defaults', () => {
    expect(parseSave(save({})).settings).toEqual({ muted: false, haptics: true });
    expect(parseSave(save({ muted: 'yes', haptics: 'no' })).settings).toEqual({ muted: false, haptics: true });
    expect(parseSave(save(null)).settings).toEqual({ muted: false, haptics: true });
    expect(parseSave(save({ muted: 1, haptics: 0 })).settings).toEqual({ muted: false, haptics: true });
  });
  it('exports the save key', () => { expect(typeof SAVE_KEY).toBe('string'); });
});
