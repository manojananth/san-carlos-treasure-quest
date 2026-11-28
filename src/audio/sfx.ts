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

/**
 * iOS/iPadOS mute Web Audio when the ring/silent switch is on silent. Declaring a "playback" audio session
 * (Safari 17+) makes game sounds behave like media instead, so they play with the switch on silent.
 */
function claimPlaybackSession() {
  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession && nav.audioSession.type !== 'playback') nav.audioSession.type = 'playback';
  } catch { /* not supported */ }
}

/** True once the Web Audio context is actually running (sound can be heard). */
export const audioReady = (): boolean => { try { return Howler.ctx?.state === 'running'; } catch { return false; } };

/**
 * Browsers only start audio inside a real user gesture. Safari counts `touchend`/`click`/`keydown` but not
 * `pointerdown`/`touchstart`, and a resume can fail, so keep listening on every gesture until the context is
 * running. Inside the gesture we resume the context and play a 1-sample silent buffer, which is what iOS needs.
 */
function hookUnlock() {
  if (unlockHooked || !enabled) return;
  unlockHooked = true;
  claimPlaybackSession();
  const events = ['touchend', 'click', 'keydown'] as const;
  const go = () => {
    claimPlaybackSession();
    try {
      // touching Howler.ctx creates the shared context on first use (via a Howl) — make sure one exists
      if (!Howler.ctx) get('tap');
      const ctx = Howler.ctx;
      if (ctx) {
        if (ctx.state !== 'running') void ctx.resume().catch(() => {});
        const src = ctx.createBufferSource();
        src.buffer = ctx.createBuffer(1, 1, 22050);
        src.connect(ctx.destination);
        src.start(0);
      }
    } catch { /* ignore and retry on the next gesture */ }
    if (audioReady()) events.forEach((e) => window.removeEventListener(e, go, true));
  };
  events.forEach((e) => window.addEventListener(e, go, true));
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
