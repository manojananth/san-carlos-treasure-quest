import { useCallback, useEffect, useRef, useState } from 'react';
import { sfx } from '../audio/sfx';
import { buzz } from '../audio/haptics';
import type { ChallengeProps } from './types';

const COINS = 10;
const BASE_SECONDS = 14; // x timeScale: Rookie 18.2 s, Pro 14 s, Legend 10.5 s (all under 20 s)

type Spot = { x: number; y: number; id: number };
const randSpot = (id: number): Spot => ({ x: 10 + Math.random() * 80, y: 14 + Math.random() * 72, id });

/** Tap 10 gold coins before time runs out. Generic stand-in until each stop gets its own mini-game (M3). */
export function PlaceholderChallenge({ timeScale, onFinish }: ChallengeProps) {
  const total = BASE_SECONDS * timeScale;
  const [got, setGot] = useState(0);
  const [left, setLeft] = useState(total);
  const [spot, setSpot] = useState<Spot>(() => randSpot(0));
  const [result, setResult] = useState<1 | 2 | 3 | null>(null);
  const startedAt = useRef(performance.now());
  const doneRef = useRef(false);
  const gotRef = useRef(0);

  const finish = useCallback((collected: number, remaining: number) => {
    if (doneRef.current) return;
    doneRef.current = true;
    const frac = remaining / total;
    // all coins collected: stars by time left; time up: still 1 star for trying
    const stars: 1 | 2 | 3 = collected >= COINS ? (frac >= 0.45 ? 3 : frac >= 0.2 ? 2 : 1) : 1;
    setResult(stars);
    sfx(collected >= COINS ? 'fanfare' : 'wrong');
  }, [total]);

  useEffect(() => {
    const t = window.setInterval(() => {
      if (doneRef.current) return;
      const remaining = Math.max(0, total - (performance.now() - startedAt.current) / 1000);
      setLeft(remaining);
      if (remaining <= 0) finish(gotRef.current, 0);
    }, 100);
    return () => window.clearInterval(t);
  }, [total, finish]);

  // a missed coin hops somewhere else after a moment, so you cannot just wait
  useEffect(() => {
    if (result) return;
    const t = window.setTimeout(() => setSpot((s) => randSpot(s.id + 1)), 1900 * timeScale);
    return () => window.clearTimeout(t);
  }, [spot.id, result, timeScale]);

  const tap = (e: React.PointerEvent) => {
    e.preventDefault();
    if (doneRef.current) return;
    const n = gotRef.current + 1;
    gotRef.current = n;
    setGot(n);
    sfx('coin');
    buzz(15);
    if (n >= COINS) {
      const remaining = Math.max(0, total - (performance.now() - startedAt.current) / 1000);
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
