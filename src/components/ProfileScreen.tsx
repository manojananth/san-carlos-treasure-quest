import { useState } from 'react';
import { Avatar } from './Avatar';
import { Sheet } from './Sheet';
import { HATS, hatColor } from '../data/hats';
import type { HatId } from '../data/hats';
import { DIFFICULTIES, DIFFICULTY, MAX_NAME, MAX_PROFILES } from '../state/rules';
import type { Difficulty, Profile } from '../state/types';

interface Props {
  profiles: Profile[];
  onPick: (id: string) => void;
  onCreate: (p: { name: string; avatar: HatId; difficulty: Difficulty }) => void;
  onDelete: (id: string) => void;
  onLeaderboard: () => void;
}

const DIFF_BLURB: Record<Difficulty, string> = {
  rookie: 'Easy riddles, no timer',
  pro: 'Medium riddles, 60 s timer',
  legend: 'Tricky riddles, 35 s timer',
};

export function ProfileScreen({ profiles, onPick, onCreate, onDelete, onLeaderboard }: Props) {
  const [adding, setAdding] = useState(profiles.length === 0);
  const [name, setName] = useState('');
  const [hat, setHat] = useState<HatId>('red');
  const [difficulty, setDifficulty] = useState<Difficulty>('pro');
  const [confirming, setConfirming] = useState<string | null>(null);
  const full = profiles.length >= MAX_PROFILES;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name, avatar: hat, difficulty });
  };

  return (
    <Sheet title="Who is playing?" solid heading={<>San Carlos <span>Treasure Quest</span></>} className="profile-sheet">
      <p className="lead">{profiles.length ? 'Pick your explorer to continue.' : 'Create your explorer to start the hunt!'}</p>

      {profiles.length > 0 && (
        <ul className="profile-list">
          {profiles.map((p) => (
            <li key={p.id} className="profile-card">
              {confirming === p.id ? (
                <div className="confirm" role="group" aria-label={`Delete ${p.name}?`}>
                  <span>Delete <b>{p.name}</b> and their progress?</span>
                  <div className="row">
                    <button type="button" className="btn btn-danger" data-autofocus onClick={() => { onDelete(p.id); setConfirming(null); }}>Yes, delete</button>
                    <button type="button" className="btn btn-plain" onClick={() => setConfirming(null)}>Keep</button>
                  </div>
                </div>
              ) : (
                <>
                  <button type="button" className="profile-pick" onClick={() => onPick(p.id)} aria-label={`Play as ${p.name}`}>
                    <Avatar hat={p.avatar} size={52} />
                    <span className="profile-info">
                      <b>{p.name}</b>
                      <small>
                        {DIFFICULTY[p.difficulty].label} · {p.run ? `${p.run.xp} XP` : '0 XP'}
                        {p.run?.phase === 'summary' ? ' · quest done' : ''}
                      </small>
                    </span>
                  </button>
                  <button type="button" className="icon-btn small" onClick={() => setConfirming(p.id)} aria-label={`Delete ${p.name}`}>
                    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {!adding && !full && (
        <button type="button" className="btn btn-go wide" onClick={() => setAdding(true)}>+ New explorer</button>
      )}
      {profiles.length > 0 && !adding && (
        <button type="button" className="btn btn-plain wide" onClick={onLeaderboard}>Leaderboard</button>
      )}
      {full && !adding && <p className="note">This device holds {MAX_PROFILES} explorers. Delete one to add a new player.</p>}

      {adding && !full && (
        <form className="create" onSubmit={submit} aria-label="New explorer">
          <label className="field">
            <span>Your name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_NAME}
              autoComplete="off"
              autoCapitalize="words"
              placeholder="Explorer name"
              data-autofocus={profiles.length === 0 ? '' : undefined}
              enterKeyHint="done"
            />
          </label>
          <fieldset className="field">
            <legend>Hat colour</legend>
            <div className="hats" role="radiogroup" aria-label="Hat colour">
              {HATS.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  role="radio"
                  aria-checked={hat === h.id}
                  aria-label={h.name}
                  className={`hat${hat === h.id ? ' on' : ''}`}
                  style={{ ['--c' as string]: hatColor(h.id) }}
                  onClick={() => setHat(h.id)}
                >
                  <Avatar hat={h.id} size={40} />
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="field">
            <legend>Difficulty</legend>
            <div className="diffs" role="radiogroup" aria-label="Difficulty">
              {DIFFICULTIES.map((d) => (
                <button key={d} type="button" role="radio" aria-checked={difficulty === d} className={`diff${difficulty === d ? ' on' : ''}`} onClick={() => setDifficulty(d)}>
                  <b>{DIFFICULTY[d].label}</b>
                  <small>{DIFF_BLURB[d]}</small>
                </button>
              ))}
            </div>
          </fieldset>
          <div className="row">
            <button type="submit" className="btn btn-go" disabled={!name.trim()}>Start adventure</button>
            {profiles.length > 0 && <button type="button" className="btn btn-plain" onClick={() => setAdding(false)}>Cancel</button>}
          </div>
        </form>
      )}
    </Sheet>
  );
}
