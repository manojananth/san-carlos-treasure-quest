import { useCallback, useMemo, useRef, useState } from 'react';
import { GameMap } from './map/GameMap';
import type { GameMapHandle, MarkerState } from './map/GameMap';
import { STOPS } from './data/stops';

export default function App() {
  const mapRef = useRef<GameMapHandle>(null);
  const [ready, setReady] = useState(false);
  const [walking, setWalking] = useState(false);
  /** index of the stop the explorer is standing at */
  const [at, setAt] = useState(0);

  const next = at + 1 < STOPS.length ? STOPS[at + 1] : null;

  const states = useMemo<MarkerState[]>(
    () => STOPS.map((_, i) => (i <= at ? 'done' : i === at + 1 ? 'current' : 'unlocked')),
    [at],
  );

  const walk = useCallback(async () => {
    if (walking || !next) return;
    setWalking(true);
    try {
      await mapRef.current?.walk(at, at + 1);
      setAt((a) => a + 1);
    } finally {
      setWalking(false);
    }
  }, [walking, next, at]);

  const reset = useCallback(() => {
    mapRef.current?.reset(0);
    setWalking(false);
    setAt(0);
  }, []);

  return (
    <div className="app">
      <GameMap ref={mapRef} states={states} onReady={() => setReady(true)} />

      <header className="topbar">
        <h1>San Carlos <span>Treasure Quest</span></h1>
      </header>

      {!ready && (
        <div className="loading" role="status">
          <div className="spinner" aria-hidden="true" />
          Unrolling the map…
        </div>
      )}

      <section className="panel" aria-live="polite">
        <div className="panel-text">
          <small>Next stop</small>
          <strong>{next ? next.theme : 'Quest complete!'}</strong>
        </div>
        <div className="panel-actions">
          <button className="btn btn-go" onClick={walk} disabled={!ready || walking || !next}>
            {walking ? 'Walking…' : 'Walk to next stop'}
          </button>
          <button className="btn btn-reset" onClick={reset} disabled={!ready}>
            Reset
          </button>
        </div>
      </section>
    </div>
  );
}
