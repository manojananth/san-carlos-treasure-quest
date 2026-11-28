import { describe, expect, it } from 'vitest';
import { BOB_AMP, BOB_Y, NUDGES, RINGS, WALL_X, ringY, distanceM, launch, nudge, previewPath, ringCount, scoreOf, simulate, stepGlide } from './glide';

describe('paper plane glide', () => {
  it('a flat, strong throw flies far and threads all three rings', () => {
    const g = simulate(0, 1);
    expect(g.mode).toBe('done');
    expect(distanceM(g)).toBeGreaterThan(150);
    expect(ringCount(g)).toBe(3);
    expect(scoreOf(g)).toBeGreaterThanOrEqual(230); // 3 stars
  });
  it('a steep throw stalls and lands short', () => {
    const g = launch(65, 0.5, 0);
    let stalled = false;
    for (let i = 0; i < 3000 && g.mode !== 'done'; i++) { stepGlide(g, 1 / 60); stalled ||= g.stalled; }
    expect(stalled).toBe(true);
    expect(distanceM(g)).toBeLessThan(100);
  });
  it('a gentle throw still scores something (never zero)', () => {
    const g = simulate(10, 0.25);
    expect(g.mode).toBe('done');
    expect(distanceM(g)).toBeGreaterThan(25);
  });
  it('typical mid throws are worth about 2 stars', () => {
    for (const [a, p] of [[14, 0.5], [21, 0.5], [10, 0.4]]) {
      const s = scoreOf(simulate(a, p));
      expect(s, `${a}/${p}`).toBeGreaterThanOrEqual(130);
      expect(s, `${a}/${p}`).toBeLessThan(230);
    }
  });
  it('a plane never leaves the hangar', () => {
    for (const a of [-8, 0, 20, 45, 70]) for (const p of [0.2, 0.6, 1]) {
      const g = simulate(a, p);
      expect(g.x).toBeLessThanOrEqual(WALL_X);
      expect(g.y).toBeGreaterThan(0);
    }
  });
  it('an updraft helps and the count is limited', () => {
    const g = launch(5, 0.6, NUDGES.legend);
    expect(nudge(g)).toBe(true);
    expect(nudge(g)).toBe(false);
    // kick up whenever the plane is sinking low: it flies farther than without help
    const run = (n: number) => {
      const h = launch(30, 0.8, n);
      let last = -9;
      for (let i = 0; i < 3600 && h.mode !== 'done'; i++) {
        if (h.mode === 'fly' && h.vy > 25 && h.y > 130 && h.t - last > 0.8) { nudge(h); last = h.t; }
        stepGlide(h, 1 / 60);
      }
      return distanceM(h);
    };
    expect(run(1)).toBeGreaterThan(run(0) + 10);
  });
  it('rings only count when flown through', () => {
    const g = simulate(60, 0.3);
    expect(ringCount(g)).toBe(0);
    expect(RINGS).toHaveLength(3);
  });
  it('the aiming guide is a short curve starting at the launch point', () => {
    const p = previewPath(20, 0.7, 1);
    expect(p.length).toBeGreaterThan(5);
    expect(p[0].x).toBeLessThan(p[p.length - 1].x);
  });
  it('Treasure Hunter has no updrafts and the rings bob around fixed heights', () => {
    expect(NUDGES.hunter).toBe(0);
    expect(nudge(launch(10, 0.8, NUDGES.hunter, 0))).toBe(false);
    for (let i = 0; i < RINGS.length; i++) {
      expect(ringY(i, null)).toBe(RINGS[i].y);
      const ys = Array.from({ length: 60 }, (_, k) => ringY(i, k * 0.05));
      expect(Math.max(...ys)).toBeGreaterThan(BOB_Y[i] + BOB_AMP - 2);
      expect(Math.min(...ys)).toBeLessThan(BOB_Y[i] - BOB_AMP + 2);
      expect(Math.max(...ys) + 19).toBeLessThan(214); // the lowest ring still hangs above the floor
    }
  });
  it('a bobbing ring only counts when the plane meets it at the right moment', () => {
    // same throw, different bob phase at launch: some phases thread all three rings, others miss some
    const counts = [0, 0.4, 0.8, 1.2, 1.6, 2.0, 2.4].map((c) => ringCount(simulate(10, 1, 0, [], c)));
    expect(Math.max(...counts)).toBe(3);
    expect(Math.min(...counts)).toBeLessThan(3);
    // without bobbing the phase is irrelevant
    expect(new Set([0, 1].map(() => ringCount(simulate(10, 1)))).size).toBe(1);
  });
});
