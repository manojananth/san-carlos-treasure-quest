import { Howl, Howler } from 'howler';
import { loadSave } from '../state/storage';

/** Every sound in public/sfx/ (made by scripts/make-sfx.ts). Keep this union open for new names. */
export type SfxName =
  | 'tap' | 'correct' | 'wrong' | 'hint' | 'unlock' | 'coin' | 'star' | 'fanfare' | 'step'
  | 'clank' | 'whoosh' | 'kick' | 'cheer' | 'chest' | 'coins' | 'tick' | 'go';

/** Per-sound volume (0-1) and the shortest gap between two plays of it, in ms. */
const SPEC: Record<SfxName, { vol: number; gap?: number }> = {
  tap: { vol: 0.5, gap: 40 }, tick: { vol: 0.4, gap: 40 }, correct: { vol: 0.7 }, wrong: { vol: 0.6 }, hint: { vol: 0.6 },
  unlock: { vol: 0.75 }, coin: { vol: 0.55, gap: 40 }, star: { vol: 0.7 }, fanfare: { vol: 0.75 },
  step: { vol: 0.22, gap: 450 }, clank: { vol: 0.7 }, whoosh: { vol: 0.5 }, kick: { vol: 0.8 }, cheer: { vol: 0.7 },
  chest: { vol: 0.8 }, coins: { vol: 0.65 }, go: { vol: 0.7 },
};

const MIN_GAP = 40;
const enabled = typeof window !== 'undefined' && typeof Audio !== 'undefined' && !(typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent));
const howls = new Map<SfxName, Howl>();
const last = new Map<SfxName, number>();
let muted = initialMuted();

/** start from the saved setting so a muted player never hears a stray sound before the HUD syncs */
function initialMuted(): boolean {
  try { return typeof localStorage !== 'undefined' && loadSave().settings.muted; } catch { return false; }
}
let unlockHooked = false;

/** Synced from settings.muted. */
export function setMuted(b: boolean): void {
  muted = b;
  try { Howler.mute(b); } catch { /* audio not available */ }
}
export const isMuted = () => muted;

function get(name: SfxName): Howl | null {
  let h = howls.get(name);
  if (!h) {
    try {
      h = new Howl({ src: [`${import.meta.env.BASE_URL}sfx/${name}.wav`], volume: SPEC[name].vol, preload: true, html5: false, onloaderror: () => {}, onplayerror: () => {} });
      howls.set(name, h);
    } catch { return null; }
  }
  return h;
}

/** Browsers (iOS especially) only start audio after a user gesture: resume the context on the first one. */
function hookUnlock() {
  if (unlockHooked || !enabled) return;
  unlockHooked = true;
  const go = () => {
    try { const ctx = Howler.ctx; if (ctx && ctx.state !== 'running') void ctx.resume(); } catch { /* ignore */ }
    window.removeEventListener('pointerdown', go, true);
    window.removeEventListener('keydown', go, true);
    window.removeEventListener('touchend', go, true);
  };
  window.addEventListener('pointerdown', go, true);
  window.addEventListener('keydown', go, true);
  window.addEventListener('touchend', go, true);
}
hookUnlock();

/** Play a sound effect. Never throws; silent when muted, in tests, or before the first tap. */
export function sfx(name: SfxName): void {
  if (!enabled || muted) return;
  try {
    const now = performance.now();
    const gap = SPEC[name]?.gap ?? MIN_GAP;
    if (now - (last.get(name) ?? -1e9) < gap) return;
    last.set(name, now);
    get(name)?.play();
  } catch { /* never let audio break the game */ }
}

/** Optional: fetch all sounds now (e.g. after the profile screen) so the first play has no delay. */
export function preloadSfx(): void {
  if (!enabled) return;
  (Object.keys(SPEC) as SfxName[]).forEach(get);
}
