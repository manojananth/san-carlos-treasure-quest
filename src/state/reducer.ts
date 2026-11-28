import { STOPS } from '../data/stops';
import type { StopId } from '../data/stops';
import { getRiddle } from '../data/riddles';
import { isHatId } from '../data/hats';
import type { HatId } from '../data/hats';
import {
  DIFFICULTY, MAIN_STOPS, MAX_NAME, MAX_PROFILES, SHARP_MIND_COUNT, STAR_COLLECTOR_COUNT,
  bonusXp, challengeXp, riddleXp, treasureXp,
} from './rules';
import type { BadgeId, Difficulty, GameState, Profile, RiddleState, Run, Stars } from './types';

export type Action =
  | { type: 'selectProfile'; id: string | null; now: number }
  | { type: 'createProfile'; id: string; name: string; avatar: HatId; difficulty: Difficulty; now: number }
  | { type: 'deleteProfile'; id: string }
  | { type: 'setDifficulty'; difficulty: Difficulty }
  | { type: 'startRun'; now: number }
  | { type: 'resetRun'; now: number }
  | { type: 'continueIntro' }
  | { type: 'finishChallenge'; stars: Stars; now: number }
  | { type: 'answerRiddle'; choice: number }
  | { type: 'riddleTimeout' }
  | { type: 'useHint' }
  | { type: 'startWalk' }
  | { type: 'cancelWalk' }
  | { type: 'arrive'; now: number }
  | { type: 'skipBonus'; now: number }
  | { type: 'riddleClock'; running: boolean; remainingMs: number; now: number }
  | { type: 'startFinaleWalk' }
  | { type: 'cancelFinaleWalk' }
  | { type: 'arriveDepot' }
  | { type: 'puzzleSolved' }
  | { type: 'openChest'; now: number }
  | { type: 'showSummary' }
  | { type: 'setMuted'; muted: boolean }
  | { type: 'setHaptics'; haptics: boolean };

export const initialState = (): GameState => ({ profiles: [], activeId: null, settings: { muted: false, haptics: true } });

export const newRun = (now: number): Run => ({
  phase: 'intro', at: 'depot', unlocked: ['depot'], riddles: {}, stars: {}, fragments: [], xp: 0, earned: [], startedAt: now,
});

export const stopIndex = (id: StopId) => STOPS.findIndex((s) => s.id === id);
/** The stop the player is trying to reach next (null at the very end). */
export const nextStopId = (run: Run): StopId | null => STOPS[stopIndex(run.at) + 1]?.id ?? null;
export const totalStars = (run: Run) => Object.values(run.stars).reduce<number>((n, s) => n + (s ?? 0), 0);
export const activeProfile = (s: GameState): Profile | null => s.profiles.find((p) => p.id === s.activeId) ?? null;
export const cleanName = (raw: string) => raw.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);

const addUnique = <T,>(list: T[], items: T[]): T[] => [...list, ...items.filter((i, k) => !list.includes(i) && items.indexOf(i) === k)];

/** Applies `fn` to the active profile's run; `fn` returns the new run (and optional extra profile badges). */
function withRun(state: GameState, fn: (run: Run, p: Profile) => Run | null): GameState {
  const p = activeProfile(state);
  if (!p?.run) return state;
  const run = fn(p.run, p);
  if (!run || run === p.run) return state;
  const badges = addUnique(p.badges, run.earned);
  return { ...state, profiles: state.profiles.map((q) => (q.id === p.id ? { ...p, run, badges } : q)) };
}

const award = (run: Run, ...ids: BadgeId[]): Run => {
  const fresh = ids.filter((i) => !run.earned.includes(i));
  return fresh.length ? { ...run, earned: [...run.earned, ...fresh] } : run;
};

/** After the last stop: the run moves on to the finale (walk back, puzzle, chest). */
export const finaleOrigin = (run: Run): StopId => (run.unlocked.includes('hiller') ? 'hiller' : 'highlands');
/** Trail leg key of the walk back to Base Camp, once the finale has started. */
export const returnLegKey = (run: Run): string | null =>
  run.phase === 'finale' || (run.phase === 'summary' && run.treasure) ? `${finaleOrigin(run)}>depot` : null;

function startFinale(state: GameState, run: Run, p: Profile): GameState {
  return withRunState(state, p, { ...run, phase: 'finale', finaleStep: 'return' });
}

/** The chest is open: treasure XP, run-end badges, personal best. Phase stays `finale` (step `done`) until the summary is shown. */
function finishRun(state: GameState, run: Run, p: Profile, now: number): GameState {
  const bonus = treasureXp(DIFFICULTY[p.difficulty].xpMult);
  let r: Run = { ...run, finaleStep: 'done', finishedAt: now, treasure: true, treasureXp: bonus, xp: run.xp + bonus };
  const noHints = MAIN_STOPS.filter((id) => id !== 'depot').every((id) => !r.riddles[id]?.hinted);
  r = award(r, 'treasure-finder', 'trailblazer', ...(noHints ? (['no-peeking'] as BadgeId[]) : []), ...(p.difficulty === 'legend' && !r.mixed ? (['legend'] as BadgeId[]) : []));
  const stars = totalStars(r);
  const isBest = !p.best || r.xp > p.best.xp;
  const best = isBest ? { xp: r.xp, stars, difficulty: p.difficulty, finishedAt: now } : p.best;
  if (isBest) r = { ...r, newBest: true };
  return {
    ...state,
    profiles: state.profiles.map((q) => (q.id === p.id ? { ...p, run: r, best, badges: addUnique(p.badges, r.earned) } : q)),
  };
}

export function reducer(state: GameState, a: Action): GameState {
  switch (a.type) {
    case 'selectProfile': {
      if (a.id === null) return { ...state, activeId: null };
      const p = state.profiles.find((q) => q.id === a.id);
      if (!p) return state;
      return {
        ...state,
        activeId: p.id,
        profiles: p.run ? state.profiles : state.profiles.map((q) => (q.id === p.id ? { ...p, run: newRun(a.now) } : q)),
      };
    }
    case 'createProfile': {
      const name = cleanName(a.name);
      if (!name || state.profiles.length >= MAX_PROFILES || state.profiles.some((p) => p.id === a.id)) return state;
      const p: Profile = {
        id: a.id, name, avatar: isHatId(a.avatar) ? a.avatar : 'red', difficulty: a.difficulty,
        run: newRun(a.now), best: null, badges: [], createdAt: a.now,
      };
      return { ...state, profiles: [...state.profiles, p], activeId: p.id };
    }
    case 'deleteProfile': {
      const profiles = state.profiles.filter((p) => p.id !== a.id);
      return { ...state, profiles, activeId: state.activeId === a.id ? null : state.activeId };
    }
    case 'setMuted':
      return state.settings.muted === a.muted ? state : { ...state, settings: { ...state.settings, muted: a.muted } };
    case 'setHaptics':
      return state.settings.haptics === a.haptics ? state : { ...state, settings: { ...state.settings, haptics: a.haptics } };
    case 'setDifficulty': {
      const p = activeProfile(state);
      if (!p || p.difficulty === a.difficulty) return state;
      let run = p.run;
      if (run && run.phase !== 'intro' && run.phase !== 'summary') {
        run = { ...run, mixed: true };
        if (run.phase === 'riddle') {
          const t = nextStopId(run);
          const rs = t ? run.riddles[t] : undefined;
          if (t && rs) run = { ...run, riddles: { ...run.riddles, [t]: { ...fresh(rs), wrong: [] } } };
        }
      }
      return { ...state, profiles: state.profiles.map((q) => (q.id === p.id ? { ...p, difficulty: a.difficulty, run } : q)) };
    }
    case 'startRun':
    case 'resetRun': {
      const p = activeProfile(state);
      if (!p) return state;
      return { ...state, profiles: state.profiles.map((q) => (q.id === p.id ? { ...p, run: newRun(a.now) } : q)) };
    }
    case 'continueIntro':
      return withRun(state, (run) => (run.phase === 'intro' ? { ...run, phase: 'challenge' } : run));

    case 'finishChallenge': {
      const p = activeProfile(state);
      if (!p?.run || p.run.phase !== 'challenge') return state;
      const mult = DIFFICULTY[p.difficulty].xpMult;
      const at = p.run.at;
      let run: Run = { ...p.run, stars: { ...p.run.stars, [at]: a.stars }, xp: p.run.xp + challengeXp(a.stars, mult) };
      if (MAIN_STOPS.includes(at)) run = { ...run, fragments: addUnique(run.fragments, [at]) };
      if (totalStars(run) >= STAR_COLLECTOR_COUNT) run = award(run, 'star-collector');
      if (at === 'hiller') {
        run = award({ ...run, xp: run.xp + bonusXp(mult) }, 'sky-high');
        return startFinale(state, run, p);
      }
      return withRunState(state, p, { ...run, phase: 'riddle' });
    }

    case 'answerRiddle': {
      const p = activeProfile(state);
      if (!p?.run || p.run.phase !== 'riddle') return state;
      const target = nextStopId(p.run);
      const riddle = target && getRiddle(target, DIFFICULTY[p.difficulty].tier);
      if (!target || !riddle) return state;
      const rs = p.run.riddles[target] ?? { tries: 0, hinted: false, firstTry: true, wrong: [] };
      if (rs.wrong.includes(a.choice) || a.choice < 0 || a.choice > 2) return state;
      if (a.choice !== riddle.answer) {
        const riddles = { ...p.run.riddles, [target]: { ...fresh(rs), tries: rs.tries + 1, firstTry: false, wrong: [...rs.wrong, a.choice] } };
        return withRunState(state, p, { ...p.run, riddles });
      }
      let run: Run = {
        ...p.run,
        riddles: { ...p.run.riddles, [target]: fresh(rs) },
        xp: p.run.xp + riddleXp(rs.tries, DIFFICULTY[p.difficulty].xpMult),
        unlocked: addUnique(p.run.unlocked, [target]),
        phase: 'travel',
      };
      run = award(run, 'first-clue');
      const firstTries = Object.entries(run.riddles).filter(([id, r]) => r?.firstTry && run.unlocked.includes(id as StopId)).length;
      if (firstTries >= SHARP_MIND_COUNT) run = award(run, 'sharp-mind');
      return withRunState(state, p, run);
    }
    case 'riddleTimeout': {
      const p = activeProfile(state);
      if (!p?.run || p.run.phase !== 'riddle') return state;
      const target = nextStopId(p.run);
      if (!target) return state;
      const rs = p.run.riddles[target] ?? { tries: 0, hinted: false, firstTry: true, wrong: [] };
      return withRunState(state, p, { ...p.run, riddles: { ...p.run.riddles, [target]: { ...fresh(rs), tries: rs.tries + 1, firstTry: false } } });
    }
    case 'useHint': {
      const p = activeProfile(state);
      if (!p?.run || p.run.phase !== 'riddle') return state;
      const target = nextStopId(p.run);
      if (!target) return state;
      const rs = p.run.riddles[target] ?? { tries: 0, hinted: false, firstTry: true, wrong: [] };
      if (rs.hinted) return state;
      const xp = Math.max(0, p.run.xp - DIFFICULTY[p.difficulty].hintCost);
      return withRunState(state, p, { ...p.run, xp, riddles: { ...p.run.riddles, [target]: { ...rs, hinted: true } } });
    }
    case 'startWalk':
      return withRun(state, (run) => (run.phase === 'travel' ? { ...run, phase: 'walking' } : run));
    case 'cancelWalk':
      return withRun(state, (run) => (run.phase === 'walking' ? { ...run, phase: 'travel' } : run));
    case 'arrive':
      return withRun(state, (run) =>
        run.phase === 'walking' ? { ...run, at: run.unlocked[run.unlocked.length - 1], phase: 'challenge' } : run,
      );
    case 'skipBonus': {
      const p = activeProfile(state);
      if (!p?.run || p.run.phase !== 'riddle' || p.run.at !== 'highlands') return state;
      return startFinale(state, p.run, p);
    }
    case 'riddleClock': {
      const p = activeProfile(state);
      if (!p?.run || p.run.phase !== 'riddle' || !DIFFICULTY[p.difficulty].riddleSeconds) return state;
      const target = nextStopId(p.run);
      if (!target) return state;
      const { deadlineAt: _d, remainingMs: _r, ...rs } = p.run.riddles[target] ?? { tries: 0, hinted: false, firstTry: true, wrong: [] };
      void _d; void _r;
      const ms = Math.max(0, Math.round(a.remainingMs));
      if (!a.running && ms <= 0) return state;
      const next: RiddleState = a.running ? { ...rs, deadlineAt: a.now + ms } : { ...rs, remainingMs: ms };
      return withRunState(state, p, { ...p.run, riddles: { ...p.run.riddles, [target]: next } });
    }
    case 'startFinaleWalk':
      return withRun(state, (run) => (run.phase === 'finale' && run.finaleStep === 'return' ? { ...run, finaleStep: 'walking' } : run));
    case 'cancelFinaleWalk':
      return withRun(state, (run) => (run.phase === 'finale' && run.finaleStep === 'walking' ? { ...run, finaleStep: 'return' } : run));
    case 'arriveDepot':
      return withRun(state, (run) => (run.phase === 'finale' && run.finaleStep === 'walking' ? { ...run, at: 'depot', finaleStep: 'puzzle' } : run));
    case 'puzzleSolved':
      return withRun(state, (run) => (run.phase === 'finale' && run.finaleStep === 'puzzle' ? { ...run, finaleStep: 'chest' } : run));
    case 'openChest': {
      const p = activeProfile(state);
      if (!p?.run || p.run.phase !== 'finale' || p.run.finaleStep !== 'chest') return state;
      return finishRun(state, p.run, p, a.now);
    }
    case 'showSummary':
      return withRun(state, (run) => {
        if (run.phase !== 'finale' || run.finaleStep !== 'done') return run;
        const { finaleStep: _f, ...rest } = run;
        void _f;
        return { ...rest, phase: 'summary' };
      });
  }
}

/** a riddle state without its saved clock: the next try starts a full timer */
const fresh = (rs: RiddleState): RiddleState => {
  const { deadlineAt: _d, remainingMs: _r, ...rest } = rs;
  void _d; void _r;
  return rest;
};

function withRunState(state: GameState, p: Profile, run: Run): GameState {
  return {
    ...state,
    profiles: state.profiles.map((q) => (q.id === p.id ? { ...p, run, badges: addUnique(p.badges, run.earned) } : q)),
  };
}
