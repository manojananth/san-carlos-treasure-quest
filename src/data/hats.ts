export type HatId = 'red' | 'teal' | 'gold' | 'purple' | 'green' | 'blue';
export interface Hat { id: HatId; name: string; color: string }

export const HATS: Hat[] = [
  { id: 'red', name: 'Red', color: '#C8372D' },
  { id: 'teal', name: 'Teal', color: '#2BA8A4' },
  { id: 'gold', name: 'Gold', color: '#F2B632' },
  { id: 'purple', name: 'Purple', color: '#7B4FC9' },
  { id: 'green', name: 'Green', color: '#4C9A3F' },
  { id: 'blue', name: 'Blue', color: '#3B82D6' },
];

export const isHatId = (v: unknown): v is HatId => HATS.some((h) => h.id === v);
export const hatColor = (id: string): string => HATS.find((h) => h.id === id)?.color ?? HATS[0].color;

/** Darken a #rrggbb colour by `amount` (0..1). Used for the hat brim. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 - amount))));
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
