import { useCallback, useEffect, useRef, useState } from 'react';
import { sfx } from '../audio/sfx';
import { buzz } from '../audio/haptics';
import type { ChallengeProps } from './types';

const COINS = 10;
const BASE_SECONDS = 14; // x timeScale: Rookie 18.2 s, Pro 14 s, Legend 10.5 s (all under 20 s)

type Spot = { x: number; y: number; id: number };
const randSpot = (id: number): Spot => ({ x: 10 + Math.random() * 80, y: 14 + Math.random() * 72, id });

/** Tap 10 gold coins before time runs out. Generic stand-in until each stop gets its own mini-game (M3). */
export function PlaceholderChallenge({ timeScale, onFinish, paused = false }: ChallengeProps) {
  const total = BASE_SECONDS * timeScale;
  const [got, setGot] = useState(0);
  const [left, setLeft] = useState(total);
  const [spot, setSpot] = useState<Spot>(() => randSpot(0));
  const [result, setResult] = useState<1 | 2 | 3 | null>(null);
  // seconds of play so far; only advances while not paused
  const elapsed = useRef(0);
  const doneRef = useRef(false);
  const gotRef = useRef(0);
  // when the tapped coin had keyboard focus, keep focus on the next coin
  const keepFocus = useRef(false);

  const finish = useCallback((collected: number, remaining: number) => {
    if (doneRef.current) return;
    doneRef.current = true;
    const frac = remaining / total;
    // all coins collected: stars by time left; time up: still 1 star for trying
    const stars: 1 | 2 | 3 = collected >= COINS ? (frac >= 0.45 ? 3 : frac >= 0.2 ? 2 : 1) : 1;
    setResult(stars);
    sfx(collected >= COINS ? 'fanfare' : 'wrong');
  }, [total]);

  // the clock stops while paused and resumes from where it left off
  useEffect(() => {
    if (paused) return;
    let last = performance.now();
    const t = window.setInterval(() => {
      if (doneRef.current) return;
      const now = performance.now();
      elapsed.current += (now - last) / 1000;
      last = now;
      const remaining = Math.max(0, total - elapsed.current);
      setLeft(remaining);
      if (remaining <= 0) finish(gotRef.current, 0);
    }, 100);
    return () => {
      // count the slice that ran before the pause
      elapsed.current += (performance.now() - last) / 1000;
      window.clearInterval(t);
    };
  }, [total, finish, paused]);

  // a missed coin hops somewhere else after a moment, so you cannot just wait
  useEffect(() => {
    if (result || paused) return;
    const t = window.setTimeout(() => setSpot((s) => randSpot(s.id + 1)), 1900 * timeScale);
    return () => window.clearTimeout(t);
  }, [spot.id, result, timeScale, paused]);

  const tap = (e: React.PointerEvent) => {
    e.preventDefault();
    if (doneRef.current || paused) return;
    keepFocus.current = document.activeElement === e.currentTarget;
    const n = gotRef.current + 1;
    gotRef.current = n;
    setGot(n);
    sfx('coin');
    buzz(15);
    if (n >= COINS) {
      const remaining = Math.max(0, total - elapsed.current);
      setLeft(remaining);
      finish(n, remaining);
    } else {
      setSpot((s) => randSpot(s.id + 1));
    }
  };

  return (
    <div className="game">
      <div className="game-bar" aria-hidden="true">
        <div className="game-bar-fill" style={{ width: `${Math.max(0, (left / total) * 100)}%` }} />
      </div>
      <div className="game-head">
        <strong>Tap the gold coins!</strong>
        <span aria-live="off">{got} / {COINS}</span>
      </div>
      <div className="game-field" data-testid="game-field">
        {!result && (
          <button
            key={spot.id}
            type="button"
            className="coin"
            style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
            autoFocus={keepFocus.current}
            disabled={paused}
            onPointerDown={tap}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(e as unknown as React.PointerEvent); } }}
            aria-label="Gold coin, tap it"
          >
            <span aria-hidden="true">$</span>
          </button>
        )}
        {result && (
          <div className="game-result" role="status">
            <div className="stars" aria-label={`${result} of 3 stars`}>
              {[1, 2, 3].map((i) => <span key={i} className={i <= result ? 'star on' : 'star'} aria-hidden="true">★</span>)}
            </div>
            <p>{got >= COINS ? 'All coins collected!' : "Time's up, but nice try!"}</p>
            <button type="button" className="btn btn-go" data-autofocus onClick={() => onFinish(result)}>Continue</button>
          </div>
        )}
      </div>
    </div>
  );
}
