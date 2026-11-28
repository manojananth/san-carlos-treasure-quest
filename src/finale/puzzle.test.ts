import { describe, expect, it } from 'vitest';
import { CELL, PIECES, SNAP_TOLERANCE, judgeDrop, moveSlot, nearestSlot, slotCenter, slotName, trayOrder } from './puzzle';

describe('fragment puzzle logic', () => {
  it('slot centres sit on a 3x2 grid', () => {
    expect(slotCenter(0)).toEqual({ x: 50, y: 50 });
    expect(slotCenter(2)).toEqual({ x: 250, y: 50 });
    expect(slotCenter(3, 10, 20)).toEqual({ x: 60, y: 170 });
    expect(slotName(4)).toBe('bottom middle');
  });
  it('finds the nearest slot only inside the snap tolerance', () => {
    expect(nearestSlot(52, 48)).toBe(0);
    expect(nearestSlot(90, 50)).toBe(0);
    expect(SNAP_TOLERANCE).toBeGreaterThan(CELL / 2);
    expect(nearestSlot(150 + 5, 150 - 5)).toBe(4);
    expect(nearestSlot(CELL, CELL)).toBeNull(); // the corner where four cells meet is 71 units from every centre
    expect(nearestSlot(-200, -200)).toBeNull();
    expect(nearestSlot(60, 30, 100, 0)).toBeNull();
    expect(nearestSlot(160, 30, 100, 0)).toBe(0);
  });
  it('snaps into the right slot, bounces off the wrong one, ignores empty space and filled slots', () => {
    const none = Array(PIECES).fill(false) as boolean[];
    expect(judgeDrop(2, 2, none)).toEqual({ kind: 'snap', slot: 2 });
    expect(judgeDrop(2, 4, none)).toEqual({ kind: 'wrong', slot: 4 });
    expect(judgeDrop(2, null, none)).toEqual({ kind: 'away' });
    const placed = [...none];
    placed[4] = true;
    expect(judgeDrop(2, 4, placed)).toEqual({ kind: 'away' });
  });
  it('arrow keys walk through the free slots and wrap', () => {
    const placed = [false, true, false, false, false, true];
    expect(moveSlot(0, 'ArrowRight', placed)).toBe(2);
    expect(moveSlot(4, 'ArrowRight', placed)).toBe(0);
    expect(moveSlot(0, 'ArrowLeft', placed)).toBe(4);
    expect(moveSlot(0, 'ArrowDown', placed)).toBe(3);
    expect(moveSlot(3, 'ArrowUp', placed)).toBe(0);
    expect(moveSlot(2, 'ArrowDown', placed)).toBe(4); // below is taken: nearest free in the other row
    expect(moveSlot(1, 'ArrowRight', placed)).toBe(2); // from a taken slot
    expect(moveSlot(2, 'ArrowRight', Array(PIECES).fill(true))).toBe(2);
  });
  it('the tray order is a permutation and never solved', () => {
    for (let k = 0; k < 50; k++) {
      const o = trayOrder();
      expect([...o].sort()).toEqual([0, 1, 2, 3, 4, 5]);
      expect(o.every((p, i) => p === i)).toBe(false);
    }
    expect(trayOrder(() => 0.999).every((p, i) => p === i)).toBe(false);
  });
});
