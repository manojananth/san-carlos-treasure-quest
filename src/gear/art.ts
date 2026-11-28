import { shade } from '../data/hats';

/**
 * Original sticker-style art for every gear item. No `id` attributes anywhere, so any number of
 * these SVGs can share a page. Hats are drawn in explorer coordinates (head centre 34,22 r12.5,
 * viewBox 0 0 64 84); packs behind/in front of the body; pets in their own 40x40 box facing right.
 * Outline and stroke widths come from the wrapping <g> in explorerSvg / petSvg.
 */
export const INK = '#1B2430';

/** Hat drawn on the explorer's head. The default safari hat takes the player's colour. */
export function hatArt(id: string | undefined, color: string): string {
  switch (id) {
    case 'hat-conductor':
      return `<g class="hat-art">
        <path d="M22 18 Q20 4 34 4.5 Q48 4 46 18 Z" fill="#2f5fa8"/>
        <path d="M21.5 15.5 H46.5 V19.5 H21.5 Z" fill="#1d3a6b"/>
        <path d="M40 17 Q52 15.5 55 20.5 Q47 23 40 20.5 Z" fill="#1d3a6b"/>
        <circle cx="34" cy="10.5" r="3.6" fill="#F2B632"/><path d="M32.4 10.5 H35.6 M34 8.9 V12.1" stroke-width="1.4"/>
      </g>`;
    case 'hat-propeller':
      return `<g class="hat-art">
        <path d="M22 18 Q20 6 34 6 Q48 6 46 18 Q34 15 22 18 Z" fill="#2BA8A4"/>
        <path d="M34 6 Q29 10 28 16.5 M34 6 Q39 10 40 16.5" fill="none" stroke-width="2.2"/>
        <path d="M23.5 15 Q34 12.5 44.5 15 V18 Q34 15.5 23.5 18 Z" fill="#F2B632"/>
        <path d="M34 6 V1.5" fill="none"/>
        <g class="prop"><ellipse cx="27" cy="1.5" rx="7" ry="2.6" fill="#C8372D"/><ellipse cx="41" cy="1.5" rx="7" ry="2.6" fill="#F2B632"/></g>
        <circle cx="34" cy="1.5" r="2.2" fill="#fff7e3"/>
      </g>`;
    case 'hat-tricorn':
      return `<g class="hat-art">
        <path d="M13 18.5 Q19 9 30 7 L34 3 L38 7 Q49 9 55 18.5 Q34 24.5 13 18.5 Z" fill="#2b3040"/>
        <path d="M13 18.5 Q34 24.5 55 18.5" fill="none" stroke="#F2B632" stroke-width="2.4"/>
        <path d="M26 15 Q34 12 42 15 Q34 17 26 15 Z" fill="#fff7e3" stroke-width="1.6"/>
        <circle cx="31.7" cy="14.8" r=".9" fill="#1B2430" stroke="none"/><circle cx="36.3" cy="14.8" r=".9" fill="#1B2430" stroke="none"/>
        <path d="M34 2.5 L35 4.6 L37.3 4.8 L35.6 6.3 L36.1 8.5 L34 7.4 L31.9 8.5 L32.4 6.3 L30.7 4.8 L33 4.6 Z" fill="#F2B632" stroke-width="1.2" transform="translate(0 1.2)"/>
      </g>`;
    case 'hat-cowboy':
      return `<g class="hat-art">
        <path d="M23 16.5 Q21 3 27 5.5 Q34 9.5 41 5.5 Q47 3 45 16.5 Z" fill="#b5763a"/>
        <path d="M23 13.5 Q34 16.5 45 13.5 V17 Q34 19.5 23 17 Z" fill="#C8372D"/>
        <path d="M10 15.5 Q13 21.5 24 18.5 Q34 20.5 44 18.5 Q55 21.5 58 15.5 Q52 18 45 14.5 Q34 17 23 14.5 Q16 18 10 15.5 Z" fill="#d9a05c"/>
      </g>`;
    case 'hat-crown':
      return `<g class="hat-art">
        <path d="M21.5 18.5 L20 4 L27.5 11 L34 1.5 L40.5 11 L48 4 L46.5 18.5 Z" fill="#F2B632"/>
        <path d="M21 14.5 H47 V19 H21 Z" fill="#e39f12"/>
        <circle cx="34" cy="16.8" r="2.1" fill="#C8372D" stroke-width="1.6"/>
        <circle cx="26.5" cy="16.8" r="1.7" fill="#2BA8A4" stroke-width="1.4"/><circle cx="41.5" cy="16.8" r="1.7" fill="#2BA8A4" stroke-width="1.4"/>
        <circle cx="20" cy="4" r="1.7" fill="#fff7e3" stroke-width="1.4"/><circle cx="48" cy="4" r="1.7" fill="#fff7e3" stroke-width="1.4"/><circle cx="34" cy="1.5" r="1.7" fill="#fff7e3" stroke-width="1.4"/>
      </g>`;
    default:
      return `<g class="hat-art">
        <path d="M17 17 Q34 11 52 17 Q50 22 34 20 Q20 22 17 17 Z" fill="${shade(color, 0.22)}"/>
        <path d="M23 17 Q23 4 35 4 Q46 4 46 17 Q35 14 23 17 Z" fill="${color}"/>
        <path d="M23.5 14 Q35 11 45.5 14" fill="none" stroke="#C8372D" stroke-width="3.5"/>
      </g>`;
  }
}

/** Pack drawn behind the body; `front` is anything that has to sit on top of it (straps). */
export function packArt(id: string | undefined): { back: string; front: string } {
  switch (id) {
    case 'pack-satchel':
      return {
        back: `<g class="pack-art"><rect x="8" y="41" width="19" height="19" rx="4" fill="#c08a4c"/><path d="M8 45 Q17.5 53 27 45 V41 H8 Z" fill="#a06f36"/><circle cx="17.5" cy="50" r="2.2" fill="#F2B632" stroke-width="1.6"/></g>`,
        front: `<path d="M26 36 L40 58" fill="none" stroke="#a06f36" stroke-width="3.6"/><path d="M26 36 L40 58" fill="none" stroke="#c08a4c" stroke-width="1.2"/>`,
      };
    case 'pack-rucksack':
      return {
        back: `<g class="pack-art"><rect x="6" y="30" width="22" height="31" rx="8" fill="#4C9A3F"/><rect x="9.5" y="43" width="15" height="12" rx="3.5" fill="#3a7b30"/><path d="M12 43 V49" stroke-width="2.2"/><rect x="8" y="24" width="18" height="9" rx="4.5" fill="#F2B632"/></g>`,
        front: '',
      };
    case 'pack-bedroll':
      return {
        back: `<g class="pack-art"><rect x="9" y="38" width="17" height="22" rx="5" fill="#8a5a33"/><rect x="4" y="27" width="28" height="11" rx="5.5" fill="#C8372D"/><path d="M13 27 V38 M23 27 V38" stroke-width="2.4" fill="none"/><ellipse cx="6.5" cy="32.5" rx="2.6" ry="4" fill="#e4776c" stroke-width="2"/></g>`,
        front: '',
      };
    case 'pack-rocket':
      return {
        back: `<g class="pack-art">
          <path class="flame" d="M10 59 Q12.5 72 15 59 Z M19.5 59 Q22 72 24.5 59 Z" fill="#F2B632"/>
          <rect x="8" y="33" width="9" height="26" rx="3.5" fill="#dfe6ea"/><rect x="18" y="33" width="9" height="26" rx="3.5" fill="#dfe6ea"/>
          <path d="M8 36 Q12.5 22 17 36 Z" fill="#C8372D"/><path d="M18 36 Q22.5 22 27 36 Z" fill="#C8372D"/>
          <rect x="8" y="46" width="9" height="4" fill="#2BA8A4" stroke-width="2"/><rect x="18" y="46" width="9" height="4" fill="#2BA8A4" stroke-width="2"/>
        </g>`,
        front: '',
      };
    default:
      return {
        back: `<g class="pack-art"><rect x="9" y="34" width="18" height="26" rx="6" fill="#2BA8A4"/><rect x="12" y="44" width="12" height="9" rx="3" fill="#1f8582"/><path d="M12 34 Q18 29 24 34" fill="none"/></g>`,
        front: '',
      };
  }
}

/** Pet art in a 40x40 box, facing right, feet on y=37. Friendly faces. */
export function petArt(id: string): string {
  switch (id) {
    case 'pet-pup':
      return `<g class="pet-art">
        <path d="M8 21 Q1 15 4 8" fill="none" stroke-width="5"/><path d="M8 21 Q1 15 4 8" fill="none" stroke="#e7c27a" stroke-width="2"/>
        <rect x="11" y="29" width="5.5" height="8" rx="2.5" fill="#d9a05c"/><rect x="25" y="29" width="5.5" height="8" rx="2.5" fill="#d9a05c"/>
        <ellipse cx="19" cy="25" rx="13" ry="9" fill="#e7c27a"/>
        <rect x="14" y="30" width="5.5" height="7.5" rx="2.5" fill="#e7c27a"/><rect x="22" y="30" width="5.5" height="7.5" rx="2.5" fill="#e7c27a"/>
        <path d="M24 16 Q22 6 28 5 Q31 12 31 16 Z" fill="#8a5a33"/>
        <circle cx="30" cy="17" r="8.5" fill="#e7c27a"/>
        <ellipse cx="35.5" cy="19" rx="4.8" ry="3.8" fill="#fff7e3"/>
        <ellipse cx="38.6" cy="17.8" rx="1.9" ry="1.5" fill="#1B2430" stroke="none"/>
        <circle cx="31" cy="14.6" r="1.5" fill="#1B2430" stroke="none"/>
        <path d="M35 22.4 Q36 26 38 23.6" fill="#e86a6a" stroke-width="1.6"/>
      </g>`;
    case 'pet-parrot':
      return `<g class="pet-art">
        <path d="M11 24 L2 35 L8 36 L12 31 Z" fill="#2BA8A4"/><path d="M10 25 L4 31" fill="none" stroke="#C8372D" stroke-width="2"/>
        <path d="M17 33 V37 M24 33 V37 M14 37 H19 M21 37 H26" fill="none" stroke="#e39f12" stroke-width="2.6"/>
        <ellipse cx="19" cy="23" rx="10.5" ry="11.5" fill="#C8372D"/>
        <ellipse cx="17" cy="26" rx="6" ry="7.5" fill="#2BA8A4"/>
        <circle cx="25" cy="12" r="8" fill="#e8483c"/>
        <ellipse cx="22.5" cy="12" rx="3.6" ry="4" fill="#fff7e3" stroke-width="1.8"/>
        <circle cx="23.2" cy="12" r="1.6" fill="#1B2430" stroke="none"/>
        <path d="M29 8 Q38 8 36.5 15 Q35 18 31.5 17 Q30 13 29 8 Z" fill="#F2B632"/>
        <path d="M30 15 Q33.5 15.5 36 14.6" fill="none" stroke-width="1.5"/>
      </g>`;
    case 'pet-raccoon':
      return `<g class="pet-art">
        <path d="M9 24 Q-1 24 1 14 Q2 8 7 9" fill="none" stroke-width="9"/>
        <path d="M9 24 Q-1 24 1 14 Q2 8 7 9" fill="none" stroke="#9aa3ad" stroke-width="5.6"/>
        <path d="M2.6 19.5 L6.2 16.5 M2.2 14 L6.6 12.4" fill="none" stroke="#2b3040" stroke-width="2.6"/>
        <rect x="12" y="29" width="5.5" height="8" rx="2.5" fill="#6b7480"/><rect x="25" y="29" width="5.5" height="8" rx="2.5" fill="#6b7480"/>
        <ellipse cx="19" cy="25" rx="13" ry="9" fill="#9aa3ad"/>
        <rect x="15" y="30" width="5.5" height="7.5" rx="2.5" fill="#9aa3ad"/><rect x="22" y="30" width="5.5" height="7.5" rx="2.5" fill="#9aa3ad"/>
        <path d="M23 11 L24 2.5 L29.5 8 Z M32 8 L37 2.5 L38 11 Z" fill="#6b7480"/>
        <circle cx="31" cy="17" r="9" fill="#cfd5dc"/>
        <path d="M23 15 Q31 11 39 15 Q39 21 34.5 20 Q31 18.5 27.5 20 Q23 21 23 15 Z" fill="#2b3040"/>
        <circle cx="28" cy="16" r="1.7" fill="#fff" stroke="none"/><circle cx="35" cy="16" r="1.7" fill="#fff" stroke="none"/>
        <circle cx="28.3" cy="16.1" r=".8" fill="#1B2430" stroke="none"/><circle cx="35.3" cy="16.1" r=".8" fill="#1B2430" stroke="none"/>
        <ellipse cx="33.5" cy="21.2" rx="2" ry="1.5" fill="#1B2430" stroke="none"/>
      </g>`;
    case 'pet-goat':
      return `<g class="pet-art">
        <path d="M8 22 Q4 21 5 17" fill="none" stroke-width="3.5"/>
        <rect x="11" y="29" width="4.8" height="8" rx="2" fill="#8a7a66"/><rect x="25.5" y="29" width="4.8" height="8" rx="2" fill="#8a7a66"/>
        <ellipse cx="19" cy="25" rx="13" ry="8.8" fill="#fff7e3"/>
        <ellipse cx="14" cy="24" rx="4" ry="3" fill="#cdb894" stroke="none"/>
        <rect x="15" y="30" width="4.8" height="7.5" rx="2" fill="#fff7e3"/><rect x="22" y="30" width="4.8" height="7.5" rx="2" fill="#fff7e3"/>
        <path d="M27 9 Q25 1 30 2 M33 8 Q36 1 39 4" fill="none" stroke-width="4"/><path d="M27 9 Q25 1 30 2 M33 8 Q36 1 39 4" fill="none" stroke="#e7c27a" stroke-width="1.4"/>
        <path d="M22 14 Q17 12 20 18 Z" fill="#cdb894"/>
        <circle cx="31" cy="16.5" r="8" fill="#fff7e3"/>
        <ellipse cx="35.5" cy="20" rx="4.2" ry="3.4" fill="#f1b58a"/>
        <circle cx="33.5" cy="20" r=".7" fill="#1B2430" stroke="none"/><circle cx="37.2" cy="20" r=".7" fill="#1B2430" stroke="none"/>
        <circle cx="32" cy="14.2" r="1.5" fill="#1B2430" stroke="none"/>
        <path d="M33 24 Q33.5 28.5 31.5 29" fill="none" stroke-width="2.6"/>
      </g>`;
    default:
      return '';
  }
}

const OUTLINE = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

/** Stand-alone pet SVG (used by the map marker, shop cards and the avatar corner). */
export function petSvg(id: string, cls = 'pet-svg'): string {
  return `<svg class="${cls}" viewBox="-5 0 46 40" width="46" height="40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g ${OUTLINE}><ellipse cx="20" cy="37.5" rx="13" ry="2.4" fill="${INK}" fill-opacity=".22" stroke="none"/>${petArt(id)}</g></svg>`;
}

/** Hat or pack alone on a card (no explorer): hats on a head-sized swatch, packs on their own. */
export function itemSvg(id: string): string {
  if (id.startsWith('pet-')) return petSvg(id, 'item-svg');
  if (id.startsWith('hat-')) {
    return `<svg class="item-svg" viewBox="6 -2 56 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g ${OUTLINE}>${hatArt(id, '#C8372D')}</g></svg>`;
  }
  const p = packArt(id);
  return `<svg class="item-svg" viewBox="0 19 40 55" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g ${OUTLINE}>${p.back}${p.front}</g></svg>`;
}
