/** Short vibration pulses on phones that support it. Silent no-op everywhere else. */
export function buzz(pattern: number | number[] = 30): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* some browsers throw when vibration is blocked */
  }
}
export const buzzCorrect = () => buzz([25, 40, 25]);
export const buzzWrong = () => buzz(90);
