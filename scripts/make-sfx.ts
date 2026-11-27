/**
 * Synthesises every sound effect in public/sfx/ (16-bit mono 22.05 kHz WAV). All sounds are original:
 * oscillators, envelopes, filtered noise and little arpeggios. Run with `npm run sfx`; output is committed.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 22050;
const TAU = Math.PI * 2;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sfx');

type Wave = 'sine' | 'tri' | 'square' | 'saw';
const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);

/** tiny deterministic PRNG so rebuilds produce identical files */
let seed = 1234567;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0x100000000; };

class Track {
  readonly d: Float32Array;
  constructor(seconds: number) { this.d = new Float32Array(Math.ceil(seconds * SR)); }

  /** pitched note with attack/decay-to-zero envelope; `slide` is the end frequency (exponential glide) */
  tone(t0: number, freq: number, dur: number, o: { w?: Wave; vol?: number; att?: number; slide?: number; vib?: number; harm?: number } = {}) {
    const { w = 'sine', vol = 0.5, att = 0.006, slide, vib = 0, harm = 0 } = o;
    const n = Math.floor(dur * SR), s0 = Math.floor(t0 * SR);
    let ph = 0;
    for (let i = 0; i < n && s0 + i < this.d.length; i++) {
      const t = i / SR, u = t / dur;
      const f = (slide ? freq * (slide / freq) ** u : freq) * (1 + vib * Math.sin(TAU * 5.5 * t));
      ph += (TAU * f) / SR;
      const p = ph % TAU, x = p / TAU;
      let v = w === 'sine' ? Math.sin(p) : w === 'tri' ? 4 * Math.abs(x - 0.5) - 1 : w === 'square' ? (x < 0.5 ? 1 : -1) * 0.6 : (2 * x - 1) * 0.7;
      if (harm) v += harm * Math.sin(2 * p) + harm * 0.5 * Math.sin(3 * p);
      const env = Math.min(1, t / att) * (1 - u) ** 2;
      this.d[s0 + i] += v * env * vol;
    }
  }

  /** noise through a state-variable-ish band/low-pass; cutoff may sweep from `f0` to `f1` */
  noise(t0: number, dur: number, o: { vol?: number; f0?: number; f1?: number; q?: number; att?: number; rel?: number; band?: boolean } = {}) {
    const { vol = 0.4, f0 = 2000, f1 = f0, q = 0.7, att = 0.01, rel = 0.5, band = true } = o;
    const n = Math.floor(dur * SR), s0 = Math.floor(t0 * SR);
    let low = 0, bnd = 0;
    for (let i = 0; i < n && s0 + i < this.d.length; i++) {
      const t = i / SR, u = t / dur;
      const f = f0 + (f1 - f0) * u;
      const k = 2 * Math.sin((Math.PI * Math.min(f, SR / 4)) / SR);
      const x = rand() * 2 - 1;
      low += k * bnd;
      const high = x - low - bnd / q;
      bnd += k * high;
      const env = Math.min(1, t / att) * Math.min(1, (1 - u) / rel);
      this.d[s0 + i] += (band ? bnd : low) * env * vol;
    }
  }
}

function write(name: string, tr: Track, peak = 0.85) {
  const d = tr.d;
  let max = 0;
  for (const v of d) max = Math.max(max, Math.abs(v));
  const g = max > 0 ? peak / max : 1;
  const fade = Math.floor(0.008 * SR);
  const pcm = Buffer.alloc(d.length * 2);
  for (let i = 0; i < d.length; i++) {
    const edge = Math.min(1, (d.length - i) / fade);
    const v = Math.tanh(d[i] * g * 1.1) * edge; // soft clip keeps it gentle
    pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  writeFileSync(join(OUT, `${name}.wav`), Buffer.concat([h, pcm]));
  console.log(`${name}.wav  ${(d.length / SR).toFixed(2)} s  ${((44 + pcm.length) / 1024).toFixed(1)} KB`);
}

const C5 = 72, E5 = 76, G5 = 79, C6 = 84;
const sounds: Record<string, () => Track> = {
  tap() { const t = new Track(0.09); t.tone(0, 740, 0.08, { w: 'tri', vol: 0.5, att: 0.002, slide: 520 }); return t; },
  tick() { const t = new Track(0.06); t.tone(0, 1250, 0.05, { w: 'sine', vol: 0.5, att: 0.001 }); return t; },
  correct() {
    const t = new Track(0.4);
    t.tone(0, midi(G5), 0.16, { w: 'tri', vol: 0.5, harm: 0.15 });
    t.tone(0.1, midi(C6), 0.28, { w: 'tri', vol: 0.5, harm: 0.15 });
    return t;
  },
  wrong() {
    const t = new Track(0.38);
    t.tone(0, 330, 0.16, { w: 'tri', vol: 0.5, slide: 270 });
    t.tone(0.13, 247, 0.24, { w: 'tri', vol: 0.5, slide: 190 });
    return t;
  },
  hint() {
    const t = new Track(0.45);
    [76, 83, 88].forEach((m, i) => t.tone(i * 0.09, midi(m), 0.3 - i * 0.04, { w: 'sine', vol: 0.4, harm: 0.1 }));
    return t;
  },
  unlock() {
    const t = new Track(0.95);
    [C5, E5, G5, C6, 88].forEach((m, i) => { t.tone(i * 0.1, midi(m), 0.4, { w: 'tri', vol: 0.4, harm: 0.12 }); });
    t.noise(0.35, 0.5, { vol: 0.1, f0: 5000, f1: 9000, q: 2, rel: 0.8 });
    t.tone(0.5, midi(C6), 0.4, { w: 'sine', vol: 0.35, vib: 0.01 });
    return t;
  },
  coin() {
    const t = new Track(0.32);
    t.tone(0, midi(83), 0.07, { w: 'square', vol: 0.3, att: 0.002 });
    t.tone(0.06, midi(88), 0.26, { w: 'square', vol: 0.3, att: 0.002 });
    t.tone(0.06, midi(88) * 2, 0.2, { w: 'sine', vol: 0.15 });
    return t;
  },
  star() {
    const t = new Track(0.55);
    [G5, C6, 88, 91].forEach((m, i) => t.tone(i * 0.07, midi(m), 0.3, { w: 'sine', vol: 0.4, harm: 0.2 }));
    t.noise(0.05, 0.4, { vol: 0.08, f0: 7000, q: 3, rel: 0.9 });
    return t;
  },
  fanfare() {
    const t = new Track(1.7);
    const notes: [number, number, number][] = [[0, C5, 0.14], [0.15, C5, 0.14], [0.3, C5, 0.14], [0.45, G5, 0.5]];
    for (const [s, m, d] of notes) { t.tone(s, midi(m), d + 0.1, { w: 'saw', vol: 0.22 }); t.tone(s, midi(m - 12), d + 0.1, { w: 'tri', vol: 0.25 }); }
    for (const m of [E5 - 4, E5, G5 + 4]) t.tone(0.95, midi(m), 0.7, { w: 'saw', vol: 0.18, vib: 0.008 });
    for (const m of [C5, E5, G5, C6]) t.tone(0.95, midi(m), 0.7, { w: 'tri', vol: 0.22, vib: 0.008 });
    t.noise(0.95, 0.3, { vol: 0.08, f0: 6000, q: 2, rel: 0.7 });
    return t;
  },
  step() {
    const t = new Track(0.1);
    t.noise(0, 0.09, { vol: 0.5, f0: 380, f1: 200, q: 1.2, att: 0.003, rel: 0.9 });
    t.tone(0, 110, 0.08, { w: 'sine', vol: 0.3, att: 0.002, slide: 70 });
    return t;
  },
  clank() {
    const t = new Track(0.4);
    for (const [f, v] of [[820, 0.35], [1310, 0.25], [2190, 0.15], [3100, 0.08]] as const) t.tone(0, f, 0.3, { w: 'sine', vol: v, att: 0.001 });
    t.noise(0, 0.04, { vol: 0.4, f0: 3500, q: 1, att: 0.001, rel: 0.6 });
    t.tone(0, 150, 0.12, { w: 'sine', vol: 0.4, att: 0.002, slide: 80 });
    return t;
  },
  whoosh() {
    const t = new Track(0.55);
    t.noise(0, 0.55, { vol: 0.6, f0: 400, f1: 3200, q: 1.1, att: 0.2, rel: 0.45 });
    return t;
  },
  kick() {
    const t = new Track(0.32);
    t.tone(0, 170, 0.28, { w: 'sine', vol: 0.8, att: 0.002, slide: 48 });
    t.noise(0, 0.05, { vol: 0.35, f0: 1500, q: 0.8, att: 0.001, rel: 0.5 });
    return t;
  },
  cheer() {
    const t = new Track(1.9);
    t.noise(0, 1.8, { vol: 0.5, f0: 1100, f1: 1700, q: 0.9, att: 0.6, rel: 0.55 });
    t.noise(0, 1.8, { vol: 0.2, f0: 2600, q: 1.5, att: 0.7, rel: 0.5 });
    for (const m of [C5, E5, G5, C6]) t.tone(0.5, midi(m), 1.3, { w: 'tri', vol: 0.18, att: 0.25, vib: 0.01 });
    for (const [s, m] of [[0.9, 88], [1.05, 91], [1.2, 96]] as const) t.tone(s, midi(m), 0.4, { w: 'sine', vol: 0.2, harm: 0.2 });
    return t;
  },
  chest() {
    const t = new Track(1.1);
    // creak: wobbling saw gliding upward, lightly filtered by keeping it quiet
    t.tone(0, 180, 0.6, { w: 'saw', vol: 0.2, att: 0.1, slide: 340, vib: 0.06 });
    t.tone(0.05, 183, 0.55, { w: 'square', vol: 0.1, att: 0.1, slide: 351, vib: 0.07 });
    t.noise(0, 0.6, { vol: 0.12, f0: 900, f1: 1500, q: 3, att: 0.15, rel: 0.5 });
    // thud + sparkle as the lid hits and opens
    t.tone(0.65, 130, 0.3, { w: 'sine', vol: 0.8, att: 0.003, slide: 55 });
    t.noise(0.65, 0.08, { vol: 0.3, f0: 500, q: 0.8, att: 0.001, rel: 0.5 });
    [C6, 88, 91].forEach((m, i) => t.tone(0.8 + i * 0.07, midi(m), 0.25, { w: 'sine', vol: 0.22 }));
    return t;
  },
  coins() {
    const t = new Track(0.85);
    for (let i = 0; i < 9; i++) {
      const s = i * 0.065 + rand() * 0.02, f = midi(86 + [0, 3, 5, 2, 7, 4, 1, 6, 3][i]) * 1.0;
      const v = 0.3 * (1 - i * 0.05);
      t.tone(s, f, 0.18, { w: 'sine', vol: v, att: 0.001 });
      t.tone(s, f * 2.76, 0.1, { w: 'sine', vol: v * 0.4, att: 0.001 });
    }
    return t;
  },
  go() {
    const t = new Track(0.5);
    t.tone(0, midi(79), 0.12, { w: 'square', vol: 0.3, att: 0.003 });
    t.tone(0.1, midi(91), 0.38, { w: 'square', vol: 0.3, att: 0.003 });
    t.tone(0.1, midi(84), 0.38, { w: 'tri', vol: 0.3, att: 0.003 });
    return t;
  },
};

mkdirSync(OUT, { recursive: true });
for (const [name, make] of Object.entries(sounds)) { seed = 1234567; write(name, make()); }
