import { useCallback, useEffect, useRef, useState } from 'react';

const TICK_MS = 100;

/**
 * Elapsed play time in ms that freezes while `paused` is true and carries on from the same value afterwards.
 * `elapsedMs` is state (re-renders about 10x/s, good for a timer bar); `getElapsed()` is exact and safe to call
 * from event handlers.
 */
export function usePausableClock(paused: boolean): { elapsedMs: number; getElapsed: () => number } {
  const acc = useRef(0);
  const startedAt = useRef<number | null>(null);
  const [elapsedMs, setElapsed] = useState(0);

  const getElapsed = useCallback(
    () => acc.current + (startedAt.current === null ? 0 : performance.now() - startedAt.current),
    [],
  );

  useEffect(() => {
    if (paused) return;
    startedAt.current = performance.now();
    const t = window.setInterval(() => setElapsed(getElapsed()), TICK_MS);
    return () => {
      window.clearInterval(t);
      acc.current = getElapsed(); // bank the slice that ran before the pause
      startedAt.current = null;
      setElapsed(acc.current);
    };
  }, [paused, getElapsed]);

  return { elapsedMs, getElapsed };
}

/**
 * Counts `totalMs` down on a pausable clock and calls `onEnd` once at zero.
 * `fraction` goes 1 -> 0 (handy for a timer bar). `getRemaining()` is exact.
 */
export function useCountdown(totalMs: number, paused: boolean, onEnd?: () => void) {
  const { elapsedMs, getElapsed } = usePausableClock(paused);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  const fired = useRef(false);
  const remainingMs = Math.max(0, totalMs - elapsedMs);

  useEffect(() => {
    if (remainingMs <= 0 && !fired.current) {
      fired.current = true;
      endRef.current?.();
    }
  }, [remainingMs]);

  const getRemaining = useCallback(() => Math.max(0, totalMs - getElapsed()), [totalMs, getElapsed]);
  return { remainingMs, fraction: totalMs > 0 ? remainingMs / totalMs : 0, getRemaining, getElapsed };
}
