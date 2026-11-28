import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { prefersReducedMotion } from '../map/explorer';
import { Avatar } from './Avatar';
import { MAIN_STOPS } from '../state/rules';
import { totalStars } from '../state/reducer';
import type { Profile, Run } from '../state/types';
import { useGame } from '../state/GameContext';
import { AudioSettingsSync } from '../audio/AudioSettingsSync';

export const SpeakerIcon = ({ off }: { off: boolean }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    {off ? <path d="M15.5 9.5l5 5M20.5 9.5l-5 5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      : <path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />}
  </svg>
);

/** XP number that ticks up to its new value (jumps under reduced motion). */
function XpCounter({ xp }: { xp: number }) {
  const ref = useRef<HTMLElement>(null);
  const shown = useRef(xp);
  const [gain, setGain] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const delta = xp - shown.current;
    if (delta === 0) { el.textContent = String(xp); return; }
    setGain(delta);
    let tw: gsap.core.Tween | undefined;
    const t = window.setTimeout(() => setGain(null), 1800);
    if (prefersReducedMotion()) {
      shown.current = xp;
      el.textContent = String(xp);
    } else {
      const o = { v: shown.current };
      tw = gsap.to(o, {
        v: xp, duration: Math.min(1.2, 0.3 + Math.abs(delta) / 80), ease: 'power2.out',
        onUpdate: () => { shown.current = Math.round(o.v); el.textContent = String(shown.current); },
        onComplete: () => { shown.current = xp; el.textContent = String(xp); },
      });
    }
    return () => { window.clearTimeout(t); tw?.kill(); };
  }, [xp]);

  return (
    <span className="xp-wrap">
      <b ref={ref} data-testid="xp">{xp}</b>
      {gain !== null && <span className={`xp-gain ${gain < 0 ? 'neg' : ''}`} aria-hidden="true">{gain > 0 ? `+${gain}` : `−${Math.abs(gain)}`}</span>}
    </span>
  );
}

const FragIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path d="M3 5 L9 3 L15 5 L21 3 V19 L15 21 L9 19 L3 21 Z" fill="#fff7e3" stroke="#1B2430" strokeWidth="2" strokeLinejoin="round" />
    <path d="M8 9 L12 13 M12 9 L8 13" stroke="#C8372D" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export function HUD({ profile, run, onMenu }: { profile: Profile; run: Run; onMenu: () => void }) {
  const { state, dispatch } = useGame();
  const muted = state.settings.muted;
  return (
    <header className="hud">
      <AudioSettingsSync />
      <div className="hud-player">
        <Avatar hat={profile.avatar} size={44} />
        <span className="hud-name">{profile.name}</span>
      </div>
      <div className="hud-stats">
        <div className="pill" role="group" aria-label="Experience points"><span className="pill-ico xp-ico">XP</span><XpCounter xp={run.xp} /></div>
        <div className="pill" role="group" aria-label="Stars"><span className="pill-ico star-ico" aria-hidden="true">★</span><b data-testid="stars">{totalStars(run)}</b></div>
        <div className="pill" role="group" aria-label="Map fragments"><FragIcon /><b data-testid="fragments">{run.fragments.length}/{MAIN_STOPS.length}</b></div>
      </div>
      <button type="button" className="icon-btn sound-btn" aria-pressed={!muted} aria-label="Sound" title={muted ? 'Sound off' : 'Sound on'} data-testid="sound-toggle" onClick={() => dispatch({ type: 'setMuted', muted: !muted })}>
        <SpeakerIcon off={muted} />
      </button>
      <button type="button" className="icon-btn" onClick={onMenu} aria-label="Menu" aria-haspopup="dialog">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
      </button>
    </header>
  );
}
