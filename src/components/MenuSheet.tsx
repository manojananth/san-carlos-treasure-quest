import { useState } from 'react';
import type { ReactNode } from 'react';
import { Avatar } from './Avatar';
import { Sheet } from './Sheet';
import { BADGES, DIFFICULTIES, DIFFICULTY } from '../state/rules';
import type { Difficulty, Profile } from '../state/types';
import { useGame } from '../state/GameContext';
import { sfx } from '../audio/sfx';
import { buzzTap } from '../audio/haptics';

interface Props {
  profile: Profile;
  onClose: () => void;
  onDifficulty: (d: Difficulty) => void;
  onLeaderboard: () => void;
  onSwitch: () => void;
  onRestart: () => void;
  onShop: () => void;
  /** e.g. the golden spike counter from src/map/secrets.ts */
  spikeCounter?: ReactNode;
}

export function MenuSheet({ profile, onClose, onDifficulty, onLeaderboard, onSwitch, onRestart, onShop, spikeCounter }: Props) {
  const [confirm, setConfirm] = useState(false);
  const { state, dispatch } = useGame();
  const { muted, haptics } = state.settings;
  return (
    <Sheet title="Menu" heading={<>Explorer <span>menu</span></>} onClose={onClose} className="menu">
      <div className="menu-shop">
        <Avatar hat={profile.avatar} gear={profile.gear.equipped} size={48} />
        <div className="menu-wallet">
          <b data-testid="menu-coins"><span className="coin-dot" aria-hidden="true" />{profile.coins} coins</b>
          {spikeCounter}
        </div>
        <button type="button" className="btn btn-go" data-testid="open-shop" onClick={onShop}>Explorer Shop</button>
      </div>

      <fieldset className="field">
        <legend>Difficulty (changes the riddle and timer right away)</legend>
        <div className="diffs" role="radiogroup" aria-label="Difficulty">
          {DIFFICULTIES.map((d) => (
            <button key={d} type="button" role="radio" aria-checked={profile.difficulty === d} className={`diff${profile.difficulty === d ? ' on' : ''}`} onClick={() => onDifficulty(d)} data-autofocus={profile.difficulty === d ? '' : undefined}>
              <b>{DIFFICULTY[d].label}</b>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="field switches">
        <span className="legend">Sound &amp; touch</span>
        <button type="button" role="switch" aria-checked={!muted} className={`switch${muted ? '' : ' on'}`} data-testid="switch-sound"
          onClick={() => { dispatch({ type: 'setMuted', muted: !muted }); if (muted) setTimeout(() => sfx('correct'), 30); }}>
          <span>Sound</span><i aria-hidden="true" />
        </button>
        <button type="button" role="switch" aria-checked={haptics} className={`switch${haptics ? ' on' : ''}`} data-testid="switch-haptics"
          onClick={() => { dispatch({ type: 'setHaptics', haptics: !haptics }); if (!haptics) setTimeout(buzzTap, 30); }}>
          <span>Vibration</span><i aria-hidden="true" />
        </button>
      </div>

      <div className="field">
        <span className="legend">Badges</span>
        <ul className="badges">
          {BADGES.map((b) => {
            const has = profile.badges.includes(b.id);
            return (
              <li key={b.id} className={has ? 'got' : ''}>
                <span className="badge-ico" aria-hidden="true">{has ? '★' : '?'}</span>
                <span><b>{b.name}</b><small>{b.desc}</small></span>
                <span className="sr-only">{has ? 'earned' : 'not yet'}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {confirm ? (
        <div className="confirm" role="group" aria-label="Restart run?">
          <span>Restart this run from Base Camp? Your XP in this run will be lost.</span>
          <div className="row">
            <button type="button" className="btn btn-danger" data-autofocus onClick={onRestart}>Yes, restart</button>
            <button type="button" className="btn btn-plain" onClick={() => setConfirm(false)}>Keep playing</button>
          </div>
        </div>
      ) : (
        <div className="menu-actions">
          <button type="button" className="btn btn-plain" onClick={onLeaderboard}>Leaderboard</button>
          <button type="button" className="btn btn-plain" onClick={onSwitch}>Switch player</button>
          <button type="button" className="btn btn-plain" onClick={() => setConfirm(true)}>Restart run</button>
          <button type="button" className="btn btn-go" onClick={onClose}>Back to the map</button>
        </div>
      )}
    </Sheet>
  );
}
