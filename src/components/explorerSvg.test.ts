import { describe, expect, it } from 'vitest';
import { GEAR, gearBySlot } from '../data/gear';
import { explorerSvg } from './explorerSvg';
import { hatArt, itemSvg, packArt, petArt, petSvg } from '../gear/art';
import { lookOf } from '../gear/look';

const ids = (svg: string) => [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const balanced = (svg: string) => (svg.match(/<g[\s>]/g) ?? []).length === (svg.match(/<\/g>/g) ?? []).length;

describe('explorerSvg composition', () => {
  it('renders the default explorer with safari hat in the player colour and teal pack', () => {
    const svg = explorerSvg({ color: '#7B4FC9' });
    expect(svg).toContain('<svg');
    expect(svg).toContain('#7B4FC9');
    expect(svg).toContain('#2BA8A4');
    expect(balanced(svg)).toBe(true);
  });
  it('every catalog item renders non-empty art', () => {
    for (const g of GEAR) {
      expect(itemSvg(g.id), g.id).toContain('<svg');
      const art = g.slot === 'hat' ? hatArt(g.id, '#C8372D') : g.slot === 'pack' ? packArt(g.id).back : petArt(g.id);
      expect(art.length, g.id).toBeGreaterThan(40);
    }
  });
  it('each hat and pack changes the composed explorer; pets only with the pet option', () => {
    const base = explorerSvg({});
    const seen = new Set<string>([base]);
    for (const g of gearBySlot('hat')) { const s = explorerSvg({ hat: g.id }); expect(s).not.toBe(base); expect(balanced(s)).toBe(true); seen.add(s); }
    for (const g of gearBySlot('pack')) { const s = explorerSvg({ pack: g.id }); expect(s).not.toBe(base); expect(balanced(s)).toBe(true); seen.add(s); }
    for (const g of gearBySlot('pet')) {
      expect(explorerSvg({ pet: g.id })).toBe(base);
      const s = explorerSvg({ pet: g.id }, { pet: true });
      expect(s).toContain('viewBox="-34 0 98 84"');
      seen.add(s);
    }
    expect(seen.size).toBe(1 + GEAR.length);
  });
  it('uses no id attributes, so ids stay unique however many are on one page', () => {
    const all = [
      explorerSvg({ hat: 'hat-crown', pack: 'pack-rocket', pet: 'pet-goat' }, { pet: true }),
      explorerSvg({ hat: 'hat-cowboy', pack: 'pack-bedroll', pet: 'pet-pup' }, { pet: true }),
      ...GEAR.map((g) => itemSvg(g.id)), ...gearBySlot('pet').map((g) => petSvg(g.id)),
    ].join('');
    expect(ids(all)).toEqual([]);
  });
  it('lookOf maps a profile to a look', () => {
    expect(lookOf({ avatar: 'teal', gear: { owned: [], equipped: { hat: 'hat-crown', pet: 'pet-pup' } } })).toEqual({ color: '#2BA8A4', hat: 'hat-crown', pack: undefined, pet: 'pet-pup' });
  });
});
