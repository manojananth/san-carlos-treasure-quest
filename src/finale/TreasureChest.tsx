import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { Sheet } from '../components/Sheet';
import { Stage, usePausableTimeline, useReducedMotion } from '../games/kit';
import { sfx } from '../audio/sfx';
import { buzz } from '../audio/haptics';
import { Confetti } from './Confetti';
import { INK, RED, GOLD, PAPER } from './mapArt';
import './finale.css';

const W = 400, H = 270;
/** chest origin: bottom centre of the chest on the ground */
const CX = 225, CY = 214;
/** where the coins burst out of the chest (stage units) */
const MOUTH = { x: CX, y: CY - 58 };
const PILE = { x: 336, y: 226 };
const WOOD = '#a9774a', WOOD_DARK = '#7a5230', WOOD_LIGHT = '#c4915c';
const STONE = '#c9c3b2';

/** pile of 20 coins: layers of 6, 5, 4, 3, 2 */
const PILE_COINS = [6, 5, 4, 3, 2].flatMap((n, k) =>
  Array.from({ length: n }, (_, j) => ({ x: PILE.x + (j - (n - 1) / 2) * 15 + (k % 2) * 1.5, y: PILE.y - k * 8 })),
);

function Coin() {
  return (
    <>
      <ellipse rx={7.5} ry={5.6} fill={GOLD} stroke={INK} strokeWidth={1.5} />
      <ellipse rx={4.2} ry={2.9} fill="none" stroke="#c98f12" strokeWidth={1.2} />
    </>
  );
}

function Depot() {
  return (
    <g stroke={INK} strokeWidth={2.2} strokeLinejoin="round">
      <rect x={30} y={96} width={164} height={82} fill={STONE} />
      {/* stone courses */}
      <path d="M30 118 H194 M30 140 H194 M30 160 H194" stroke="#a49d8a" strokeWidth={1.2} fill="none" />
      <path d="M16 98 L46 64 H178 L208 98 Z" fill="#8a3f33" />
      <path d="M46 64 H178" stroke="#6e2f27" strokeWidth={4} fill="none" />
      <rect x={72} y={80} width={80} height={14} rx={3} fill={PAPER} strokeWidth={1.6} />
      <text x={112} y={91} textAnchor="middle" fontFamily="'Lilita One', system-ui, sans-serif" fontSize={10.5} fill={INK} stroke="none" letterSpacing={0.8}>SAN CARLOS</text>
      {[52, 140].map((x) => <path key={x} d={`M${x} 160 V132 a12 12 0 0 1 24 0 V160 Z`} fill="#6aa9c9" strokeWidth={1.8} />)}
      <path d="M96 178 V140 a16 16 0 0 1 32 0 V178 Z" fill="#5a3a22" />
      <rect x={20} y={176} width={184} height={8} rx={2} fill="#9c9684" />
    </g>
  );
}

function Rays() {
  return (
    <g>
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d="M0 0 L-9 -78 L9 -78 Z" fill="#fff3b0" opacity={0.55} transform={`rotate(${i * 30})`} />
      ))}
    </g>
  );
}

interface Props {
  /** treasure XP the chest pays (already multiplied) */
  xp: number;
  /** the run says the chest is already open (state step `done`) */
  opened: boolean;
  paused: boolean;
  playerName: string;
  /** called once when the lid starts to open: the state pays the treasure */
  onOpen: () => void;
  /** "See my results" */
  onContinue: () => void;
}

export function TreasureChest({ xp, opened, paused, playerName, onOpen, onContinue }: Props) {
  const reduced = useReducedMotion();
  const startOpened = useRef(opened).current; // later changes are our own doing (onOpen) and must not reset the animation
  const [phase, setPhase] = useState<'closed' | 'opening' | 'open'>(startOpened ? 'open' : 'closed');
  const [status, setStatus] = useState('');
  const [confetti, setConfetti] = useState(false);
  const { add, tween } = usePausableTimeline(paused);
  const lidShut = useRef<SVGGElement>(null);
  const lidUp = useRef<SVGGElement>(null);
  const glow = useRef<SVGGElement>(null);
  const rays = useRef<SVGGElement>(null);
  const pile = useRef<SVGGElement>(null);
  const coins = useRef<(SVGGElement | null)[]>([]);
  const btn = useRef<HTMLButtonElement>(null);

  // starting pose: lid shut, coins hidden at the chest mouth (or the finished pose when the chest is already open)
  useLayoutEffect(() => {
    gsap.set(lidShut.current, { transformOrigin: '50% 100%', scaleY: startOpened ? 0 : 1 });
    gsap.set(lidUp.current, { transformOrigin: '50% 100%', scaleY: startOpened ? 1 : 0 });
    gsap.set(glow.current, { opacity: startOpened ? 1 : 0 });
    coins.current.forEach((c, i) => {
      if (!c) return;
      const p = PILE_COINS[i];
      gsap.set(c, startOpened ? { x: p.x, y: p.y, opacity: 1, scale: 1 } : { x: MOUTH.x, y: MOUTH.y, opacity: 0, scale: 0.6 });
    });
    gsap.set(pile.current, { opacity: 1 });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // slow turning rays behind the open chest
  useEffect(() => {
    if (phase === 'closed' || reduced || !rays.current) return;
    const t = tween(rays.current, { rotation: 360, duration: 24, ease: 'none', repeat: -1 });
    return () => { t.kill(); };
  }, [phase, reduced, tween]);

  const finish = () => {
    setPhase('open');
    setStatus(`The chest is open! You found the treasure, ${playerName}. Plus ${xp} XP.`);
  };

  const open = () => {
    if (phase !== 'closed' || paused) return;
    setPhase('opening');
    onOpen();
    sfx('chest');
    buzz([20, 40, 20]);
    setStatus('The lid creaks open...');
    if (reduced) {
      // lid simply opens, the pile fades in, no coin burst or confetti
      tween(lidShut.current, { scaleY: 0, duration: 0.2 });
      tween(lidUp.current, { scaleY: 1, duration: 0.25, delay: 0.1 });
      tween(glow.current, { opacity: 1, duration: 0.4 });
      coins.current.forEach((c, i) => c && gsap.set(c, { x: PILE_COINS[i].x, y: PILE_COINS[i].y, scale: 1, opacity: 1 }));
      gsap.set(pile.current, { opacity: 0 });
      tween(pile.current, { opacity: 1, duration: 0.6, delay: 0.3 });
      sfx('coins');
      tween({}, { duration: 1, onComplete: finish });
      return;
    }
    const tl = gsap.timeline({ onComplete: finish });
    tl.to(lidShut.current, { scaleY: 0, duration: 0.16, ease: 'power2.in' }, 0)
      .to(lidUp.current, { scaleY: 1, duration: 0.4, ease: 'back.out(2.4)' }, 0.14)
      .to(glow.current, { opacity: 1, duration: 0.35 }, 0.2);
    tl.call(() => { sfx('coins'); setConfetti(true); }, [], 0.5);
    tl.call(() => sfx('cheer'), [], 0.9);
    coins.current.forEach((c, i) => {
      if (!c) return;
      const to = PILE_COINS[i];
      const t0 = 0.5 + i * 0.07;
      const dur = 0.85 + Math.random() * 0.15;
      const peak = MOUTH.y - 60 - Math.random() * 40;
      const drift = (Math.random() - 0.5) * 30;
      tl.set(c, { x: MOUTH.x, y: MOUTH.y, opacity: 1, scale: 0.7 }, t0)
        .to(c, { x: to.x + drift * 0, duration: dur, ease: 'none' }, t0)
        .to(c, { y: peak, duration: dur * 0.42, ease: 'power2.out' }, t0)
        .to(c, { y: to.y, duration: dur * 0.58, ease: 'power2.in' }, t0 + dur * 0.42)
        .to(c, { scale: 1, rotation: 540 * (Math.random() > 0.5 ? 1 : -1), duration: dur, ease: 'none' }, t0)
        .set(c, { rotation: 0 }, t0 + dur);
    });
    add(tl);
  };

  // move focus to the next button when the chest has opened
  useEffect(() => { if (phase === 'open') btn.current?.focus({ preventScroll: true }); }, [phase]);

  return (
    <Sheet
      title={phase === 'closed' ? 'X marks the spot' : 'Treasure found'}
      heading={phase === 'closed' ? <>X marks <span>the spot!</span></> : <>Treasure <span>found!</span></>}
      className="sheet-finale fp chest"
    >
      <div className="fp-body">
        <Stage width={W} height={H} label={phase === 'closed' ? 'The railroad worker’s treasure chest, closed, in front of the old stone depot.' : 'The treasure chest is open and full of gold coins.'} className="fp-stage chest-stage">
          <defs>
            <linearGradient id="chest-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#bfe9ea" /><stop offset="1" stopColor="#fff7e3" /></linearGradient>
            <radialGradient id="chest-glow"><stop offset="0" stopColor="#fff3b0" stopOpacity="0.95" /><stop offset="1" stopColor="#f2b632" stopOpacity="0" /></radialGradient>
          </defs>
          <rect width={W} height={H} fill="url(#chest-sky)" />
          <path d="M0 150 Q60 112 130 140 T270 136 T400 142 V190 H0 Z" fill="#8fc78a" stroke={INK} strokeWidth={2} />
          <rect y={178} width={W} height={H - 178} fill="#7dba68" stroke={INK} strokeWidth={2} />
          <path d="M0 196 H400" stroke="#a9d49b" strokeWidth={3} />
          <Depot />
          {/* X marks the spot, painted on the ground in front of the chest */}
          <g transform={`translate(${CX} ${CY + 22})`} strokeLinecap="round">
            <path d="M-13 -9 L13 9 M13 -9 L-13 9" stroke={INK} strokeWidth={9} />
            <path d="M-13 -9 L13 9 M13 -9 L-13 9" stroke={RED} strokeWidth={5.5} />
          </g>
          {/* glow + rays behind the open chest */}
          <g ref={glow} transform={`translate(${CX} ${CY - 60})`} pointerEvents="none">
            <circle r={86} fill="url(#chest-glow)" />
            <g ref={rays}><Rays /></g>
          </g>
          {/* the chest */}
          <g transform={`translate(${CX} ${CY})`} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" onClick={open} style={{ cursor: phase === 'closed' ? 'pointer' : 'default' }}>
            <ellipse cx={0} cy={4} rx={72} ry={8} fill="#000" opacity={0.18} stroke="none" />
            {/* open lid, standing up behind the opening */}
            <g ref={lidUp}>
              <path d="M-54 -52 L-54 -76 Q-54 -94 -34 -94 L34 -94 Q54 -94 54 -76 L54 -52 Z" fill={WOOD_DARK} />
              <path d="M-46 -54 L-46 -76 Q-46 -86 -32 -86 L32 -86 Q46 -86 46 -76 L46 -54 Z" fill="#8f2a2a" strokeWidth={1.6} />
              <path d="M-26 -88 V-54 M26 -88 V-54" stroke={GOLD} strokeWidth={5} fill="none" />
            </g>
            {/* chest opening with a heap of gold */}
            <ellipse cx={0} cy={-52} rx={56} ry={9} fill="#3a2414" />
            <path d="M-50 -52 Q-30 -66 -8 -62 Q10 -70 30 -62 Q46 -62 50 -52 Q0 -44 -50 -52 Z" fill={GOLD} strokeWidth={1.8} />
            <path d="M-30 -56 q4 -3 8 0 M-6 -60 q4 -3 8 0 M16 -57 q4 -3 8 0" stroke="#c98f12" strokeWidth={1.4} fill="none" />
            {/* body */}
            <path d="M-60 -52 H60 V-6 Q60 0 54 0 H-54 Q-60 0 -60 -6 Z" fill={WOOD} />
            <path d="M-60 -38 H60 M-60 -24 H60 M-60 -11 H60" stroke={WOOD_DARK} strokeWidth={1.4} fill="none" />
            <path d="M-38 -52 V0 M38 -52 V0" stroke={GOLD} strokeWidth={9} fill="none" />
            <rect x={-12} y={-44} width={24} height={20} rx={4} fill={GOLD} />
            <circle cx={0} cy={-36} r={3.2} fill={INK} stroke="none" />
            <rect x={-2} y={-36} width={4} height={8} rx={1.5} fill={INK} stroke="none" />
            <path d="M-60 -52 V-4 M60 -52 V-4" stroke={WOOD_LIGHT} strokeWidth={1.2} fill="none" opacity={0.7} />
            {/* closed lid */}
            <g ref={lidShut}>
              <path d="M-60 -52 L-60 -70 Q-60 -90 -38 -90 L38 -90 Q60 -90 60 -70 L60 -52 Z" fill={WOOD_LIGHT} />
              <path d="M-60 -66 H60" stroke={WOOD_DARK} strokeWidth={1.4} fill="none" />
              <path d="M-38 -90 V-52 M38 -90 V-52" stroke={GOLD} strokeWidth={9} fill="none" />
              <rect x={-12} y={-62} width={24} height={14} rx={4} fill={GOLD} />
            </g>
          </g>
          {/* coin pile (and the flying coins) */}
          <g ref={pile} pointerEvents="none">
            {PILE_COINS.map((_, i) => (
              <g key={i} ref={(el) => { coins.current[i] = el; }}><Coin /></g>
            ))}
          </g>
        </Stage>

        <div className="fp-side">
          {phase === 'closed' && (
            <>
              <p className="fp-msg">You rebuilt the map and followed the X to the old stone depot. The railroad worker&rsquo;s chest is buried right here!</p>
              <button type="button" className="btn btn-go" data-autofocus onClick={open}>Open the chest</button>
            </>
          )}
          {phase === 'opening' && <p className="fp-msg" aria-hidden="true">Here it comes&hellip;</p>}
          {phase === 'open' && (
            <>
              <p className="fp-bonus" data-testid="treasure-xp">+{xp} XP</p>
              <p className="fp-msg"><b>You found the treasure, {playerName}!</b> The whole quest was worth it.</p>
              <button ref={btn} type="button" className="btn btn-go" data-testid="see-results" onClick={onContinue}>See my results</button>
            </>
          )}
        </div>
      </div>
      <div className="sr-only" role="status" aria-live="polite">{status}</div>
      {confetti && !reduced && createPortal(<Confetti paused={paused} />, document.body)}
    </Sheet>
  );
}
