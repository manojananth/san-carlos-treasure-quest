import { describe, expect, it } from 'vitest';
import { GEAR, gearItem } from '../data/gear';
import { getRiddle } from '../data/riddles';
import { SPIKES } from '../data/spikes';
import { activeProfile, initialState, reducer, seedFrom } from './reducer';
import type { Action } from './reducer';
import { COIN_CHEST, COIN_FIRST_TRY_RIDDLE, COIN_PER_STAR, COIN_SPIKE, DIFFICULTIES, DIFFICULTY } from './rules';
import { SAVE_KEY, parseSave } from './storage';
import type { Difficulty, GameState, Stars } from './types';

const run = (s: GameState, ...as: Action[]) => as.reduce(reducer, s);
const T = 5000;
const create = (difficulty: Difficulty = 'hunter'): GameState =>
  run(initialState(), { type: 'createProfile', id: 'p1', name: 'Ana', avatar: 'teal', difficulty, now: T });
const P = (s: GameState) => activeProfile(s)!;
const R = (s: GameState) => P(s).run!;
const challenge = (s: GameState, stars: Stars = 3) =>
  run(s, ...(R(s).phase === 'intro' ? [{ type: 'continueIntro' } as Action] : []), { type: 'finishChallenge', stars, now: T });
const solve = (s: GameState): GameState => reducer(s, { type: 'answerRiddle', correct: true });
const advance = (s: GameState, stars: Stars = 3) => run(solve(challenge(s, stars)), { type: 'startWalk' }, { type: 'arrive', now: T });
const toChest = (d: Difficulty) => {
  let s = create(d);
  for (let i = 0; i < 5; i++) s = advance(s);
  return run(reducer(challenge(s), { type: 'skipBonus', now: 9 }), { type: 'startFinaleWalk' }, { type: 'arriveDepot' }, { type: 'puzzleSolved' });
};
const withCoins = (s: GameState, coins: number): GameState => ({ ...s, profiles: [{ ...P(s), coins }] });

describe('Treasure Hunter rules', () => {
  it('has the planned numbers and four difficulties', () => {
    expect(DIFFICULTIES).toEqual(['rookie', 'pro', 'legend', 'hunter']);
    expect(DIFFICULTY.hunter).toMatchObject({ label: 'Treasure Hunter', tier: 'expert', riddleSeconds: 25, hintCost: 30, xpMult: 2.0, timeScale: 0.6 });
  });
  it('pays double XP: 3 stars = 120, first-try riddle = 60, hint costs 30', () => {
    let s = challenge(create(), 3);
    expect(R(s).xp).toBe(120);
    s = solve(s);
    expect(R(s).xp).toBe(180);
    const hinted = reducer(challenge(create(), 3), { type: 'useHint' });
    expect(R(hinted).xp).toBe(90);
  });
  it('the expert tier falls back to hard riddle text', () => {
    expect(getRiddle('laurel', 'expert')).toBe(getRiddle('laurel', 'hard'));
    expect(getRiddle('depot', 'expert')).toBeNull();
  });
  it('awards Master Treasure Hunter for a pure hunter run, not for a mixed one, not for Legend', () => {
    const done = (s: GameState) => run(s, { type: 'openChest', now: 9 });
    expect(P(done(toChest('hunter'))).badges).toContain('master-hunter');
    expect(P(done(toChest('hunter'))).badges).not.toContain('legend');
    expect(P(done(toChest('legend'))).badges).not.toContain('master-hunter');
    let s = create('pro');
    for (let i = 0; i < 5; i++) {
      s = challenge(s);
      if (i === 1) s = reducer(s, { type: 'setDifficulty', difficulty: 'hunter' });
      s = run(solve(s), { type: 'startWalk' }, { type: 'arrive', now: T });
    }
    s = run(reducer(challenge(s), { type: 'skipBonus', now: 9 }), { type: 'startFinaleWalk' }, { type: 'arriveDepot' }, { type: 'puzzleSolved' }, { type: 'openChest', now: 9 });
    expect(R(s).mixed).toBe(true);
    expect(P(s).badges).not.toContain('master-hunter');
  });
});

describe('answerRiddle { correct, mark }', () => {
  it('a wrong answer records its mark once and counts a single try', () => {
    const s0 = challenge(create('rookie'));
    const wrong: Action = { type: 'answerRiddle', correct: false, mark: 'spot-3' };
    const s = run(s0, wrong, wrong);
    expect(R(s).riddles.laurel).toMatchObject({ tries: 1, wrong: ['spot-3'], firstTry: false });
    expect(R(reducer(s, { type: 'answerRiddle', correct: false, mark: 'spot-4' })).riddles.laurel?.wrong).toEqual(['spot-3', 'spot-4']);
  });
  it('a wrong answer without a mark still costs a try', () => {
    const s = reducer(challenge(create('rookie')), { type: 'answerRiddle', correct: false });
    expect(R(s).riddles.laurel).toMatchObject({ tries: 1, wrong: [] });
  });
  it('a correct answer unlocks the next stop whatever the mark', () => {
    const s = reducer(challenge(create('rookie')), { type: 'answerRiddle', correct: true, mark: 'cipher' });
    expect(R(s)).toMatchObject({ phase: 'travel', unlocked: ['depot', 'laurel'] });
  });
  it('the run seed comes from the start time and a fresh run reseeds', () => {
    const s = create();
    expect(R(s).seed).toBe(seedFrom(T));
    expect(R(s).seed).toBeGreaterThanOrEqual(0);
    expect(seedFrom(T)).not.toBe(seedFrom(T + 1));
    expect(R(reducer(s, { type: 'startRun', now: 777 })).seed).toBe(seedFrom(777));
    expect(R(reducer(s, { type: 'resetRun', now: 888 })).seed).toBe(seedFrom(888));
  });
});

describe('old saves load', () => {
  const old = {
    version: 1, activeId: 'p1',
    settings: { muted: false, haptics: true },
    profiles: [{
      id: 'p1', name: 'Ana', avatar: 'teal', difficulty: 'legend', best: null, badges: ['first-clue'], createdAt: 1,
      run: {
        phase: 'riddle', at: 'depot', unlocked: ['depot'], stars: { depot: 3 }, fragments: ['depot'], xp: 90, earned: [], startedAt: 4321,
        riddles: { laurel: { tries: 2, hinted: false, firstTry: false, wrong: [0, 2] } },
      },
    }],
  };
  it('fills coins, gear, spikes and seed and converts numeric wrong marks to strings', () => {
    const s = parseSave(JSON.stringify(old));
    const p = s.profiles[0];
    expect(p).toMatchObject({ coins: 0, gear: { owned: [], equipped: {} }, spikes: [] });
    expect(p.run?.seed).toBe(seedFrom(4321));
    expect(p.run?.riddles.laurel?.wrong).toEqual(['0', '2']);
    expect(s.activeId).toBe('p1');
    // and the migrated riddle still plays: the wrong marks stay greyed, a correct answer unlocks Laurel
    expect(R(solve(s)).unlocked).toEqual(['depot', 'laurel']);
  });
  it('keeps a stored seed, valid gear and spikes, drops junk', () => {
    const raw = JSON.stringify({
      ...old,
      profiles: [{
        ...old.profiles[0], coins: 77.9,
        gear: { owned: ['hat-crown', 'hat-crown', 'nope', 'pet-pup'], equipped: { hat: 'hat-crown', pack: 'hat-crown', pet: 'pet-goat' } },
        spikes: ['spike-depot', 'spike-depot', 'bogus'],
        run: { ...old.profiles[0].run, seed: 1234 },
      }],
    });
    const p = parseSave(raw).profiles[0];
    expect(p.coins).toBe(77);
    expect(p.gear.owned).toEqual(['hat-crown', 'pet-pup']);
    expect(p.gear.equipped).toEqual({ hat: 'hat-crown' }); // wrong slot / not owned are dropped
    expect(p.spikes).toEqual(['spike-depot']);
    expect(p.run?.seed).toBe(1234);
  });
  it('round-trips the new fields and accepts a hunter profile', () => {
    let s = withCoins(create('hunter'), 120);
    s = run(s, { type: 'buyItem', id: 'pet-pup' }, { type: 'equip', slot: 'pet', id: 'pet-pup' }, { type: 'findSpike', id: SPIKES[0].id });
    expect(parseSave(JSON.stringify({ version: 1, ...s }))).toEqual(s);
    expect(SAVE_KEY).toBe('scq.save.v1');
  });
});

describe('gear and coins', () => {
  it('the catalog has 5 hats, 4 packs, 4 pets priced 40-500 with unique ids', () => {
    expect(GEAR.filter((g) => g.slot === 'hat')).toHaveLength(5);
    expect(GEAR.filter((g) => g.slot === 'pack')).toHaveLength(4);
    expect(GEAR.filter((g) => g.slot === 'pet')).toHaveLength(4);
    expect(new Set(GEAR.map((g) => g.id)).size).toBe(GEAR.length);
    for (const g of GEAR) { expect(g.price).toBeGreaterThanOrEqual(40); expect(g.price).toBeLessThanOrEqual(500); }
    expect(SPIKES).toHaveLength(8);
    expect(SPIKES.every((k) => k.lonLat.length === 2 && k.leg.includes('>'))).toBe(true);
  });
  it('buyItem checks the catalog, the price and double buys', () => {
    const price = gearItem('hat-conductor')!.price;
    let s = withCoins(create(), price + 5);
    expect(reducer(s, { type: 'buyItem', id: 'nope' })).toBe(s);
    s = reducer(s, { type: 'buyItem', id: 'hat-conductor' });
    expect(P(s)).toMatchObject({ coins: 5 });
    expect(P(s).gear.owned).toEqual(['hat-conductor']);
    expect(reducer(s, { type: 'buyItem', id: 'hat-conductor' })).toBe(s);
    const poor = withCoins(create(), price - 1);
    expect(reducer(poor, { type: 'buyItem', id: 'hat-conductor' })).toBe(poor);
  });
  it('equip needs ownership and the right slot; null unequips', () => {
    let s = withCoins(create(), 600);
    expect(reducer(s, { type: 'equip', slot: 'hat', id: 'hat-crown' })).toBe(s);
    s = run(s, { type: 'buyItem', id: 'hat-crown' }, { type: 'buyItem', id: 'pet-pup' });
    expect(reducer(s, { type: 'equip', slot: 'pet', id: 'hat-crown' })).toBe(s);
    s = reducer(s, { type: 'equip', slot: 'hat', id: 'hat-crown' });
    expect(P(s).gear.equipped).toEqual({ hat: 'hat-crown' });
    s = reducer(s, { type: 'equip', slot: 'pet', id: 'pet-pup' });
    expect(P(s).gear.equipped).toEqual({ hat: 'hat-crown', pet: 'pet-pup' });
    s = reducer(s, { type: 'equip', slot: 'hat', id: null });
    expect(P(s).gear.equipped).toEqual({ pet: 'pet-pup' });
    expect(reducer(s, { type: 'equip', slot: 'hat', id: null })).toBe(s);
  });
  it('coins: 5 per star, 5 for a first-try riddle, 50 for the chest, flat on every difficulty', () => {
    for (const d of DIFFICULTIES) {
      let s = challenge(create(d), 2);
      expect(P(s).coins).toBe(2 * COIN_PER_STAR);
      s = solve(s);
      expect(P(s).coins).toBe(2 * COIN_PER_STAR + COIN_FIRST_TRY_RIDDLE);
    }
    // a second try pays no riddle coins
    let s = challenge(create('rookie'), 1);
    s = run(s, { type: 'answerRiddle', correct: false, mark: '1' }, { type: 'answerRiddle', correct: true });
    expect(P(s).coins).toBe(COIN_PER_STAR);
    // the chest
    const chest = toChest('pro');
    const before = P(chest).coins;
    expect(P(reducer(chest, { type: 'openChest', now: 9 })).coins).toBe(before + COIN_CHEST);
  });
  it('coins survive a new run', () => {
    const s = challenge(create(), 3);
    expect(P(reducer(s, { type: 'resetRun', now: 99 })).coins).toBe(3 * COIN_PER_STAR);
  });
  it('findSpike pays once per profile, ignores unknown ids and works without a run', () => {
    let s = create();
    s = reducer(s, { type: 'findSpike', id: 'spike-depot' });
    expect(P(s)).toMatchObject({ spikes: ['spike-depot'], coins: COIN_SPIKE });
    expect(reducer(s, { type: 'findSpike', id: 'spike-depot' })).toBe(s);
    expect(reducer(s, { type: 'findSpike', id: 'spike-nowhere' })).toBe(s);
    const noRun = { ...s, profiles: [{ ...P(s), run: null }] };
    expect(P(reducer(noRun, { type: 'findSpike', id: SPIKES[1].id })).coins).toBe(2 * COIN_SPIKE);
  });
  it('Spike Collector comes with the eighth spike (and is announced through run.earned)', () => {
    let s = create();
    SPIKES.slice(0, 7).forEach((k) => { s = reducer(s, { type: 'findSpike', id: k.id }); });
    expect(P(s).badges).not.toContain('spike-collector');
    s = reducer(s, { type: 'findSpike', id: SPIKES[7].id });
    expect(P(s).badges).toContain('spike-collector');
    expect(R(s).earned).toContain('spike-collector');
    expect(P(s).coins).toBe(8 * COIN_SPIKE);
  });
});
