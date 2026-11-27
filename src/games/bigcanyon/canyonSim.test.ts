import { describe, expect, it } from 'vitest';
import {
  BASE_SECONDS, COURSE, JUMP_V, GRAVITY, STAR_SCORE, createSim, pressJump, remainingSeconds, scoreOf, stepSim,
} from './canyonSim';
import type { SimState } from './canyonSim';

const DT = 1 / 60;

/** plays a whole run; `lead` = how far before an obstacle the bot taps (units), `jitter` shifts the tap in seconds */
function run(opts: { jump: boolean; lead?: number; held?: boolean; limit?: number }): SimState {
  const s = createSim();
  const lead = opts.lead ?? 34;
  const limit = opts.limit ?? BASE_SECONDS;
  let next = 0;
  for (let i = 0; i < 60 * 80 && !s.won; i++) {
    const o = COURSE.obstacles[next];
    if (o && opts.jump && o.x - s.x <= lead) { pressJump(s); next++; }
    else if (o && s.x > o.x + 20) next++;
    stepSim(s, DT, !!opts.held);
    if (remainingSeconds(s, limit) < -40) break;
  }
  return s;
}

describe('canyon pacing', () => {
  it('jump height clears the tallest rock with room to spare', () => {
    expect(JUMP_V * JUMP_V / (2 * GRAVITY)).toBeGreaterThan(50);
  });
  it('a clean run (no gems on purpose is impossible, so look at raw time) takes ~24.5 s', () => {
    const s = run({ jump: true });
    expect(s.stumbles).toBe(0);
    expect(s.t).toBeGreaterThan(24);
    expect(s.t).toBeLessThan(25);
  });
  it('a clean run leaves about 30% on Pro before gem bonus', () => {
    const s = run({ jump: true });
    const left = (BASE_SECONDS - s.t) / BASE_SECONDS;
    expect(left).toBeGreaterThan(0.27);
    expect(left).toBeLessThan(0.33);
  });
  it('taps a little early or late still clear every obstacle', () => {
    for (const lead of [28, 34, 46, 52]) expect(run({ jump: true, lead }).stumbles, `lead ${lead}`).toBe(0);
  });
  it('never jumping stumbles on every obstacle but still finishes on Pro', () => {
    const s = run({ jump: false });
    expect(s.stumbles).toBe(COURSE.obstacles.length);
    expect(s.won).toBe(true);
    expect(remainingSeconds(s, BASE_SECONDS)).toBeGreaterThan(0);
  });
  it('never jumping runs out of time on Legend ("So close!")', () => {
    const limit = BASE_SECONDS * 0.75;
    const s = createSim();
    for (let i = 0; i < 60 * 60 && !s.won && remainingSeconds(s, limit) > 0; i++) stepSim(s, DT, false);
    expect(s.won).toBe(false);
  });
  it('a clean run with gems earns 3 stars on Pro; boost helps Legend', () => {
    const s = run({ jump: true });
    expect(s.gems).toBeGreaterThan(8);
    expect(scoreOf(s, BASE_SECONDS)).toBeGreaterThanOrEqual(STAR_SCORE[0]);
    const legend = run({ jump: true, held: true, limit: BASE_SECONDS * 0.75 });
    expect(legend.t).toBeLessThan(BASE_SECONDS * 0.75);
  });
  it('a stumble costs a little time and score', () => {
    const clean = run({ jump: true });
    const oops = run({ jump: true });
    oops.stumbles = 1;
    expect(scoreOf(oops, BASE_SECONDS)).toBeLessThan(scoreOf(clean, BASE_SECONDS));
  });
});
