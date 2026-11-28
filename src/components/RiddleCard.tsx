import { useEffect, useRef, useState } from 'react';
import { Sheet } from './Sheet';
import { sfx } from '../audio/sfx';
import { buzzCorrect, buzzWrong } from '../audio/haptics';
import { DIFFICULTY, riddleStartMs } from '../state/rules';
import type { Riddle, RiddleKind } from '../data/riddles';
import type { Difficulty, RiddleState } from '../state/types';
import type { PickHandle, PickOptions } from '../map/pick';
import type { Judge } from '../riddles/kinds';
import { ChoiceRiddle } from '../riddles/ChoiceRiddle';
import { CipherRiddle } from '../riddles/CipherRiddle';
import { MapRiddle } from '../riddles/MapRiddle';
import { ScrambleRiddle } from '../riddles/ScrambleRiddle';
import '../riddles/riddles.css';

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
  /** starts tap-the-map mode on the real map (map riddles); returns the cancel function */
  pick?: (o: PickOptions) => PickHandle;
}

/** Harder kinds need more hands-on time, so their clock is longer than the plain-choice one. */
export const KIND_TIME: Record<RiddleKind, number> = { choice: 1, scramble: 1.4, cipher: 1.8, map: 2 };

const hintText = (r: Riddle): string => {
  switch (r.kind) {
    case 'cipher': return r.clue ? r.hint : `The telegraph code slides every letter ${r.shift} places. The wheel is set to ${r.shift} for you.`;
    case 'map': return `A dashed circle on the map shows the neighbourhood. ${r.hint}`;
    case 'scramble': return `${r.hint} The first unsolved letter is filled in for you.`;
    default: return r.hint;
  }
};

export function RiddleCard({ riddle, state, difficulty, bonus, onAnswer, onHint, onTimeout, onSkip, onClock, paused = false, pick }: Props) {
  const rules = DIFFICULTY[difficulty];
  const tries = state?.tries ?? 0;
  const wrong = state?.wrong ?? [];
  const [good, setGood] = useState(false);
  const [msg, setMsg] = useState('');
  const secs = rules.riddleSeconds ? Math.round(rules.riddleSeconds * KIND_TIME[riddle.kind]) : null;
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
    if (!secs || good || paused) return;
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

  const judge: Judge = (correct, mark, wrongMsg) => {
    if (good) return;
    if (correct) {
      setGood(true);
      setMsg('Correct!');
      buzzCorrect();
      sfx('correct');
      window.setTimeout(() => { if (mounted.current) answerRef.current(true, mark); }, 700);
    } else {
      setMsg(wrongMsg ?? 'Not quite. Try again!');
      buzzWrong();
      sfx('wrong');
      onAnswer(false, mark);
    }
  };

  const hinted = state?.hinted ?? false;
  const head = (
    <>
      <p className="riddle-text">{riddle.text}</p>
      {secs ? (
        <div className="timer" role="timer" aria-label={`${Math.ceil(left)} seconds left`}>
          <div className={`timer-fill${left / secs < 0.25 ? ' low' : ''}`} style={{ width: `${Math.max(0, (left / secs) * 100)}%` }} />
          <span>{Math.ceil(left)}s</span>
        </div>
      ) : null}
      {hinted && <p className="hint-box"><b>Hint:</b> {hintText(riddle)}</p>}
    </>
  );
  const foot = (
    <>
      <p className="feedback" role="status" aria-live="assertive">{msg}</p>
      <div className="row">
        <button type="button" className="btn btn-plain" disabled={hinted || good} onClick={() => { sfx('hint'); onHint(); }}>
          {hinted ? 'Hint used' : `Hint (−${rules.hintCost} XP)`}
        </button>
        {onSkip && <button type="button" className="btn btn-plain" onClick={onSkip}>Skip bonus</button>}
      </div>
    </>
  );
  const common = { hinted, wrong, paused, solved: good, judge, head, foot };
  const label = bonus ? 'Bonus riddle' : 'Riddle';

  if (riddle.kind === 'map') return <MapRiddle {...common} riddle={riddle} pick={pick} label={label} />;
  return (
    <Sheet title={label} heading={bonus ? <>Bonus <span>riddle</span></> : <>Where is the <span>next fragment?</span></>} className={`riddle riddle-${riddle.kind}`}>
      {bonus && <p className="note">Solve this to open a secret stop, or skip it and finish your quest.</p>}
      {riddle.kind === 'choice' && <ChoiceRiddle {...common} riddle={riddle} />}
      {riddle.kind === 'cipher' && <CipherRiddle {...common} riddle={riddle} />}
      {riddle.kind === 'scramble' && <ScrambleRiddle {...common} riddle={riddle} />}
    </Sheet>
  );
}
