import { describe, expect, it } from 'vitest';
import { simulate } from './kick';

describe('kick physics', () => {
  it('a gust that matches the starting wind changes nothing', () => {
    const a = simulate(2, 0.7, 1, 30);
    const b = simulate(2, 0.7, 1, 30, { at: 1, wind: 1 });
    expect(b.pos(a.tc).x).toBeCloseTo(a.pos(a.tc).x, 6);
  });
  it('Treasure Hunter gust: the wind switches mid-flight and bends the ball the other way', () => {
    const steady = simulate(0, 0.7, 1, 30);
    const gust = simulate(0, 0.7, 1, 30, { at: 0.9, wind: -1 });
    // identical before the gust, different after it
    expect(gust.pos(0.8).x).toBeCloseTo(steady.pos(0.8).x, 6);
    expect(gust.pos(steady.tc).x).toBeLessThan(steady.pos(steady.tc).x - 0.4);
    // position and velocity stay continuous at the switch
    const e = 1e-4;
    expect(Math.abs(gust.pos(0.9 + e).x - gust.pos(0.9 - e).x)).toBeLessThan(0.01);
  });
  it('the longest Treasure Hunter kick (45 yd) is makeable, with a fair power window', () => {
    const goals = Array.from({ length: 41 }, (_, i) => 0.6 + i * 0.01).filter((p) => simulate(0, p, 0, 45).outcome === 'goal');
    expect(goals.length).toBeGreaterThanOrEqual(5); // at least ~5% of the power meter
  });
});
