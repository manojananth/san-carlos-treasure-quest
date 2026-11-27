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
}

export function RiddleCard({ riddle, state, difficulty, bonus, onAnswer, onHint, onTimeout, onSkip }: Props) {
  const rules = DIFFICULTY[difficulty];
  const tries = state?.tries ?? 0;
  const wrong = state?.wrong ?? [];
  const [good, setGood] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [left, setLeft] = useState(rules.riddleSeconds ?? 0);
  const timeoutRef = useRef(onTimeout);
  timeoutRef.current = onTimeout;
  const answerRef = useRef(onAnswer);
  answerRef.current = onAnswer;
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  // the timer restarts after every try; running out counts as a wrong try
  const secs = rules.riddleSeconds;
  useEffect(() => {
    if (!secs || good !== null) return;
    const t0 = performance.now();
    setLeft(secs);
    const t = window.setInterval(() => {
      const remaining = secs - (performance.now() - t0) / 1000;
      if (remaining <= 0) {
        window.clearInterval(t);
        setMsg("Time's up! Try again.");
        buzzWrong();
        sfx('wrong');
        timeoutRef.current();
      } else setLeft(remaining);
    }, 200);
    return () => window.clearInterval(t);
  }, [secs, tries, good]);

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
            disabled={wrong.includes(i) || (good !== null && good !== i)}
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
