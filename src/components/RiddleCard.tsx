import { useEffect, useRef, useState } from 'react';
import { Sheet } from './Sheet';
import { sfx } from '../audio/sfx';
import { buzzCorrect, buzzWrong } from '../audio/haptics';
import { DIFFICULTY } from '../state/rules';
import type { Riddle } from '../data/riddles';
import type { Difficulty, RiddleState } from '../state/types';

interface Props {
  riddle: Riddle;
  state: RiddleState | undefined;
  difficulty: Difficulty;
  bonus: boolean;
  onAnswer: (choice: number) => void;
  onHint: () => void;
  onTimeout: () => void;
  onSkip?: () => void;
  /** freezes the countdown and input (e.g. while a menu sheet is open) */
  paused?: boolean;
}

export function RiddleCard({ riddle, state, difficulty, bonus, onAnswer, onHint, onTimeout, onSkip, paused = false }: Props) {
  const rules = DIFFICULTY[difficulty];
  const tries = state?.tries ?? 0;
  const wrong = state?.wrong ?? [];
  const [good, setGood] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const secs = rules.riddleSeconds;
  const [left, setLeft] = useState(secs ?? 0);
  // seconds left on the current try; kept in a ref so pausing does not lose the count
  const remaining = useRef(secs ?? 0);
  const timeoutRef = useRef(onTimeout);
  timeoutRef.current = onTimeout;
  const answerRef = useRef(onAnswer);
  answerRef.current = onAnswer;
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  // the timer restarts after every try; running out counts as a wrong try
  useEffect(() => {
    remaining.current = secs ?? 0;
    setLeft(secs ?? 0);
  }, [secs, tries]);

  useEffect(() => {
    if (!secs || good !== null || paused) return;
    const start = remaining.current;
    const t0 = performance.now();
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
    };
  }, [secs, tries, good, paused]);

  const pick = (i: number) => {
    if (good !== null || wrong.includes(i)) return;
    if (i === riddle.answer) {
      setGood(i);
      setMsg('Correct!');
      buzzCorrect();
      sfx('correct');
      window.setTimeout(() => { if (mounted.current) answerRef.current(i); }, 700);
    } else {
      setMsg('Not quite. Try again!');
      buzzWrong();
      sfx('wrong');
      onAnswer(i);
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
            className={`choice${wrong.includes(i) ? ' wrong' : ''}${good === i ? ' right' : ''}`}
            disabled={paused || wrong.includes(i) || (good !== null && good !== i)}
            aria-disabled={wrong.includes(i) || undefined}
            onClick={() => pick(i)}
            data-autofocus={i === 0 ? '' : undefined}
          >
            <span className="choice-mark" aria-hidden="true">{good === i ? '✓' : wrong.includes(i) ? '✗' : String.fromCharCode(65 + i)}</span>
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
