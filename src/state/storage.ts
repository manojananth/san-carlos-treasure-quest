import { STOPS } from '../data/stops';
import type { StopId } from '../data/stops';
import { isHatId } from '../data/hats';
import { isGearId, gearItem, GEAR_SLOTS } from '../data/gear';
import { isSpikeId } from '../data/spikes';
import { BADGE_IDS, DIFFICULTIES, MAIN_STOPS, MAX_NAME, MAX_PROFILES } from './rules';
import { initialState, seedFrom } from './reducer';
import type { BadgeId, Best, Difficulty, FinaleStep, Gear, GameState, Phase, Profile, RiddleState, Run, SaveFile, Stars } from './types';

export const SAVE_KEY = 'scq.save.v1';

const PHASES: Phase[] = ['intro', 'challenge', 'riddle', 'travel', 'walking', 'finale', 'summary'];
const FINALE_STEPS: FinaleStep[] = ['return', 'walking', 'puzzle', 'chest', 'done'];
const DIFFS: Difficulty[] = DIFFICULTIES;
const STOP_IDS = STOPS.map((s) => s.id);

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStop = (v: unknown): v is StopId => STOP_IDS.includes(v as StopId);
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const nat = (v: unknown, d = 0) => Math.max(0, Math.floor(num(v, d)));
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Wrong marks are strings; saves from before M5 held choice indexes as numbers. */
function sanitizeMarks(v: unknown): string[] {
  const out: string[] = [];
  for (const m of arr(v)) {
    const t = typeof m === 'number' && Number.isFinite(m) ? String(Math.trunc(m)) : typeof m === 'string' ? m.slice(0, 40) : '';
    if (t && !out.includes(t) && out.length < 12) out.push(t);
  }
  return out;
}

function sanitizeGear(v: unknown): Gear {
  const g = isObj(v) ? v : {};
  const owned = arr(g.owned).filter(isGearId).filter((id, i, a) => a.indexOf(id) === i);
  const equipped: Gear['equipped'] = {};
  const e = isObj(g.equipped) ? g.equipped : {};
  for (const slot of GEAR_SLOTS) {
    const id = e[slot];
    if (typeof id === 'string' && owned.includes(id) && gearItem(id)?.slot === slot) equipped[slot] = id;
  }
  return { owned, equipped };
}

function sanitizeRiddle(v: unknown): RiddleState | null {
  if (!isObj(v)) return null;
  const r: RiddleState = {
    tries: nat(v.tries),
    hinted: v.hinted === true,
    firstTry: v.firstTry !== false,
    wrong: sanitizeMarks(v.wrong),
  };
  // a running clock wins over a paused one; both must be real numbers
  if (typeof v.deadlineAt === 'number' && Number.isFinite(v.deadlineAt) && v.deadlineAt > 0) r.deadlineAt = v.deadlineAt;
  else if (typeof v.remainingMs === 'number' && Number.isFinite(v.remainingMs) && v.remainingMs > 0) r.remainingMs = Math.min(v.remainingMs, 120000);
  return r;
}

/** Returns a consistent run, or null when the data is unusable. A run saved mid-walk resumes at the previous stop. */
export function sanitizeRun(v: unknown): Run | null {
  if (!isObj(v)) return null;
  if (!PHASES.includes(v.phase as Phase) || !isStop(v.at)) return null;
  // unlocked must be a prefix of the stop order: depot, laurel, ...
  const listed = arr(v.unlocked).filter(isStop);
  let k = 0;
  while (k < STOP_IDS.length && listed[k] === STOP_IDS[k]) k++;
  const unlocked = STOP_IDS.slice(0, Math.max(1, k));
  const atIdx = STOP_IDS.indexOf(v.at);
  if (atIdx > unlocked.length - 1) return null;

  const stars: Run['stars'] = {};
  if (isObj(v.stars)) for (const id of STOP_IDS) { const s = v.stars[id]; if (s === 1 || s === 2 || s === 3) stars[id] = s as Stars; }
  const riddles: Run['riddles'] = {};
  if (isObj(v.riddles)) for (const id of STOP_IDS) { const r = sanitizeRiddle(v.riddles[id]); if (r) riddles[id] = r; }

  const fragments = arr(v.fragments).filter((f): f is StopId => MAIN_STOPS.includes(f as StopId)).filter((f, i, a) => a.indexOf(f) === i);
  let phase = v.phase as Phase;
  let at: StopId = v.at;
  let finaleStep: FinaleStep | undefined;
  if (phase === 'finale') {
    // the finale needs every main stop done; anything else is not a real finale save
    if (fragments.length < MAIN_STOPS.length) return null;
    const saved = FINALE_STEPS.includes(v.finaleStep as FinaleStep) ? (v.finaleStep as FinaleStep) : 'return';
    if (saved === 'done') { phase = 'summary'; at = 'depot'; } // chest already open: straight to the results
    else if (saved === 'return' || saved === 'walking' || at !== 'depot') {
      // a walk in flight restarts from the stop the explorer left
      finaleStep = 'return';
      at = unlocked.includes('hiller') ? 'hiller' : 'highlands';
    } else finaleStep = saved;
  } else {
    if (phase === 'walking') phase = 'travel';
    const hasNext = unlocked.length - 1 > atIdx;
    if (phase === 'travel' && !hasNext) phase = 'riddle';
    if (phase === 'riddle' && hasNext) phase = 'travel';
    if (phase === 'riddle' && atIdx === STOP_IDS.length - 1) phase = 'summary';
  }

  return {
    phase,
    ...(finaleStep ? { finaleStep } : {}),
    at,
    unlocked,
    riddles,
    stars,
    fragments,
    xp: nat(v.xp),
    earned: arr(v.earned).filter((b): b is BadgeId => BADGE_IDS.includes(b as BadgeId)),
    startedAt: num(v.startedAt),
    seed: typeof v.seed === 'number' && Number.isFinite(v.seed) ? nat(v.seed) : seedFrom(num(v.startedAt)),
    ...(v.mixed === true ? { mixed: true } : {}),
    ...(v.treasure === true ? { treasure: true } : {}),
    ...(typeof v.treasureXp === 'number' ? { treasureXp: nat(v.treasureXp) } : {}),
    ...(v.newBest === true ? { newBest: true } : {}),
    ...(typeof v.finishedAt === 'number' ? { finishedAt: v.finishedAt } : {}),
  };
}

function sanitizeProfile(v: unknown): Profile | null {
  if (!isObj(v) || typeof v.id !== 'string' || !v.id || typeof v.name !== 'string') return null;
  const name = v.name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
  if (!name) return null;
  let best: Best | null = null;
  if (isObj(v.best) && DIFFS.includes(v.best.difficulty as Difficulty)) {
    best = { xp: nat(v.best.xp), stars: nat(v.best.stars), difficulty: v.best.difficulty as Difficulty, finishedAt: num(v.best.finishedAt) };
  }
  return {
    id: v.id,
    name,
    avatar: isHatId(v.avatar) ? v.avatar : 'red',
    difficulty: DIFFS.includes(v.difficulty as Difficulty) ? (v.difficulty as Difficulty) : 'pro',
    run: sanitizeRun(v.run),
    best,
    badges: arr(v.badges).filter((b): b is BadgeId => BADGE_IDS.includes(b as BadgeId)),
    coins: nat(v.coins),
    gear: sanitizeGear(v.gear),
    spikes: arr(v.spikes).filter(isSpikeId).filter((id, i, a) => a.indexOf(id) === i),
    createdAt: num(v.createdAt),
  };
}

/** Set when the save was written by a newer version of the game: never overwrite it. */
let blocked = false;

/** Parses and validates saved JSON. Anything wrong falls back to a fresh game (never throws). */
export function parseSave(raw: string | null): GameState {
  if (!raw) return initialState();
  try {
    const data: unknown = JSON.parse(raw);
    if (isObj(data) && typeof data.version === 'number' && data.version > 1) { blocked = true; return initialState(); }
    if (!isObj(data) || data.version !== 1 || !Array.isArray(data.profiles)) return initialState();
    const seen = new Set<string>();
    const profiles: Profile[] = [];
    for (const p of data.profiles) {
      const s = sanitizeProfile(p);
      if (s && !seen.has(s.id) && profiles.length < MAX_PROFILES) { seen.add(s.id); profiles.push(s); }
    }
    const activeId = typeof data.activeId === 'string' && profiles.some((p) => p.id === data.activeId && p.run) ? data.activeId : null;
    const muted = isObj(data.settings) && data.settings.muted === true;
    const haptics = !(isObj(data.settings) && data.settings.haptics === false);
    return { profiles, activeId, settings: { muted, haptics } };
  } catch {
    return initialState();
  }
}

export function loadSave(): GameState {
  try {
    return parseSave(localStorage.getItem(SAVE_KEY));
  } catch {
    return initialState();
  }
}

export function writeSave(state: GameState): void {
  if (blocked) return;
  try {
    const file: SaveFile = { version: 1, ...state };
    localStorage.setItem(SAVE_KEY, JSON.stringify(file));
  } catch {
    /* storage full or blocked: the game still works, it just will not resume */
  }
}
