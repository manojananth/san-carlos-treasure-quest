import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import type { ChallengeProps } from '../types';
import type { Difficulty } from '../../state/types';
import { FACTS } from '../../data/facts';
import { MiniGameShell, feedback, shuffled, starsFor, useCountdown, usePausableTimeline } from '../kit';
import type { ShellApi } from '../kit';
import './HallOfScrolls.css';

/**
 * STARS: 5 of 5 correct -> 3 stars, 3 or 4 correct -> 2 stars, otherwise 1 star (starsFor(correct, [3, 5])).
 * Per-question time: 15 s x timeScale (Rookie 19.5 s, Pro 15 s, Legend 11.25 s). A timeout counts as wrong.
 */
const QUESTIONS = 5;
const BASE_SECONDS = 15;
const REVEAL_WRONG_S = 2;
const REVEAL_RIGHT_S = 1;

interface Question { q: string; choices: string[]; answer: number; fact: string }

/** 5 random quiz facts; each question's choices are shuffled and the correct index is recomputed */
function drawQuestions(): Question[] {
  const pool = FACTS.filter((f) => f.quiz);
  return shuffled(pool).slice(0, QUESTIONS).map((f) => {
    const quiz = f.quiz!;
    const order = shuffled([0, 1, 2]);
    return { q: quiz.q, choices: order.map((i) => quiz.choices[i]), answer: order.indexOf(quiz.answer), fact: f.text };
  });
}

const GOALS: Record<Difficulty, string> = {
  rookie: 'Read each scroll and pick the right answer. You get a little extra time. Keys 1, 2, 3 work too!',
  pro: 'Read each scroll and pick the right answer before the time runs out. Keys 1, 2, 3 work too!',
  legend: 'Five scrolls, a short clock. Pick the right answers fast! Keys 1, 2, 3 work too.',
};

function HowToDiagram() {
  return (
    <svg viewBox="0 0 220 96" role="presentation">
      <rect x={1.5} y={1.5} width={217} height={93} rx={12} fill="#e8f6f4" stroke="#1b2430" strokeWidth={3} />
      <rect x={40} y={12} width={140} height={10} rx={5} fill="#a6724f" stroke="#1b2430" strokeWidth={2.5} />
      <rect x={46} y={20} width={128} height={52} fill="#f6e7c1" stroke="#1b2430" strokeWidth={2.5} />
      <rect x={40} y={70} width={140} height={10} rx={5} fill="#a6724f" stroke="#1b2430" strokeWidth={2.5} />
      <path d="M58 32 h70 M58 42 h96" stroke="#1b2430" strokeWidth={3} strokeLinecap="round" />
      <rect x={56} y={50} width={30} height={14} rx={7} fill="#fff" stroke="#1b2430" strokeWidth={2} />
      <rect x={92} y={50} width={30} height={14} rx={7} fill="#fff" stroke="#1b2430" strokeWidth={2} />
      <circle cx={158} cy={56} r={13} fill="#f2b632" stroke="#1b2430" strokeWidth={2.5} />
      <path d="M152 56 l4 5 8 -9" fill="none" stroke="#1b2430" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TimerBar({ totalMs, paused, onEnd }: { totalMs: number; paused: boolean; onEnd: () => void }) {
  const { fraction } = useCountdown(totalMs, paused, onEnd);
  return (
    <div className="mg-bar" aria-hidden="true">
      <div className={`mg-bar-fill${fraction < 0.25 ? ' low' : ''}`} style={{ width: `${fraction * 100}%` }} />
    </div>
  );
}

type Verdict = 'right' | 'wrong' | 'timeout';

function Play({ timeScale, api }: { timeScale: number; api: ShellApi }) {
  const questions = useMemo(drawQuestions, []);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const verdictRef = useRef<Verdict | null>(null);
  const qiRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sealRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);
  const reduced = api.reducedMotion;
  const { tween } = usePausableTimeline(!api.active);
  const q = questions[qi];
  const totalMs = BASE_SECONDS * 1000 * timeScale;

  // the scroll unrolls (reduced motion: a plain fade) before each question
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (reduced) {
      gsap.set(el, { opacity: 0, clipPath: 'none' });
      tween(el, { opacity: 1, duration: 0.2 });
    } else {
      gsap.set(el, { opacity: 1, clipPath: 'inset(0% 0% 100% 0%)' });
      tween(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.55, ease: 'power2.out' });
    }
    if (sealRef.current) gsap.set(sealRef.current, { opacity: 0 });
  }, [qi, reduced, tween]);

  useEffect(() => { if (api.active) firstRef.current?.focus({ preventScroll: true }); }, [qi, api.active]);

  const settle = useCallback((v: Verdict, choice: number | null) => {
    if (verdictRef.current || !api.active) return;
    verdictRef.current = v;
    setPicked(choice);
    setVerdict(v);
    if (v === 'right') {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      feedback.hit();
      const seal = sealRef.current;
      if (seal) {
        if (reduced) gsap.set(seal, { opacity: 1, scale: 1, rotation: -8 });
        else {
          gsap.set(seal, { opacity: 1, scale: 2.4, rotation: -30 });
          tween(seal, { scale: 1, rotation: -8, duration: 0.3, ease: 'back.out(1.8)' });
        }
      }
    } else {
      feedback.miss();
    }
    tween({}, {
      duration: v === 'right' ? REVEAL_RIGHT_S : REVEAL_WRONG_S,
      onComplete: () => {
        if (qiRef.current + 1 >= QUESTIONS) {
          const stars = starsFor(scoreRef.current, [3, 5]);
          api.finish(stars, `${scoreRef.current} of ${QUESTIONS} scrolls answered right!`);
        } else {
          qiRef.current += 1;
          verdictRef.current = null;
          setPicked(null);
          setVerdict(null);
          setQi(qiRef.current);
        }
      },
    });
  }, [api, reduced, tween]);

  const settleRef = useRef(settle);
  settleRef.current = settle;
  const choose = (i: number) => settleRef.current(i === q.answer ? 'right' : 'wrong', i);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!api.active || e.ctrlKey || e.metaKey || e.altKey) return;
      const n = ['1', '2', '3'].indexOf(e.key);
      if (n >= 0) { e.preventDefault(); settleRef.current(n === questions[qiRef.current].answer ? 'right' : 'wrong', n); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [api.active, questions]);

  const showFact = verdict === 'wrong' || verdict === 'timeout';
  return (
    <div className="ch-play" data-paused={api.active ? undefined : ''}>
      <div className="mg-hud">
        <TimerBar key={qi} totalMs={totalMs} paused={!api.active || verdict !== null} onEnd={() => settleRef.current('timeout', null)} />
        <span>Scroll {qi + 1}/{QUESTIONS}</span>
        <span>Seals {score}</span>
      </div>
      <div className="ch-scroll" ref={scrollRef}>
        <div className="ch-rod" />
        <div className="ch-paper">
          <div className="ch-q">
            <h3 className="ch-head">Scroll {qi + 1}</h3>
            <p className="ch-question">{q.q}</p>
            <p className={`ch-fact${showFact ? ' on' : ''}`} aria-live="polite">
              {showFact && (
                <>
                  <b>{verdict === 'timeout' ? "Time's up! " : 'Not quite. '}The answer: {q.choices[q.answer]}.</b> {q.fact}
                </>
              )}
            </p>
          <div className="ch-seal" ref={sealRef} aria-hidden="true">
            <svg viewBox="-30 -30 60 60">
              <path d="M0 -27 l6 4 7 -3 4 6 7 1 0 7 6 4 -3 7 3 7 -6 4 0 7 -7 1 -4 6 -7 -3 -6 4 -6 -4 -7 3 -4 -6 -7 -1 0 -7 -6 -4 3 -7 -3 -7 6 -4 0 -7 7 -1 4 -6 z" fill="#c8372d" stroke="#1b2430" strokeWidth={2} strokeLinejoin="round" transform="scale(.9)" />
              <circle r={17} fill="#f2b632" stroke="#1b2430" strokeWidth={2.5} />
              <path d="M-8 1 l6 7 11 -14" fill="none" stroke="#1b2430" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          </div>
          <div className="ch-choices" role="group" aria-label="Answers">
            {q.choices.map((c, i) => {
              const cls = verdict === null ? '' : i === q.answer ? (verdict === 'right' ? ' right' : ' reveal') : i === picked ? ' wrong' : ' dim';
              return (
                <button
                  key={`${qi}-${i}`} type="button" ref={i === 0 ? firstRef : undefined} data-game-focus={i === 0 ? '' : undefined}
                  className={`ch-choice${cls}`} aria-disabled={verdict !== null || undefined}
                  onClick={() => choose(i)}
                >
                  <span className="ch-num" aria-hidden="true">{i + 1}</span>
                  <span>{c}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="ch-rod" />
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        {verdict === 'right' ? 'Correct!' : verdict === 'wrong' ? `Not quite. The answer is ${q.choices[q.answer]}.` : verdict === 'timeout' ? 'Time is up.' : `Scroll ${qi + 1}. ${q.q}`}
      </div>
    </div>
  );
}

/** City Hall: five quiz scrolls from the city facts. */
export function HallOfScrolls({ difficulty, timeScale, onFinish, paused = false }: ChallengeProps) {
  const diagram = useMemo(() => <HowToDiagram />, []);
  return (
    <MiniGameShell goal={GOALS[difficulty]} diagram={diagram} paused={paused} onFinish={onFinish}>
      {(api) => <Play timeScale={timeScale} api={api} />}
    </MiniGameShell>
  );
}
