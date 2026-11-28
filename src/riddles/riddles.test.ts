import { describe, expect, it } from 'vitest';
import { STOPS } from '../data/stops';
import { CIPHER_SHIFT, RIDDLE_ORDER, getRiddle, pickIndex, poolFor, resolveRiddle } from '../data/riddles';
import { TIERS } from './types';
import type { ChoiceRiddle, CipherRiddle, MapRiddle, ScrambleRiddle } from './types';
import { caesar, decode, encode, normWheel, wheelFromAngle } from './cipher';
import { decoyFor, firstUnsolved, isScrambleSolved, lettersOf, makeTiles, slotWord, typedSkipsLocked } from './scramble';
import { HINT_FACTOR, MAP_RADIUS, circleRing, distanceM, isHit, offsetLonLat, pickMark } from './geo';

describe('pools', () => {
  it('has at least 3 riddles for every stop and tier, expert included', () => {
    for (const s of RIDDLE_ORDER) for (const t of TIERS) expect(poolFor(s, t).length, `${s} ${t}`).toBeGreaterThanOrEqual(3);
  });
  it('follows the kind mix per tier', () => {
    for (const s of RIDDLE_ORDER) {
      const kinds = (t: (typeof TIERS)[number]) => new Set(poolFor(s, t).map((d) => d.kind));
      expect([...kinds('easy')].sort()).toEqual(['choice', 'scramble']);
      expect(kinds('medium').has('cipher')).toBe(true);
      expect(kinds('hard').has('map')).toBe(true);
      expect([...kinds('expert')].sort()).toEqual(['choice', 'cipher', 'map', 'scramble']);
    }
  });
  it('keeps content well formed', () => {
    for (const s of RIDDLE_ORDER) for (const t of TIERS) for (const d of poolFor(s, t)) {
      expect(d.hint.length).toBeGreaterThan(5);
      if (d.kind === 'choice') {
        expect(new Set([d.answer, ...d.wrong]).size).toBe(4);
        expect(d.text.length).toBeGreaterThan(20);
      }
      if (d.kind === 'cipher') {
        expect(d.msg).toMatch(/^[A-Z ]+$/);
        expect(new Set([d.answer, ...d.wrong]).size).toBe(4);
      }
      if (d.kind === 'scramble') expect(d.word).toMatch(/^[A-Z]+( [A-Z]+)*$/);
    }
  });
  it('writes harder words for harder scrambles', () => {
    const avg = (t: (typeof TIERS)[number]) => {
      const w = RIDDLE_ORDER.flatMap((s) => poolFor(s, t)).flatMap((d) => (d.kind === 'scramble' ? [lettersOf(d.word).length] : []));
      return w.reduce((a, b) => a + b, 0) / w.length;
    };
    expect(avg('easy')).toBeLessThan(avg('hard'));
    expect(avg('hard')).toBeLessThanOrEqual(avg('expert') + 0.5);
  });
});

describe('expert and giveaways', () => {
  it('expert never picks a choice riddle', () => {
    for (let seed = 0; seed < 400; seed++) for (const s of RIDDLE_ORDER) expect(getRiddle(s, 'expert', seed)!.kind, `${s} ${seed}`).not.toBe('choice');
  });
  it('hard and expert content never mentions stop numbers or order', () => {
    const re = /number \d|\b(first|second|third|fourth|fifth|sixth) (stop|sign)/i;
    for (const s of RIDDLE_ORDER) for (const t of ['hard', 'expert'] as const) for (const d of poolFor(s, t)) {
      const text = [d.hint, 'text' in d ? d.text : '', 'msg' in d ? d.msg : '', 'answer' in d ? d.answer : ''].join(' | ');
      expect(text, `${s} ${t}`).not.toMatch(re);
      if (d.kind === 'choice' || d.kind === 'cipher') expect(d.wrong.join(' ')).not.toMatch(re);
    }
  });
  it('decoys are never a letter of the answer', () => {
    for (let seed = 0; seed < 50; seed++) expect('LAUREL STREET'.includes(decoyFor('LAUREL STREET', seed))).toBe(false);
  });
  it('typing a whole word skips over hint-locked slots', () => {
    const locked = [true, false, false, false, false, false];
    expect(typedSkipsLocked('LAUREL', locked, 0, 'L')).toBe(true);
    expect(typedSkipsLocked('LAUREL', locked, 0, 'A')).toBe(false);
    expect(typedSkipsLocked('LAUREL', locked, 1, 'A')).toBe(false);
    expect(typedSkipsLocked('LAUREL', locked, -1, 'L')).toBe(false);
  });
});

describe('getRiddle', () => {
  it('has none for the depot', () => expect(getRiddle('depot', 'easy', 1)).toBeNull());
  it('is deterministic for a seed and varies across seeds', () => {
    for (const s of RIDDLE_ORDER) for (const t of TIERS) {
      expect(getRiddle(s, t, 12345)).toEqual(getRiddle(s, t, 12345));
      const ids = new Set(Array.from({ length: 60 }, (_, seed) => getRiddle(s, t, seed * 7919 + 3)!.id));
      expect(ids.size, `${s} ${t}`).toBeGreaterThan(1);
    }
  });
  it('expert has its own riddles, not the hard ones', () => {
    for (const s of RIDDLE_ORDER) expect(getRiddle(s, 'expert', 9)?.tier).toBe('expert');
  });
  it('never gives two map riddles in a row in one run', () => {
    for (const t of TIERS) for (let seed = 0; seed < 300; seed++) {
      let prev = false;
      for (const s of RIDDLE_ORDER) {
        const isMap = getRiddle(s, t, seed)!.kind === 'map';
        expect(prev && isMap, `${t} seed ${seed} ${s}`).toBe(false);
        prev = isMap;
      }
    }
  });
  it('index and resolved riddle agree', () => {
    const i = pickIndex('burton', 'hard', 77);
    expect(getRiddle('burton', 'hard', 77)).toEqual(resolveRiddle('burton', 'hard', i, 77));
  });
  it('choice options hold the right answer exactly once at the stated index', () => {
    for (let seed = 0; seed < 20; seed++) for (const s of RIDDLE_ORDER) for (let i = 0; i < poolFor(s, 'medium').length; i++) {
      const r = resolveRiddle(s, 'medium', i, seed);
      if (r.kind !== 'choice' && r.kind !== 'cipher') continue;
      const def = poolFor(s, 'medium')[i] as { answer: string };
      expect(r.options).toHaveLength(4);
      expect(r.options[r.answer]).toBe(def.answer);
    }
  });
});

describe('cipher', () => {
  it('round trips and keeps spaces and punctuation', () => {
    const msg = 'MEET AT THE DEPOT, 1888!';
    for (let s = 0; s < 26; s++) expect(decode(encode(msg, s), s)).toBe(msg);
    expect(encode('ABC XYZ', 3)).toBe('DEF ABC');
    expect(caesar('A', -1)).toBe('Z');
    expect(encode('A, B.', 1)).toBe('B, C.');
  });
  it('the wheel shows the message exactly when it matches the shift', () => {
    const r = resolveRiddle('laurel', 'medium', 1, 5) as CipherRiddle;
    expect(r.kind).toBe('cipher');
    expect(decode(r.encoded, r.shift)).toBe(r.plain);
    expect(decode(r.encoded, normWheel(r.shift + 1))).not.toBe(r.plain);
  });
  it('shift ranges follow the tier', () => {
    for (const t of TIERS) for (let seed = 0; seed < 80; seed++) for (const s of RIDDLE_ORDER) {
      const r = getRiddle(s, t, seed)!;
      if (r.kind !== 'cipher') continue;
      expect(r.shift).toBeGreaterThanOrEqual(CIPHER_SHIFT[t].min);
      expect(r.shift).toBeLessThanOrEqual(CIPHER_SHIFT[t].max);
      expect(r.clue).toBe(CIPHER_SHIFT[t].clue);
    }
  });
  it('turns the wheel by notches', () => {
    expect(wheelFromAngle(0, 360 / 26)).toBe(1);
    expect(wheelFromAngle(0, -360 / 26)).toBe(25);
    expect(wheelFromAngle(5, 0)).toBe(5);
  });
});

describe('scramble', () => {
  it('checks slots against the word, with spaces and decoys', () => {
    expect(lettersOf('CITY HALL')).toHaveLength(8);
    expect(isScrambleSolved('DEPOT', ['D', 'E', 'P', 'O', 'T'])).toBe(true);
    expect(isScrambleSolved('DEPOT', ['D', 'E', 'P', 'T', 'O'])).toBe(false);
    expect(isScrambleSolved('DEPOT', ['D', 'E', 'P', 'O', null])).toBe(false);
    expect(slotWord('CITY HALL', ['C', 'I', 'T', 'Y', 'H', 'A', 'L', 'L'])).toBe('CITY HALL');
    expect(firstUnsolved('DEPOT', ['D', 'X', 'P', null, null])).toBe(1);
    expect(firstUnsolved('DEPOT', ['D', 'E', 'P', 'O', 'T'])).toBe(-1);
  });
  it('tiles hold exactly the letters, shuffled, plus one decoy on expert', () => {
    const t = makeTiles('LIBRARY', 3);
    expect([...t].sort().join('')).toBe('ABIILRRY'.replace('ABIILRRY', [...lettersOf('LIBRARY')].sort().join('')));
    expect(t.join('')).not.toBe('LIBRARY');
    for (const s of RIDDLE_ORDER) for (let seed = 0; seed < 10; seed++) {
      const r = getRiddle(s, 'expert', seed)!;
      if (r.kind !== 'scramble') continue;
      expect(r.decoy).toBeDefined();
      expect(r.tiles).toHaveLength(lettersOf(r.word).length + 1);
      expect(r.word.includes(r.decoy!)).toBe(false);
    }
    const easy = getRiddle('laurel', 'easy', 0) as ScrambleRiddle | ChoiceRiddle;
    if (easy.kind === 'scramble') expect(easy.decoy).toBeUndefined();
  });
});

describe('map picking', () => {
  const laurel = STOPS.find((s) => s.id === 'laurel')!.lonLat;
  it('measures distance in metres', () => {
    expect(distanceM(laurel, laurel)).toBe(0);
    expect(distanceM(laurel, offsetLonLat(laurel, 90, 500))).toBeCloseTo(500, -1);
    expect(distanceM(laurel, offsetLonLat(laurel, 0, 1000))).toBeCloseTo(1000, -1);
  });
  it('accepts taps inside the radius only', () => {
    for (const t of TIERS) {
      const r = MAP_RADIUS[t];
      expect(isHit(offsetLonLat(laurel, 40, r * 0.9), laurel, r)).toBe(true);
      expect(isHit(offsetLonLat(laurel, 40, r * 1.1), laurel, r)).toBe(false);
    }
    expect(MAP_RADIUS).toEqual({ easy: 450, medium: 300, hard: 200, expert: 130 });
  });
  it('hint circle is 2.5x the radius and contains the target', () => {
    for (const t of ['hard', 'expert'] as const) for (const s of RIDDLE_ORDER) for (let seed = 0; seed < 30; seed++) {
      const r = resolveRiddle(s, t, poolFor(s, t).findIndex((d) => d.kind === 'map'), seed) as MapRiddle;
      expect(r.hintRadiusM).toBeCloseTo(MAP_RADIUS[t] * HINT_FACTOR);
      expect(distanceM(r.hintCenter, r.target)).toBeLessThan(r.hintRadiusM * 0.7);
      expect(r.target).toEqual(STOPS.find((x) => x.id === s)!.lonLat);
    }
  });
  it('marks taps as rounded lon,lat', () => {
    expect(pickMark([-122.2614162, 37.5065912])).toBe('-122.2614,37.5066');
    const ring = circleRing(laurel, 300, 16);
    expect(ring).toHaveLength(17);
    expect(ring[0]).toEqual(ring[16]);
    expect(distanceM(laurel, ring[3])).toBeCloseTo(300, -1);
  });
});
