import type { StopId } from '../data/stops';

/** Treasure map frame: 3 columns x 2 rows of 100-unit cells. Piece i belongs in slot i (reading order). */
export const COLS = 3;
export const ROWS = 2;
export const CELL = 100;
export const MAP_W = COLS * CELL;
export const MAP_H = ROWS * CELL;

/** The stop that gave each piece, in slot order (top row west to east, then bottom row). */
export const PIECE_STOPS: StopId[] = ['highlands', 'laurel', 'depot', 'bigcanyon', 'burton', 'cityhall'];
export const PIECES = PIECE_STOPS.length;

/** Snap tolerance: a piece dropped with its centre this close (game units) to a slot centre counts as "in" it. */
export const SNAP_TOLERANCE = 58;

const POSITION_NAMES = ['top left', 'top middle', 'top right', 'bottom left', 'bottom middle', 'bottom right'];
export const slotName = (i: number) => POSITION_NAMES[i] ?? `slot ${i + 1}`;

/** Centre of slot `i` inside a frame whose top-left corner is (ox, oy). */
export const slotCenter = (i: number, ox = 0, oy = 0) => ({
  x: ox + (i % COLS) * CELL + CELL / 2,
  y: oy + Math.floor(i / COLS) * CELL + CELL / 2,
});

/** The slot whose centre is nearest to (x, y) and within the tolerance, or null. */
export function nearestSlot(x: number, y: number, ox = 0, oy = 0, tolerance = SNAP_TOLERANCE): number | null {
  let best: number | null = null;
  let bd = tolerance;
  for (let i = 0; i < PIECES; i++) {
    const c = slotCenter(i, ox, oy);
    const d = Math.hypot(c.x - x, c.y - y);
    if (d <= bd) { bd = d; best = i; }
  }
  return best;
}

export type Drop =
  | { kind: 'snap'; slot: number }
  /** over a slot that is not this piece's: bounce back */
  | { kind: 'wrong'; slot: number }
  /** not over a free slot: just go back to the tray */
  | { kind: 'away' };

/** What happens when `piece` is let go over `slot` (null = over no slot). `placed[i]` = piece i is already in the frame. */
export function judgeDrop(piece: number, slot: number | null, placed: boolean[]): Drop {
  if (slot === null) return { kind: 'away' };
  if (placed[slot]) return { kind: 'away' };
  return slot === piece ? { kind: 'snap', slot } : { kind: 'wrong', slot };
}

/** Keyboard: next free slot from `from` for an arrow key (Left/Right step through slots, Up/Down jump a row). */
export function moveSlot(from: number, key: string, placed: boolean[]): number {
  const free = placed.map((p, i) => (p ? -1 : i)).filter((i) => i >= 0);
  if (!free.length) return from;
  if (key === 'ArrowUp' || key === 'ArrowDown') {
    const target = key === 'ArrowUp' ? from - COLS : from + COLS;
    if (target >= 0 && target < PIECES && !placed[target]) return target;
    // otherwise the nearest free slot in that direction, wrapping to the other row
    const row = Math.floor(from / COLS);
    const rowShift = key === 'ArrowUp' ? -1 : 1;
    const wantRow = ((row + rowShift) % ROWS + ROWS) % ROWS;
    const inRow = free.filter((i) => Math.floor(i / COLS) === wantRow);
    if (!inRow.length) return from;
    const col = from % COLS;
    return inRow.reduce((a, b) => (Math.abs((b % COLS) - col) < Math.abs((a % COLS) - col) ? b : a));
  }
  const dir = key === 'ArrowLeft' ? -1 : 1;
  const at = free.indexOf(from);
  if (at < 0) return dir > 0 ? free.find((i) => i > from) ?? free[0] : [...free].reverse().find((i) => i < from) ?? free[free.length - 1];
  return free[(at + dir + free.length) % free.length];
}

/** A tray order (piece index per tray position) that is never already solved. */
export function trayOrder(rand: () => number = Math.random): number[] {
  const order = Array.from({ length: PIECES }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (order.every((p, i) => p === i)) order.push(order.shift() as number);
  return order;
}

/**
 * Treasure Hunter: every piece starts turned a quarter, half or three-quarter turn (clockwise quarter turns, 1-3).
 * A piece only counts once it sits in its slot AND is upright (0 quarter turns).
 */
export function startTurns(rand: () => number = Math.random): number[] {
  return Array.from({ length: PIECES }, () => 1 + Math.min(2, Math.floor(rand() * 3)));
}

/** quarter turns of a piece after `turns` clockwise taps of its rotate button */
export const quarterOf = (turns: number) => ((turns % 4) + 4) % 4;

/** The map is done when every piece is in its slot and upright. */
export const isSolved = (placed: boolean[], turns: number[]) => placed.every(Boolean) && turns.every((t) => quarterOf(t) === 0);
