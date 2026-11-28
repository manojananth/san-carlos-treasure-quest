import { useEffect, useRef } from 'react';

const COLORS = ['#c8372d', '#2ba8a4', '#f2b632', '#fff7e3', '#7b4fc9', '#4c9a3f', '#3b82d6'];

interface Bit { x: number; y: number; vx: number; vy: number; w: number; h: number; rot: number; vr: number; sway: number; ph: number; color: string; delay: number }

/**
 * A small canvas confetti shower (no library). Pieces fall from above with a little sideways sway and spin, over
 * about 4 seconds. `paused` freezes it (menu open). Never render this under reduced motion.
 */
export function Confetti({ paused, count = 150 }: { paused: boolean; count?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let raf = 0;
    let w = 0, h = 0, dpr = 1;
    const size = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    };
    size();
    window.addEventListener('resize', size);
    const small = Math.min(w, h) < 520;
    const bits: Bit[] = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: -20 - Math.random() * h * 0.4,
      vx: (Math.random() - 0.5) * 120, vy: 140 + Math.random() * 220,
      w: (small ? 6 : 8) + Math.random() * 6, h: (small ? 4 : 5) + Math.random() * 5,
      rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 10,
      sway: 20 + Math.random() * 40, ph: Math.random() * 6.28,
      color: COLORS[Math.floor(Math.random() * COLORS.length)], delay: Math.random() * 0.9,
    }));
    let last = performance.now();
    let t = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!pausedRef.current) t += dt;
      else { raf = requestAnimationFrame(frame); return; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      let alive = 0;
      for (const b of bits) {
        if (t < b.delay) { alive++; continue; }
        b.y += b.vy * dt;
        b.x += (b.vx + Math.sin(t * 3 + b.ph) * b.sway) * dt;
        b.rot += b.vr * dt;
        if (b.y > h + 20) continue;
        alive++;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.scale(1, Math.cos(t * 6 + b.ph)); // flutter
        ctx.fillStyle = b.color;
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
        ctx.restore();
      }
      if (alive > 0) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size); };
  }, [count]);

  return <canvas ref={ref} className="confetti" aria-hidden="true" />;
}
