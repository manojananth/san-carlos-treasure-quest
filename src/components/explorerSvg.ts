import { hatColor } from '../data/hats';
import { hatArt, packArt, petArt, INK } from '../gear/art';
import type { Look } from '../gear/look';

export interface ExplorerOpts {
  /** draw the equipped pet standing beside the explorer (widens the viewBox to the left) */
  pet?: boolean;
  /** CSS class on the root <svg> */
  cls?: string;
}

/**
 * Layered original kid-explorer sprite, facing right, chunky dark outline:
 * shadow, legs, pack (back), body, arm, bandana, head, hat, pack (straps), optional pet.
 * Default hat is a safari hat in the player's colour; default pack is the teal rucksack.
 */
export function explorerSvg(look: Look = {}, opts: ExplorerOpts = {}): string {
  const color = look.color ?? hatColor('red');
  const pack = packArt(look.pack);
  const withPet = !!(opts.pet && look.pet);
  const vb = withPet ? '-34 0 98 84' : '0 0 64 84';
  const w = withPet ? 98 : 64;
  return `<svg class="${opts.cls ?? 'explorer-svg'}" viewBox="${vb}" width="${w}" height="84" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
    <ellipse cx="32" cy="80" rx="18" ry="3.5" fill="${INK}" fill-opacity=".25" stroke="none"/>
    ${withPet ? `<g transform="translate(-32 44) scale(.95)">${petArt(look.pet!)}</g>` : ''}
    <g class="leg leg-b"><path d="M27 58 L25 73 L33 73 L33 58 Z" fill="#8a5a33"/><path d="M23 73 H35 V77 H22 Z" fill="#3b2a1d"/></g>
    <g class="leg leg-f"><path d="M33 58 L35 73 L43 73 L39 58 Z" fill="#a8703f"/><path d="M34 73 H46 V77 H34 Z" fill="#3b2a1d"/></g>
    ${pack.back}
    <path d="M24 36 Q32 31 42 36 L44 60 L24 60 Z" fill="#E7C27A"/>
    <path d="M24 55 H44" stroke="#8a5a33"/>
    <path d="M36 38 L45 50" fill="none" stroke-width="7"/>
    <path d="M36 38 L45 50" fill="none" stroke="#E7C27A" stroke-width="3.5"/>
    <circle cx="46" cy="51" r="3.5" fill="#F1B58A"/>
    ${pack.front}
    <path d="M24 35 Q33 41 43 35 L41 42 L33 49 L26 42 Z" fill="#C8372D"/>
    <circle cx="34" cy="22" r="12.5" fill="#F1B58A"/>
    <circle cx="39" cy="23" r="1.9" fill="${INK}" stroke="none"/>
    <path d="M38 29 Q41 31 44 29" fill="none" stroke-width="2"/>
    ${hatArt(look.hat, color)}
  </g>
</svg>`;
}

/** Back-compat: the default explorer. */
export const EXPLORER_SVG = explorerSvg();
