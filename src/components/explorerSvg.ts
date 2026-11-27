/** Original kid-explorer sprite: teal backpack, red bandana, safari hat (tintable via --hat-crown / --hat-brim), chunky dark outline. Faces right. */
export const EXPLORER_SVG = `
<svg class="explorer-svg" viewBox="0 0 64 84" width="64" height="84" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g stroke="#1B2430" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
    <ellipse cx="32" cy="80" rx="18" ry="3.5" fill="#1B2430" fill-opacity=".25" stroke="none"/>
    <!-- legs -->
    <g class="leg leg-b"><path d="M27 58 L25 73 L33 73 L33 58 Z" fill="#8a5a33"/><path d="M23 73 H35 V77 H22 Z" fill="#3b2a1d"/></g>
    <g class="leg leg-f"><path d="M33 58 L35 73 L43 73 L39 58 Z" fill="#a8703f"/><path d="M34 73 H46 V77 H34 Z" fill="#3b2a1d"/></g>
    <!-- backpack (teal) -->
    <rect x="9" y="34" width="18" height="26" rx="6" fill="#2BA8A4"/>
    <rect x="12" y="44" width="12" height="9" rx="3" fill="#1f8582"/>
    <path d="M12 34 Q18 29 24 34" fill="none"/>
    <!-- body -->
    <path d="M24 36 Q32 31 42 36 L44 60 L24 60 Z" fill="#E7C27A"/>
    <path d="M24 55 H44" stroke="#8a5a33"/>
    <!-- arm -->
    <path d="M36 38 L45 50" fill="none" stroke-width="7"/>
    <path d="M36 38 L45 50" fill="none" stroke="#E7C27A" stroke-width="3.5"/>
    <circle cx="46" cy="51" r="3.5" fill="#F1B58A"/>
    <!-- bandana (red) -->
    <path d="M24 35 Q33 41 43 35 L41 42 L33 49 L26 42 Z" fill="#C8372D"/>
    <!-- head -->
    <circle cx="34" cy="22" r="12.5" fill="#F1B58A"/>
    <circle cx="39" cy="23" r="1.9" fill="#1B2430" stroke="none"/>
    <path d="M38 29 Q41 31 44 29" fill="none" stroke-width="2"/>
    <!-- safari hat -->
    <path d="M17 17 Q34 11 52 17 Q50 22 34 20 Q20 22 17 17 Z" style="fill:var(--hat-brim,#D9A441)"/>
    <path d="M23 17 Q23 4 35 4 Q46 4 46 17 Q35 14 23 17 Z" style="fill:var(--hat-crown,#E7C27A)"/>
    <path d="M23.5 14 Q35 11 45.5 14" fill="none" stroke="#C8372D" stroke-width="3.5"/>
  </g>
</svg>`;
