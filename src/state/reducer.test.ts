import { describe, expect, it } from 'vitest';
import { RIDDLES } from '../data/riddles';
import { STOPS } from '../data/stops';
import { activeProfile, initialState, nextStopId, reducer } from './reducer';
import type { Action } from './reducer';
import { parseSave, writeSave, SAVE_KEY } from './storage';
import type { Difficulty, GameState, Stars } from './types';

const run = (s: GameState, ...as: Action[]) => as.reduce(reducer, s);
const T = 1000;
const create = (difficulty: Difficulty = 'pro', name = 'Ana', id = 'p1'): GameState =>
  run(initialState(), { type: 'createProfile', id, name, avatar: 'teal', difficulty, now: T });
const R = (s: GameState) => activeProfile(s)!.run!;
const P = (s: GameState) => activeProfile(s)!;
const tierOf = (d: Difficulty) => (d === 'rookie' ? 'easy' : d === 'pro' ? 'medium' : 'hard');

/** play challenge at the current stop */
const challenge = (s: GameState, stars: Stars = 3) =>
  run(s, ...(R(s).phase === 'intro' ? [{ type: 'continueIntro' } as Action] : []), { type: 'finishChallenge', stars, now: T });
const correctChoice = (s: GameState) => RIDDLES[nextStopId(R(s))! as keyof typeof RIDDLES][tierOf(P(s).difficulty)].answer;
const solve = (s: GameState) => reducer(s, { type: 'answerRiddle', correct: true, mark: String(correctChoice(s)) });
const wrongChoice = (s: GameState) => ([0, 1, 2] as const).find((c) => c !== correctChoice(s))!;
const wrongAns = (c: number): Action => ({ type: 'answerRiddle', correct: false, mark: String(c) });
const walk = (s: GameState) => run(s, { type: 'startWalk' }, { type: 'arrive', now: T });
/** finale: walk back, puzzle, open the chest, see the summary */
const finale = (s: GameState) =>
  run(s, { type: 'startFinaleWalk' }, { type: 'arriveDepot' }, { type: 'puzzleSolved' }, { type: 'openChest', now: T }, { type: 'showSummary' });
/** challenge + riddle + walk: leaves the player at the next stop, phase 'challenge' */
const advance = (s: GameState, stars: Stars = 3) => walk(solve(challenge(s, stars)));

describe('profiles', () => {
  it('creates a profile with a fresh run at the depot', () => {
    const s = create();
    expect(s.activeId).toBe('p1');
    expect(R(s)).toMatchObject({ phase: 'intro', at: 'depot', unlocked: ['depot'], xp: 0, fragments: [] });
  });
  it('caps profiles at 4 and ignores blank names', () => {
    let s = create('pro', 'A', 'a');
    for (const id of ['b', 'c', 'd', 'e']) s = run(s, { type: 'createProfile', id, name: id, avatar: 'red', difficulty: 'pro', now: T });
    expect(s.profiles.map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(run(initialState(), { type: 'createProfile', id: 'x', name: '   ', avatar: 'red', difficulty: 'pro', now: T }).profiles).toHaveLength(0);
  });
  it('deleting the active profile clears activeId', () => {
    const s = run(create(), { type: 'deleteProfile', id: 'p1' });
    expect(s.profiles).toHaveLength(0);
    expect(s.activeId).toBeNull();
  });
  it('selectProfile keeps an existing run', () => {
    let s = advance(create());
    s = run(s, { type: 'selectProfile', id: null, now: T }, { type: 'selectProfile', id: 'p1', now: 5 });
    expect(R(s).at).toBe('laurel');
  });
});

describe('xp math', () => {
  it.each([['rookie', 30], ['pro', 38], ['legend', 45]] as const)('first-try riddle on %s = %i xp', (d, xp) => {
    const s = solve(challenge(create(d), 1));
    const challengeXp = Math.round(20 * { rookie: 1, pro: 1.25, legend: 1.5 }[d]);
    expect(R(s).xp).toBe(challengeXp + xp);
  });
  it('pays 30 / 15 / 5 on rookie for first, second and later tries', () => {
    const base = challenge(create('rookie'), 1); // 20 xp
    const w = wrongChoice(base);
    const second = [0, 1, 2].find((c) => c !== w && c !== correctChoice(base))!;
    expect(R(solve(base)).xp).toBe(50);
    const afterOne = reducer(base, wrongAns(w));
    expect(R(afterOne).xp).toBe(20);
    expect(R(solve(afterOne)).xp).toBe(35);
    const afterTwo = reducer(afterOne, wrongAns(second));
    expect(R(solve(afterTwo)).xp).toBe(25);
  });
  it('a wrong choice cannot be picked twice and counts one try', () => {
    const s0 = challenge(create('rookie'));
    const w = wrongChoice(s0);
    const s = run(s0, wrongAns(w), wrongAns(w));
    expect(R(s).riddles.laurel).toMatchObject({ tries: 1, wrong: [String(w)], firstTry: false });
  });
  it('challenge pays stars x 20 x multiplier', () => {
    expect(R(challenge(create('rookie'), 2)).xp).toBe(40);
    expect(R(challenge(create('legend'), 3)).xp).toBe(90);
  });
  it('a timeout counts as a wrong try', () => {
    const s = run(challenge(create('legend')), { type: 'riddleTimeout' });
    expect(R(s).riddles.laurel).toMatchObject({ tries: 1, firstTry: false, wrong: [] });
  });
});

describe('hints', () => {
  it.each([['rookie', 5], ['pro', 10], ['legend', 20]] as const)('cost %s = %i xp, charged once', (d, cost) => {
    const s0 = challenge(create(d), 3);
    const before = R(s0).xp;
    const s1 = reducer(s0, { type: 'useHint' });
    expect(R(s1).xp).toBe(before - cost);
    expect(R(s1).riddles.laurel?.hinted).toBe(true);
    expect(R(reducer(s1, { type: 'useHint' })).xp).toBe(before - cost);
  });
  it('never drops XP below zero', () => {
    const s = run(create('legend'), { type: 'continueIntro' }, { type: 'finishChallenge', stars: 1, now: T }); // 30 xp
    const hinted = reducer(s, { type: 'useHint' });
    expect(R(hinted).xp).toBe(10);
    const s2 = { ...s, profiles: [{ ...P(s), run: { ...R(s), xp: 3 } }] };
    expect(R(reducer(s2, { type: 'useHint' })).xp).toBe(0);
  });
});

describe('flow and unlock order', () => {
  it('challenge -> riddle -> travel -> walking -> challenge, unlocking stops in order', () => {
    let s = create('pro');
    expect(R(s).phase).toBe('intro');
    s = reducer(s, { type: 'continueIntro' });
    expect(R(s).phase).toBe('challenge');
    s = reducer(s, { type: 'finishChallenge', stars: 2, now: T });
    expect(R(s)).toMatchObject({ phase: 'riddle', fragments: ['depot'], unlocked: ['depot'] });
    s = solve(s);
    expect(R(s)).toMatchObject({ phase: 'travel', unlocked: ['depot', 'laurel'], at: 'depot' });
    s = reducer(s, { type: 'startWalk' });
    expect(R(s).phase).toBe('walking');
    s = reducer(s, { type: 'arrive', now: T });
    expect(R(s)).toMatchObject({ phase: 'challenge', at: 'laurel' });
  });
  it('ignores actions in the wrong phase', () => {
    const s = create();
    expect(reducer(s, { type: 'answerRiddle', correct: true })).toBe(s);
    expect(reducer(s, { type: 'startWalk' })).toBe(s);
    expect(reducer(s, { type: 'finishChallenge', stars: 3, now: T })).toBe(s);
  });
  it('cancelWalk goes back to travel', () => {
    const s = run(solve(challenge(create())), { type: 'startWalk' }, { type: 'cancelWalk' });
    expect(R(s).phase).toBe('travel');
  });
  it('plays all main stops, offers the bonus, and bonus gives a badge but no fragment', () => {
    let s = create('pro');
    for (let i = 0; i < 5; i++) s = advance(s);
    expect(R(s).at).toBe('highlands');
    s = challenge(s);
    expect(R(s).fragments).toEqual(['depot', 'laurel', 'cityhall', 'burton', 'bigcanyon', 'highlands']);
    expect(R(s).phase).toBe('riddle');
    expect(nextStopId(R(s))).toBe('hiller');
    s = walk(solve(s));
    expect(R(s).at).toBe('hiller');
    s = challenge(s, 2);
    expect(R(s)).toMatchObject({ phase: 'finale', finaleStep: 'return', at: 'hiller' });
    expect(P(s).best).toBeNull();
    s = finale(s);
    expect(R(s).phase).toBe('summary');
    expect(R(s).fragments).toHaveLength(6);
    expect(R(s).unlocked).toEqual(STOPS.map((x) => x.id));
    expect(P(s).badges).toContain('sky-high');
    expect(R(s).finishedAt).toBe(T);
    expect(P(s).best?.xp).toBe(R(s).xp);
  });
  it('can skip the bonus', () => {
    let s = create();
    for (let i = 0; i < 5; i++) s = advance(s);
    s = challenge(s);
    s = reducer(s, { type: 'skipBonus', now: 9 });
    expect(R(s)).toMatchObject({ phase: 'finale', finaleStep: 'return', at: 'highlands' });
    s = finale(s);
    expect(R(s).phase).toBe('summary');
    expect(R(s).unlocked).not.toContain('hiller');
    expect(P(s).badges).not.toContain('sky-high');
    // skipBonus only works at the end
    expect(reducer(advance(create()), { type: 'skipBonus', now: 1 })).toEqual(advance(create()));
  });
  it('resetRun starts over but keeps profile badges and best', () => {
    let s = create();
    for (let i = 0; i < 5; i++) s = advance(s);
    s = finale(reducer(challenge(s), { type: 'skipBonus', now: 9 }));
    const badges = P(s).badges;
    s = reducer(s, { type: 'resetRun', now: 50 });
    expect(R(s)).toMatchObject({ phase: 'intro', xp: 0, startedAt: 50 });
    expect(P(s).badges).toEqual(badges);
    expect(P(s).best).not.toBeNull();
  });
});

describe('badges', () => {
  it('First Clue on the first correct riddle', () => {
    expect(P(challenge(create())).badges).toEqual([]);
    expect(P(solve(challenge(create()))).badges).toContain('first-clue');
  });
  it('Sharp Mind after three first-try riddles', () => {
    let s = create();
    s = advance(s);
    s = advance(s);
    expect(P(s).badges).not.toContain('sharp-mind');
    s = solve(challenge(s));
    expect(P(s).badges).toContain('sharp-mind');
  });
  it('a wrong answer first spoils first-try for that riddle', () => {
    let s = create();
    s = advance(s);
    s = advance(s);
    s = challenge(s);
    s = reducer(s, wrongAns(wrongChoice(s)));
    s = solve(s);
    expect(P(s).badges).not.toContain('sharp-mind');
  });
  it('No Peeking only without hints, Trailblazer on finish, Legend only on Legend', () => {
    const finish = (d: Difficulty, hint: boolean) => {
      let s = create(d);
      for (let i = 0; i < 5; i++) {
        s = challenge(s);
        if (hint && i === 2) s = reducer(s, { type: 'useHint' });
        s = walk(solve(s));
      }
      return finale(reducer(challenge(s), { type: 'skipBonus', now: 9 }));
    };
    expect(P(finish('pro', false)).badges).toEqual(expect.arrayContaining(['no-peeking', 'trailblazer']));
    expect(P(finish('pro', false)).badges).not.toContain('legend');
    expect(P(finish('pro', true)).badges).not.toContain('no-peeking');
    expect(P(finish('legend', false)).badges).toContain('legend');
  });
  it('Star Collector at 15 stars', () => {
    let s = create();
    for (let i = 0; i < 4; i++) s = advance(s, 3); // 12 stars so far
    expect(P(s).badges).not.toContain('star-collector');
    s = challenge(s, 3); // 15th star
    expect(P(s).badges).toContain('star-collector');
  });
});

describe('difficulty switching', () => {
  it('clears wrong answers on the pending riddle so it stays answerable', () => {
    let s = challenge(create('legend'));
    const w = ([0, 1, 2] as const).filter((c) => c !== correctChoice(s));
    for (const c of w) s = reducer(s, wrongAns(c));
    expect(R(s).riddles.laurel?.wrong).toHaveLength(2);
    s = reducer(s, { type: 'setDifficulty', difficulty: 'pro' });
    expect(R(s).riddles.laurel?.wrong).toEqual([]);
    expect(R(solve(s)).phase).toBe('travel');
  });
  it('mid-run switch forfeits the Legend badge', () => {
    let s = create('pro');
    for (let i = 0; i < 5; i++) {
      s = challenge(s);
      if (i === 1) s = reducer(s, { type: 'setDifficulty', difficulty: 'legend' });
      s = walk(solve(s));
    }
    s = finale(reducer(challenge(s), { type: 'skipBonus', now: 9 }));
    expect(R(s).mixed).toBe(true);
    expect(P(s).badges).not.toContain('legend');
    expect(R(parseSave(JSON.stringify({ version: 1, ...s }))).mixed).toBe(true);
  });
  it('switching on the intro screen is not mixed', () => {
    expect(R(reducer(create('pro'), { type: 'setDifficulty', difficulty: 'legend' })).mixed).toBeUndefined();
  });
});

describe('persistence', () => {
  it('drops activeId when the active profile has no usable run', () => {
    const base = P(create());
    const bad = { ...base, run: { phase: 'bogus', at: 'depot', unlocked: ['depot'] } };
    const out = parseSave(JSON.stringify({ version: 1, activeId: base.id, profiles: [bad] }));
    expect(out.profiles[0].run).toBeNull();
    expect(out.activeId).toBeNull();
  });
  it('a future-version save is ignored and never overwritten', () => {
    const store = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v),
    };
    const raw = JSON.stringify({ version: 2, profiles: [] });
    store.set(SAVE_KEY, raw);
    expect(parseSave(raw)).toEqual(initialState());
    writeSave(create());
    expect(store.get(SAVE_KEY)).toBe(raw);
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  const save = (s: GameState) => JSON.stringify({ version: 1, ...s });
  it('round-trips a game', () => {
    const s = advance(create());
    expect(parseSave(save(s))).toEqual(s);
  });
  it.each([null, '', 'not json', '[]', '{"version":2,"profiles":[]}', '{"version":1}', '{"version":1,"profiles":"x"}', '42'])(
    'falls back to a fresh game for %j',
    (raw) => expect(parseSave(raw)).toEqual(initialState()),
  );
  it('drops broken profiles and keeps good ones', () => {
    const good = P(create());
    const raw = JSON.stringify({ version: 1, activeId: 'zzz', profiles: [null, { id: 5 }, { ...good, difficulty: 'ultra', avatar: 'neon' }, good] });
    const s = parseSave(raw);
    expect(s.profiles).toHaveLength(1); // duplicate id dropped
    expect(s.profiles[0]).toMatchObject({ difficulty: 'pro', avatar: 'red' });
    expect(s.activeId).toBeNull();
  });
  it('truncates to 4 profiles', () => {
    const base = P(create());
    const profiles = [1, 2, 3, 4, 5, 6].map((i) => ({ ...base, id: `p${i}` }));
    expect(parseSave(JSON.stringify({ version: 1, profiles })).profiles).toHaveLength(4);
  });
  it('sanitizes a corrupt run', () => {
    const base = P(create());
    const bad = { ...base, run: { phase: 'riddle', at: 'moon', unlocked: [] } };
    expect(parseSave(JSON.stringify({ version: 1, profiles: [bad] })).profiles[0].run).toBeNull();
    const weird = { ...base, run: { ...R(create()), xp: -50, unlocked: ['laurel', 'depot'], stars: { depot: 9 } } };
    const r = parseSave(JSON.stringify({ version: 1, profiles: [weird] })).profiles[0].run!;
    expect(r.xp).toBe(0);
    expect(r.unlocked).toEqual(['depot']);
    expect(r.stars).toEqual({});
  });
  it('resumes a run saved mid-walk at the previous stop', () => {
    const s = run(solve(challenge(create())), { type: 'startWalk' });
    expect(R(s).phase).toBe('walking');
    const back = parseSave(save(s));
    expect(R(back)).toMatchObject({ phase: 'travel', at: 'depot', unlocked: ['depot', 'laurel'] });
  });
});
