import { loadSave } from '../state/storage';

/** Short vibration pulses on phones that support it. Silent no-op everywhere else. */
let on = initialOn();
function initialOn(): boolean {
  try { return typeof localStorage === 'undefined' || loadSave().settings.haptics; } catch { return true; }
}
/** Synced from settings.haptics. */
export function setHaptics(b: boolean): void {
  on = b;
  if (!b) { try { navigator.vibrate?.(0); } catch { /* ignore */ } }
}

export function buzz(pattern: number | number[] = 10): void {
  if (!on) return;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
  } catch {
    /* some browsers throw when vibration is blocked */
  }
}
/** pattern set: tap 10 ms, success [20,40,20], fail 60 */
export const buzzTap = () => buzz(10);
export const buzzCorrect = () => buzz([20, 40, 20]);
export const buzzWrong = () => buzz(60);
