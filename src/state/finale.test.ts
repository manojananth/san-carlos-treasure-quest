import { describe, expect, it } from 'vitest';
import { RIDDLES } from '../data/riddles';
import { activeProfile, finaleOrigin, initialState, nextStopId, reducer, returnLegKey } from './reducer';
import type { Action } from './reducer';
import { parseSave } from './storage';
import { riddleStartMs, treasureXp, RIDDLE_MIN_RESUME_MS } from './rules';
import type { Difficulty, GameState, Stars } from './types';

const run = (s: GameState, ...as: Action[]) => as.reduce(reducer, s);
const T = 1000;
const create = (difficulty: Difficulty = 'pro'): GameState =>
  run(initialState(), { type: 'createProfile', id: 'p1', name: 'Ana', avatar: 'teal', difficulty, now: T });
const P = (s: GameState) => activeProfile(s)!;
const R = (s: GameState) => P(s).run!;
const tierOf = (d: Difficulty) => (d === 'rookie' ? 'easy' : d === 'pro' ? 'medium' : 'hard');
const challenge = (s: GameState, stars: Stars = 3) =>
  run(s, ...(R(s).phase === 'intro' ? [{ type: 'continueIntro' } as Action] : []), { type: 'finishChallenge', stars, now: T });
const solve = (s: GameState) =>
  reducer(s, { type: 'answerRiddle', choice: RIDDLES[nextStopId(R(s))! as keyof typeof RIDDLES][tierOf(P(s).difficulty)].answer });
const advance = (s: GameState, stars: Stars = 3) => run(solve(challenge(s, stars)), { type: 'startWalk' }, { type: 'arrive', now: T });
/** a run standing at Summit Outpost with its challenge done (riddle for the bonus pending) */
const atSummit = (d: Difficulty = 'pro') => {
  let s = create(d);
  for (let i = 0; i < 5; i++) s = advance(s);
  return challenge(s);
};
const toFinale = (d: Difficulty = 'pro') => reducer(atSummit(d), { type: 'skipBonus', now: 5 });
const toChest = (d: Difficulty = 'pro') => run(toFinale(d), { type: 'startFinaleWalk' }, { type: 'arriveDepot' }, { type: 'puzzleSolved' });
const save = (s: GameState) => JSON.stringify({ version: 1, ...s });

describe('finale flow', () => {
  it('skipping the bonus starts the finale at Summit Outpost without finishing the run', () => {
    const s = toFinale();
    expect(R(s)).toMatchObject({ phase: 'finale', finaleStep: 'return', at: 'highlands' });
    expect(R(s).finishedAt).toBeUndefined();
    expect(P(s).best).toBeNull();
    expect(P(s).badges).not.toContain('trailblazer');
  });
  it('playing the bonus returns from Sky Hangar', () => {
    let s = atSummit();
    s = challenge(run(solve(s), { type: 'startWalk' }, { type: 'arrive', now: T }), 2);
    expect(R(s)).toMatchObject({ phase: 'finale', finaleStep: 'return', at: 'hiller' });
    expect(finaleOrigin(R(s))).toBe('hiller');
    expect(returnLegKey(R(s))).toBe('hiller>depot');
    expect(returnLegKey(R(toFinale()))).toBe('highlands>depot');
  });
  it('walks back, solves the puzzle, opens the chest, shows the summary', () => {
    let s = toFinale();
    s = reducer(s, { type: 'startFinaleWalk' });
    expect(R(s).finaleStep).toBe('walking');
    s = reducer(s, { type: 'arriveDepot' });
    expect(R(s)).toMatchObject({ phase: 'finale', finaleStep: 'puzzle', at: 'depot' });
    s = reducer(s, { type: 'puzzleSolved' });
    expect(R(s).finaleStep).toBe('chest');
    s = reducer(s, { type: 'openChest', now: 77 });
    expect(R(s)).toMatchObject({ phase: 'finale', finaleStep: 'done', treasure: true, finishedAt: 77 });
    s = reducer(s, { type: 'showSummary' });
    expect(R(s).phase).toBe('summary');
    expect(R(s).finaleStep).toBeUndefined();
  });
  it('cancelling a walk goes back to the return card', () => {
    const s = run(toFinale(), { type: 'startFinaleWalk' }, { type: 'cancelFinaleWalk' });
    expect(R(s).finaleStep).toBe('return');
  });
  it('ignores finale actions out of order', () => {
    const s = toFinale();
    for (const a of [{ type: 'arriveDepot' }, { type: 'puzzleSolved' }, { type: 'openChest', now: 1 }, { type: 'showSummary' }, { type: 'cancelFinaleWalk' }] as Action[]) {
      expect(reducer(s, a)).toBe(s);
    }
    const walking = reducer(s, { type: 'startFinaleWalk' });
    expect(reducer(walking, { type: 'startFinaleWalk' })).toBe(walking);
    expect(reducer(walking, { type: 'openChest', now: 1 })).toBe(walking);
    expect(reducer(create(), { type: 'startFinaleWalk' })).toEqual(create());
  });
  it('the return leg is only on the trail during the finale', () => {
    expect(returnLegKey(R(atSummit()))).toBeNull();
    expect(returnLegKey(R(toFinale()))).toBe('highlands>depot');
    const done = run(toChest(), { type: 'openChest', now: 9 }, { type: 'showSummary' });
    expect(returnLegKey(R(done))).toBe('highlands>depot');
  });
});

describe('treasure rewards', () => {
  it.each([['rookie', 100], ['pro', 125], ['legend', 150]] as const)('pays %s %i xp once', (d, bonus) => {
    const before = toChest(d);
    const opened = reducer(before, { type: 'openChest', now: 9 });
    expect(treasureXp({ rookie: 1, pro: 1.25, legend: 1.5 }[d])).toBe(bonus);
    expect(R(opened).xp).toBe(R(before).xp + bonus);
    expect(R(opened).treasureXp).toBe(bonus);
    expect(R(reducer(opened, { type: 'showSummary' })).treasureXp).toBe(bonus);
    expect(R(parseSave(save(opened))!).treasureXp).toBe(bonus);
    expect(reducer(opened, { type: 'openChest', now: 10 })).toBe(opened);
    expect(R(reducer(opened, { type: 'showSummary' })).xp).toBe(R(before).xp + bonus);
  });
  it('awards Treasure Finder and the run-end badges', () => {
    const s = reducer(toChest(), { type: 'openChest', now: 9 });
    expect(R(s).earned).toEqual(expect.arrayContaining(['treasure-finder', 'trailblazer', 'no-peeking']));
    expect(P(s).badges).toContain('treasure-finder');
    expect(P(reducer(toChest('legend'), { type: 'openChest', now: 9 })).badges).toContain('legend');
  });
  it('sets best and flags a new best only when the run beats the old one', () => {
    let s = reducer(toChest(), { type: 'openChest', now: 9 });
    expect(P(s).best).toMatchObject({ xp: R(s).xp, finishedAt: 9 });
    expect(R(s).newBest).toBe(true);
    // a weaker second run on the same profile
    const weaker = run(s, { type: 'showSummary' }, { type: 'resetRun', now: 50 });
    let w = weaker;
    for (let i = 0; i < 5; i++) w = advance(w, 1);
    w = reducer(reducer(challenge(w, 1), { type: 'skipBonus', now: 60 }), { type: 'startFinaleWalk' });
    w = run(w, { type: 'arriveDepot' }, { type: 'puzzleSolved' }, { type: 'openChest', now: 70 });
    expect(R(w).newBest).toBeUndefined();
    expect(P(w).best?.xp).toBe(R(s).xp);
    s = w;
  });
  it('resetRun during the finale starts over without paying treasure', () => {
    const s = run(toChest(), { type: 'resetRun', now: 3 });
    expect(R(s)).toMatchObject({ phase: 'intro', xp: 0 });
    expect(R(s).treasure).toBeUndefined();
    expect(P(s).badges).not.toContain('treasure-finder');
  });
});

describe('finale persistence', () => {
  it('round-trips each step; a walk in flight resumes at the return card', () => {
    const f = toFinale();
    expect(parseSave(save(f))).toEqual(f);
    const walking = reducer(f, { type: 'startFinaleWalk' });
    expect(R(parseSave(save(walking)))).toMatchObject({ phase: 'finale', finaleStep: 'return', at: 'highlands' });
    const puzzle = reducer(walking, { type: 'arriveDepot' });
    expect(parseSave(save(puzzle))).toEqual(puzzle);
    const chest = reducer(puzzle, { type: 'puzzleSolved' });
    expect(parseSave(save(chest))).toEqual(chest);
  });
  it('a walk in flight from Sky Hangar resumes at Sky Hangar', () => {
    let s = atSummit();
    s = challenge(run(solve(s), { type: 'startWalk' }, { type: 'arrive', now: T }), 3);
    s = reducer(s, { type: 'startFinaleWalk' });
    expect(R(parseSave(save(s)))).toMatchObject({ finaleStep: 'return', at: 'hiller' });
  });
  it('a saved opened chest resumes at the summary with its rewards', () => {
    const done = reducer(toChest(), { type: 'openChest', now: 9 });
    const back = R(parseSave(save(done)));
    expect(back).toMatchObject({ phase: 'summary', treasure: true, newBest: true, finishedAt: 9, xp: R(done).xp });
    expect(back.finaleStep).toBeUndefined();
    const summary = reducer(done, { type: 'showSummary' });
    expect(parseSave(save(summary))).toEqual(summary);
  });
  it('a finale save without all fragments is unusable; a bad step falls back to return', () => {
    const f = toFinale();
    const broken = { ...P(f), run: { ...R(f), fragments: ['depot'] } };
    expect(parseSave(JSON.stringify({ version: 1, activeId: 'p1', profiles: [broken] })).profiles[0].run).toBeNull();
    const odd = { ...P(f), run: { ...R(f), finaleStep: 'dance' } };
    expect(R(parseSave(JSON.stringify({ version: 1, activeId: 'p1', profiles: [odd] }))).finaleStep).toBe('return');
    const wrongPlace = { ...P(f), run: { ...R(f), finaleStep: 'puzzle', at: 'highlands' } };
    expect(R(parseSave(JSON.stringify({ version: 1, activeId: 'p1', profiles: [wrongPlace] }))).finaleStep).toBe('return');
  });
});

describe('persistent riddle timer', () => {
  const NOW = 1_000_000;
  const timed = () => challenge(create('pro')); // 60 s per try
  const clock = (s: GameState, running: boolean, remainingMs: number, now = NOW) => reducer(s, { type: 'riddleClock', running, remainingMs, now });
  const rs = (s: GameState) => R(s).riddles.laurel;

  it('stores a deadline while running and the remaining time while paused', () => {
    let s = clock(timed(), true, 42_000);
    expect(rs(s)).toMatchObject({ deadlineAt: NOW + 42_000 });
    expect(rs(s)?.remainingMs).toBeUndefined();
    s = clock(s, false, 30_500, NOW + 11_500);
    expect(rs(s)?.remainingMs).toBe(30_500);
    expect(rs(s)?.deadlineAt).toBeUndefined();
    s = clock(s, true, 30_500, NOW + 20_000);
    expect(rs(s)?.deadlineAt).toBe(NOW + 50_500);
  });
  it('a wrong answer or a timeout starts the next try with no saved clock', () => {
    const s0 = clock(timed(), true, 42_000);
    const wrong = ([0, 1, 2] as const).find((c) => c !== RIDDLES.laurel.medium.answer)!;
    expect(rs(reducer(s0, { type: 'answerRiddle', choice: wrong }))?.deadlineAt).toBeUndefined();
    const t = reducer(clock(s0, false, 10_000), { type: 'riddleTimeout' });
    expect(rs(t)).toMatchObject({ tries: 1 });
    expect(rs(t)?.remainingMs).toBeUndefined();
  });
  it('hints keep the clock; changing difficulty clears it', () => {
    const s0 = clock(timed(), true, 42_000);
    expect(rs(reducer(s0, { type: 'useHint' }))?.deadlineAt).toBe(NOW + 42_000);
    expect(rs(reducer(s0, { type: 'setDifficulty', difficulty: 'legend' }))?.deadlineAt).toBeUndefined();
  });
  it('is ignored for untimed difficulty, outside riddles, and for a zero pause', () => {
    const rookie = challenge(create('rookie'));
    expect(clock(rookie, true, 5000)).toBe(rookie);
    expect(clock(create('pro'), true, 5000)).toEqual(create('pro'));
    const timedS = timed();
    expect(clock(timedS, false, 0)).toBe(timedS);
  });
  it('survives a save and reload', () => {
    const running = clock(timed(), true, 42_000);
    expect(rs(parseSave(save(running)))).toMatchObject({ deadlineAt: NOW + 42_000 });
    const paused = clock(timed(), false, 17_000);
    expect(rs(parseSave(save(paused)))).toMatchObject({ remainingMs: 17_000 });
    const junk = { ...P(running), run: { ...R(running), riddles: { laurel: { tries: 0, hinted: false, firstTry: true, wrong: [], deadlineAt: 'soon', remainingMs: -5 } } } };
    const r = rs(parseSave(JSON.stringify({ version: 1, activeId: 'p1', profiles: [junk] })));
    expect(r?.deadlineAt).toBeUndefined();
    expect(r?.remainingMs).toBeUndefined();
  });
  it('riddleStartMs resumes from the deadline or the paused time, never above full, never below the grace', () => {
    expect(riddleStartMs(60, undefined, NOW)).toBe(60_000);
    expect(riddleStartMs(60, { deadlineAt: NOW + 42_000 }, NOW)).toBe(42_000);
    expect(riddleStartMs(60, { remainingMs: 17_000 }, NOW)).toBe(17_000);
    expect(riddleStartMs(60, { deadlineAt: NOW - 90_000 }, NOW)).toBe(RIDDLE_MIN_RESUME_MS);
    expect(riddleStartMs(35, { deadlineAt: NOW + 500_000 }, NOW)).toBe(35_000);
    expect(riddleStartMs(60, { deadlineAt: NOW + 42_000, remainingMs: 1000 }, NOW)).toBe(42_000);
  });
});
