import { useCallback, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { GOLD, INK, RED, TEAL } from './theme';

const COLORS = [GOLD, RED, TEAL, '#ffffff'];
const COUNT = 18;

/**
 * Confetti-lite: a small burst of paper bits drawn inside a stage `<g>`. `fire(x, y)` plays it with tweens owned
 * by the game's pausable timeline (so it freezes while paused). Does nothing under reduced motion.
 */
export function useConfetti(
  tween: (target: gsap.TweenTarget, vars: gsap.TweenVars) => unknown,
  reduced: boolean,
) {
  const bits = useRef<(SVGRectElement | null)[]>([]);
  const fire = useCallback((x: number, y: number) => {
    if (reduced) return;
    bits.current.forEach((el, i) => {
      if (!el) return;
      const a = (i / COUNT) * Math.PI * 2 + (i % 3) * 0.3;
      const r = 40 + ((i * 37) % 50);
      gsap.set(el, { x, y, opacity: 1, rotation: 0, scale: 1 });
      tween(el, {
        x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.8 - 26, rotation: (i % 2 ? 1 : -1) * 260,
        duration: 0.5, ease: 'power2.out',
      });
      tween(el, { y: `+=${46 + (i % 4) * 8}`, opacity: 0, duration: 0.55, delay: 0.5, ease: 'power1.in' });
    });
  }, [tween, reduced]);
  const node = useMemo(() => (
    <g pointerEvents="none" aria-hidden="true">
      {Array.from({ length: COUNT }, (_, i) => (
        <rect
          key={i} ref={(el) => { bits.current[i] = el; }} x={-3.5} y={-2.5} width={7} height={5} rx={1}
          fill={COLORS[i % COLORS.length]} stroke={INK} strokeWidth={1} opacity={0}
        />
      ))}
    </g>
  ), []);
  return { node, fire };
}
