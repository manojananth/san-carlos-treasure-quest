import { hatColor, shade } from '../data/hats';
import { hatArt, petArt } from '../gear/art';

interface Gear { hat?: string; pet?: string }

/** Round explorer face with the player's hat colour (or equipped hat) and an optional pet peeking in. */
export function Avatar({ hat, gear, size = 44 }: { hat: string; gear?: Gear; size?: number }) {
  const c = hatColor(hat);
  const custom = gear?.hat;
  return (
    <svg className="avatar" viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" style={{ overflow: 'visible' }}>
      <circle cx="32" cy="32" r="30" fill="#BFE9E6" stroke="#1B2430" strokeWidth="3" />
      <g stroke="#1B2430" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        <path d="M14 62 Q16 46 32 46 Q48 46 50 62" fill="#E7C27A" />
        <path d="M24 46 Q32 54 40 46 L37 52 L32 57 L27 52 Z" fill="#C8372D" />
        <circle cx="32" cy="33" r="13" fill="#F1B58A" />
        <circle cx="37" cy="34" r="1.8" fill="#1B2430" stroke="none" />
        <circle cx="27" cy="34" r="1.8" fill="#1B2430" stroke="none" />
        <path d="M27 40 Q32 44 37 40" fill="none" strokeWidth="2" />
        {custom ? (
          <g transform="translate(-3.4 10.1) scale(1.04)" dangerouslySetInnerHTML={{ __html: hatArt(custom, c) }} />
        ) : (
          <>
            <path d="M13 26 Q32 18 51 26 Q48 31 32 29 Q16 31 13 26 Z" fill={shade(c, 0.22)} />
            <path d="M20 26 Q20 9 32 9 Q44 9 44 26 Q32 22 20 26 Z" fill={c} />
            <path d="M20.5 22 Q32 18 43.5 22" fill="none" stroke="#1B2430" strokeWidth="2.5" />
          </>
        )}
        {gear?.pet && <g transform="translate(34 33) scale(.78)" dangerouslySetInnerHTML={{ __html: petArt(gear.pet) }} />}
      </g>
    </svg>
  );
}
