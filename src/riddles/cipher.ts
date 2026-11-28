/** Caesar cipher helpers for the telegraph riddles. Only A-Z move; spaces and punctuation stay put. */

const A = 65;

/** Shift every A-Z letter forward by `shift` (any integer). */
export function caesar(text: string, shift: number): string {
  const s = ((shift % 26) + 26) % 26;
  return text.replace(/[A-Z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - A + s) % 26) + A));
}
export const encode = (plain: string, shift: number): string => caesar(plain.toUpperCase(), shift);
/** What the decoder wheel shows when set to `wheel` (0-25): the cipher text moved back by `wheel` letters. */
export const decode = (cipher: string, wheel: number): string => caesar(cipher, -wheel);

export const normWheel = (n: number): number => ((n % 26) + 26) % 26;
/** Wheel position for a pointer angle change (degrees, clockwise): 26 notches around the ring. */
export const wheelFromAngle = (startWheel: number, deltaDeg: number): number => normWheel(startWheel + Math.round(deltaDeg / (360 / 26)));
