import { useEffect, useRef, useState } from 'react';
import { Sheet } from './Sheet';
import { sfx } from '../audio/sfx';
import { buzzCorrect, buzzWrong } from '../audio/haptics';
import { DIFFICULTY, riddleStartMs } from '../state/rules';
import type { Riddle } from '../data/riddles';
import type { Difficulty, RiddleState } from '../state/types';

interface Props {
  riddle: Riddle;
  state: RiddleState | undefined;
  difficulty: Difficulty;
  bonus: boolean;
  /** the card judges the answer itself; `mark` names a wrong answer so it greys out and is not counted twice */
  onAnswer: (correct: boolean, mark?: string) => void;
  onHint: () => void;
  onTimeout: () => void;
  onSkip?: () => void;
  /** the timer started (`running`) or stopped with `remainingMs` left; lets the run save its clock so a reload resumes it */
  onClock?: (running: boolean, remainingMs: number) => void;
  /** freezes the countdown and input (e.g. while a menu sheet is open) */
  paused?: boolean;
}

export function RiddleCard({ riddle, state, difficulty, bonus, onAnswer, onHint, onTimeout, onSkip, onClock, paused = false }: Props) {
  const rules = DIFFICULTY[difficulty];
  const tries = state?.tries ?? 0;
  const wrong = state?.wrong ?? [];
  const [good, setGood] = useState<number | null>(null);
  const isWrong = (i: number) => wrong.includes(String(i));
  const [msg, setMsg] = useState('');
  const secs = rules.riddleSeconds;
  // seconds left on the current try; kept in a ref so pausing does not lose the count.
  // A reload resumes from the saved deadline (or the paused time) instead of starting over.
  const remaining = useRef(secs ? riddleStartMs(secs, state, Date.now()) / 1000 : 0);
  const [left, setLeft] = useState(remaining.current);
  const clockRef = useRef(onClock);
  clockRef.current = onClock;
  const mountedTries = useRef(tries);
  const timeoutRef = useRef(onTimeout);
  timeoutRef.current = onTimeout;
  const answerRef = useRef(onAnswer);
  answerRef.current = onAnswer;
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  // the timer restarts after every try; running out counts as a wrong try
  useEffect(() => {
    if (mountedTries.current === tries) return; // first run: keep the resumed time
    mountedTries.current = tries;
    remaining.current = secs ?? 0;
    setLeft(secs ?? 0);
  }, [secs, tries]);

  useEffect(() => {
    if (!secs || good !== null || paused) return;
    const start = remaining.current;
    const t0 = performance.now();
    clockRef.current?.(true, start * 1000);
    const t = window.setInterval(() => {
      remaining.current = Math.max(0, start - (performance.now() - t0) / 1000);
      if (remaining.current <= 0) {
        window.clearInterval(t);
        setLeft(0);
        setMsg("Time's up! Try again.");
        buzzWrong();
        sfx('wrong');
        timeoutRef.current();
      } else setLeft(remaining.current);
    }, 200);
    return () => {
      // keep the time that ran before a pause or an answer
      remaining.current = Math.max(0, start - (performance.now() - t0) / 1000);
      window.clearInterval(t);
      clockRef.current?.(false, remaining.current * 1000);
    };
  }, [secs, tries, good, paused]);

  const pick = (i: number) => {
    if (good !== null || isWrong(i)) return;
    if (i === riddle.answer) {
      setGood(i);
      setMsg('Correct!');
      buzzCorrect();
      sfx('correct');
      window.setTimeout(() => { if (mounted.current) answerRef.current(true, String(i)); }, 700);
    } else {
      setMsg('Not quite. Try again!');
      buzzWrong();
      sfx('wrong');
      onAnswer(false, String(i));
      // the picked button is about to become disabled and drop focus; move it to a remaining choice
      requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.riddle .choice:not([disabled])')?.focus());
    }
  };

  const hinted = state?.hinted ?? false;
  return (
    <Sheet title={bonus ? 'Bonus riddle' : 'Riddle'} heading={bonus ? <>Bonus <span>riddle</span></> : <>Where is the <span>next fragment?</span></>} className="riddle">
      {bonus && <p className="note">Solve this to open a secret stop, or skip it and finish your quest.</p>}
      <div className="riddle-cols">
      <div className="riddle-l">
      <p className="riddle-text">{riddle.text}</p>

      {secs ? (
        <div className="timer" role="timer" aria-label={`${Math.ceil(left)} seconds left`}>
          <div className={`timer-fill${left / secs < 0.25 ? ' low' : ''}`} style={{ width: `${Math.max(0, (left / secs) * 100)}%` }} />
          <span>{Math.ceil(left)}s</span>
        </div>
      ) : null}
      {hinted && <p className="hint-box"><b>Hint:</b> {riddle.hint}</p>}
      </div>

      <div className="riddle-r">
      <div className="choices" role="group" aria-label="Choices">
        {riddle.choices.map((c, i) => (
          <button
            key={c}
            type="button"
            className={`choice${isWrong(i) ? ' wrong' : ''}${good === i ? ' right' : ''}`}
            disabled={paused || isWrong(i) || (good !== null && good !== i)}
            aria-disabled={isWrong(i) || undefined}
            onClick={() => pick(i)}
            data-autofocus={i === 0 ? '' : undefined}
          >
            <span className="choice-mark" aria-hidden="true">{good === i ? '✓' : isWrong(i) ? '✗' : String.fromCharCode(65 + i)}</span>
            {c}
          </button>
        ))}
      </div>

      <p className="feedback" role="status" aria-live="assertive">{msg}</p>

      <div className="row">
        <button type="button" className="btn btn-plain" disabled={hinted || good !== null} onClick={() => { sfx('hint'); onHint(); }}>
          {hinted ? 'Hint used' : `Hint (−${rules.hintCost} XP)`}
        </button>
        {onSkip && <button type="button" className="btn btn-plain" onClick={onSkip}>Skip bonus</button>}
      </div>
      </div>
      </div>
    </Sheet>
  );
}
