import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useCountdown } from './clock';
import { useReducedMotion } from './useReducedMotion';
import { feedback } from './feedback';
import './kit.css';

export type ShellPhase = 'howto' | 'countdown' | 'play' | 'result';

export interface ShellApi {
  phase: ShellPhase;
  /** true only while the game is really running: phase is `play` AND the challenge is not paused.
   *  Feed `!active` to clocks / timelines and ignore input when it is false. */
  active: boolean;
  /** report the result once; the shell shows the stars + cheer and calls onFinish when the player taps Continue */
  finish: (stars: 1 | 2 | 3, cheer?: string) => void;
  reducedMotion: boolean;
}

export interface MiniGameShellProps {
  /** one-line goal shown on the how-to card */
  goal: ReactNode;
  /** small illustration for the how-to card (inline SVG, ~160 x 90 units) */
  diagram?: ReactNode;
  /** forwarded from ChallengeProps */
  paused?: boolean;
  onFinish: (stars: 1 | 2 | 3) => void;
  /** the game itself. It is mounted from the start (so it has its final size behind the how-to card) but is
   *  `inert` until `phase === 'play'`; start clocks with `active`. */
  children: (api: ShellApi) => ReactNode;
}

const CHEERS: Record<1 | 2 | 3, string> = {
  3: 'Perfect run, Explorer!',
  2: 'Great job, nearly perfect!',
  1: 'You made it. Try again for more stars!',
};

function Countdown({ paused, onDone }: { paused: boolean; onDone: () => void }) {
  const { remainingMs } = useCountdown(2400, paused, onDone);
  const n = Math.max(1, Math.ceil(remainingMs / 800));
  return (
    <div className="mg-overlay mg-countdown" aria-live="assertive">
      <span key={n} className="mg-count">{n}</span>
    </div>
  );
}

/**
 * Wraps a mini-game: how-to card -> 3-2-1 -> play -> result. The shell owns every screen except `play`, so a
 * game only has to draw itself and call `api.finish(stars)`. See README.md in this folder.
 */
export function MiniGameShell({ goal, diagram, paused = false, onFinish, children }: MiniGameShellProps) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<ShellPhase>('howto');
  const [result, setResult] = useState<{ stars: 1 | 2 | 3; cheer: string } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  const finish = useCallback((stars: 1 | 2 | 3, cheer?: string) => {
    if (done.current) return;
    done.current = true;
    setResult({ stars, cheer: cheer ?? CHEERS[stars] });
    setPhase('result');
    feedback.win(stars);
  }, []);

  const begin = () => setPhase(reduced ? 'play' : 'countdown');

  // keep keyboard focus inside the card as screens change
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    if (phase === 'play') {
      (body.querySelector<HTMLElement>('[data-game-focus]') ?? body).focus({ preventScroll: true });
    } else if (phase === 'result') {
      body.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
    }
  }, [phase]);

  const api: ShellApi = { phase, active: phase === 'play' && !paused, finish, reducedMotion: reduced };
  const inert = phase !== 'play' ? ({ inert: '' } as Record<string, string>) : {};

  return (
    <div className="mg" data-phase={phase}>
      <div className="mg-body" ref={bodyRef} tabIndex={-1}>
        <div className="mg-content" {...inert}>{children(api)}</div>

        {phase === 'howto' && (
          <div className="mg-overlay mg-howto">
            {diagram && <div className="mg-diagram" aria-hidden="true">{diagram}</div>}
            <div className="mg-howto-text">
              <p className="mg-goal">{goal}</p>
              <button type="button" className="btn btn-go" data-autofocus onClick={begin}>Let&rsquo;s go!</button>
            </div>
          </div>
        )}
        {phase === 'countdown' && <Countdown paused={paused} onDone={() => setPhase('play')} />}
        {phase === 'result' && result && (
          <div className="mg-overlay mg-result" role="status">
            <div className="stars" aria-label={`${result.stars} of 3 stars`}>
              {[1, 2, 3].map((i) => <span key={i} className={i <= result.stars ? 'star on' : 'star'} aria-hidden="true">★</span>)}
            </div>
            <p className="mg-cheer">{result.cheer}</p>
            <button type="button" className="btn btn-go" data-autofocus onClick={() => onFinish(result.stars)}>Continue</button>
          </div>
        )}
      </div>
    </div>
  );
}
