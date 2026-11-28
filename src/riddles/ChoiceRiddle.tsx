import { useEffect, useRef, useState } from 'react';
import type { ChoiceRiddle as Model } from './types';
import type { KindProps } from './kinds';
import { RiddleLayout } from './Layout';

/** Four options. Keys 1-4 or A-D pick one. */
export function ChoiceRiddle({ riddle, wrong, paused, solved, judge, head, foot }: KindProps<Model>) {
  const [good, setGood] = useState<number | null>(null);
  const isWrong = (i: number) => wrong.includes(String(i));
  const ref = useRef<HTMLDivElement>(null);

  const pick = (i: number) => {
    if (good !== null || solved || paused || isWrong(i)) return;
    if (i === riddle.answer) {
      setGood(i);
      judge(true, String(i));
    } else {
      judge(false, String(i));
      // the picked button is about to become disabled and drop focus; move it to a remaining choice
      requestAnimationFrame(() => ref.current?.querySelector<HTMLButtonElement>('.choice:not([disabled])')?.focus());
    }
  };
  const pickRef = useRef(pick);
  pickRef.current = pick;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const i = '1234'.includes(k) && k.length === 1 ? Number(k) - 1 : 'abcd'.indexOf(k);
      if (k.length === 1 && i >= 0 && i < riddle.options.length) pickRef.current(i);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [riddle.options.length]);

  return (
    <RiddleLayout
      head={head}
      foot={foot}
      answer={
        <div className="choices" role="group" aria-label="Choices" ref={ref}>
          {riddle.options.map((c, i) => (
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
      }
    />
  );
}
