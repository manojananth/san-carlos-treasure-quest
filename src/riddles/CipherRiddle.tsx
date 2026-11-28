import { useEffect, useMemo, useRef, useState } from 'react';
import type { CipherRiddle as Model } from './types';
import type { KindProps } from './kinds';
import { RiddleLayout } from './Layout';
import { decode, normWheel, wheelFromAngle } from './cipher';
import { usePointerDrag } from '../games/kit/usePointerDrag';

const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const STEP = 360 / 26;
const at = (i: number, r: number) => {
  const a = ((i * STEP - 90) * Math.PI) / 180;
  return { x: 100 + r * Math.cos(a), y: 100 + r * Math.sin(a) };
};

/**
 * A decoder wheel. The outer ring (the telegram's letters) stays put; the inner ring (what they really mean) turns.
 * Wheel position `w` puts inner letter P under outer letter P+w, so the message reads clearly when w equals the shift.
 * Drag the inner ring, use the arrow buttons, or press the left/right arrow keys.
 */
export function CipherRiddle({ riddle, hinted, wrong, paused, solved, judge, head, foot }: KindProps<Model>) {
  const [w, setW] = useState(0);
  const [good, setGood] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef({ w: 0, a0: 0 });
  const locked = paused || solved || good !== null;
  const isWrong = (i: number) => wrong.includes(String(i));

  const angleOf = (x: number, y: number) => {
    const r = svg.current!.getBoundingClientRect();
    return (Math.atan2(y - (r.top + r.height / 2), x - (r.left + r.width / 2)) * 180) / Math.PI;
  };
  usePointerDrag(svg, {
    onStart: (i) => { if (locked) return false; drag.current = { w, a0: angleOf(i.x, i.y) }; svg.current?.focus({ preventScroll: true }); },
    onMove: (i) => {
      let d = angleOf(i.x, i.y) - drag.current.a0;
      d = ((d + 540) % 360) - 180; // shortest way round
      setW(wheelFromAngle(drag.current.w, d));
    },
  }, !locked);

  const turn = (d: number) => { if (!locked) setW((v) => normWheel(v + d)); };
  const turnRef = useRef(turn);
  turnRef.current = turn;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); turnRef.current(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); turnRef.current(1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // the hint sets the wheel to the real shift
  useEffect(() => { if (hinted && !riddle.clue) setW(riddle.shift); }, [hinted, riddle.clue, riddle.shift]);

  const reads = useMemo(() => decode(riddle.encoded, w), [riddle.encoded, w]);

  const pick = (i: number) => {
    if (locked || isWrong(i)) return;
    if (i === riddle.answer) { setGood(i); judge(true, String(i)); } else judge(false, String(i));
  };

  return (
    <RiddleLayout
      head={head}
      foot={foot}
      visual={
        <div className="cipher-wheel">
          <button type="button" className="btn btn-plain wheel-btn" aria-label="Turn wheel back one letter" disabled={locked} onClick={() => turn(-1)}>←</button>
          <svg
            ref={svg}
            viewBox="0 0 200 200"
            className="wheel-svg"
            role="slider"
            tabIndex={0}
            aria-label="Decoder wheel"
            aria-valuemin={0}
            aria-valuemax={25}
            aria-valuenow={w}
            aria-valuetext={`Shift ${w}`}
          >
            <circle cx="100" cy="100" r="98" className="wheel-outer" />
            <g className="wheel-turn" style={{ transform: `rotate(${w * STEP}deg)`, transformOrigin: '100px 100px' }}>
              <circle cx="100" cy="100" r="68" className="wheel-inner" />
              {ABC.map((c, i) => {
                const p = at(i, 56);
                return <text key={c} x={p.x} y={p.y} className="wheel-in-l" textAnchor="middle" dominantBaseline="central" transform={`rotate(${i * STEP} ${p.x} ${p.y})`}>{c}</text>;
              })}
            </g>
            {ABC.map((c, i) => {
              const p = at(i, 82);
              return <text key={c} x={p.x} y={p.y} className="wheel-out-l" textAnchor="middle" dominantBaseline="central" transform={`rotate(${i * STEP} ${p.x} ${p.y})`}>{c}</text>;
            })}
            <path d="M94 1 h12 l-6 10 z" className="wheel-mark" />
            <circle cx="100" cy="100" r="24" className="wheel-hub" />
            <text x="100" y="100" textAnchor="middle" dominantBaseline="central" className="wheel-num">{w}</text>
          </svg>
          <button type="button" className="btn btn-plain wheel-btn" aria-label="Turn wheel forward one letter" disabled={locked} onClick={() => turn(1)}>→</button>
        </div>
      }
      answer={
        <>
          <div className="telegram" aria-live="off">
          <small>Telegram{riddle.clue ? ` · shift ${riddle.shift}` : ''}</small>
          <code className="tele-in">{riddle.encoded}</code>
          <small>Wheel reads</small>
          <code className="tele-out">{reads}</code>
        </div>

          {w !== riddle.shift && !hinted ? (
            <p className="note">Turn the wheel until the telegram reads clearly.</p>
          ) : (
          <div className="choices cipher-options" role="group" aria-label="Which stop is the telegram about?">
            {riddle.options.map((c, i) => (
              <button
                key={c}
                type="button"
                className={`choice compact${isWrong(i) ? ' wrong' : ''}${good === i ? ' right' : ''}`}
                disabled={paused || isWrong(i) || (good !== null && good !== i)}
                aria-disabled={isWrong(i) || undefined}
                onClick={() => pick(i)}
              >
                {c}
              </button>
            ))}
          </div>
          )}
        </>
      }
    />
  );
}
