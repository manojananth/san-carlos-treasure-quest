import { useEffect } from 'react';
import { useGame } from '../state/GameContext';
import { preloadSfx, setMuted, sfx } from './sfx';
import { setHaptics } from './haptics';

/**
 * Renders nothing. Pushes settings.muted / settings.haptics into the audio + haptics modules, plays a soft tap on
 * buttons, and plays a sound for map-fragment / badge toasts (they are plain DOM, so we watch for them).
 */
export function AudioSettingsSync() {
  const { state } = useGame();
  const { muted, haptics } = state.settings;
  useEffect(() => { preloadSfx(); }, []);
  useEffect(() => { setMuted(muted); }, [muted]);
  useEffect(() => { setHaptics(haptics); }, [haptics]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const b = (e.target as Element | null)?.closest?.('button');
      if (!b || b.disabled || b.closest('.choice, .mg-content, [data-nosound]')) return;
      sfx('tap');
    };
    document.addEventListener('click', onClick, true);
    const root = document.body;
    const obs = new MutationObserver((list) => {
      for (const m of list) {
        m.addedNodes.forEach((n) => {
          if (!(n instanceof HTMLElement) || !n.classList.contains('toast')) return;
          if (n.classList.contains('fragment')) sfx('coin');
          else if (n.classList.contains('badge')) sfx('star');
        });
      }
    });
    obs.observe(root, { childList: true, subtree: true });
    return () => { document.removeEventListener('click', onClick, true); obs.disconnect(); };
  }, []);
  return null;
}
