import { useState } from 'react';
import { Sheet } from './Sheet';
import { BADGES, DIFFICULTIES, DIFFICULTY } from '../state/rules';
import type { Difficulty, Profile } from '../state/types';

interface Props {
  profile: Profile;
  onClose: () => void;
  onDifficulty: (d: Difficulty) => void;
  onLeaderboard: () => void;
  onSwitch: () => void;
  onRestart: () => void;
}

export function MenuSheet({ profile, onClose, onDifficulty, onLeaderboard, onSwitch, onRestart }: Props) {
  const [confirm, setConfirm] = useState(false);
  return (
    <Sheet title="Menu" heading={<>Explorer <span>menu</span></>} onClose={onClose} className="menu">
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
