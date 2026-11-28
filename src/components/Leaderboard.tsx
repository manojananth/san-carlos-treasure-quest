import { Sheet } from './Sheet';
import { Avatar } from './Avatar';
import { DIFFICULTY } from '../state/rules';
import type { Profile } from '../state/types';

const score = (p: Profile) => p.best?.xp ?? p.run?.xp ?? 0;

export function Leaderboard({ profiles, activeId, onClose }: { profiles: Profile[]; activeId: string | null; onClose: () => void }) {
  const rows = [...profiles].sort((a, b) => score(b) - score(a));
  return (
    <Sheet title="Leaderboard" heading={<>Leader<span>board</span></>} onClose={onClose} className="leaderboard">
      <p className="note">Explorers on this device, ranked by best finished run.</p>
      <ol className="lb">
        {rows.map((p, i) => (
          <li key={p.id} className={p.id === activeId ? 'me' : ''} data-testid="lb-row">
            <span className="rank">{i + 1}</span>
            <Avatar hat={p.avatar} gear={p.gear.equipped} size={40} />
            <span className="lb-name">
              <b>{p.name}</b>
              <small>{DIFFICULTY[p.best?.difficulty ?? p.difficulty].label}{p.best ? '' : ' · not finished yet'}</small>
            </span>
            <span className="lb-nums">
              <b>{score(p)} XP</b>
              <small>{p.best ? `${p.best.stars} ★` : '–'} · {p.badges.length} badge{p.badges.length === 1 ? '' : 's'}</small>
            </span>
          </li>
        ))}
      </ol>
      <div className="row">
        <button type="button" className="btn btn-go" data-autofocus onClick={onClose}>Close</button>
      </div>
    </Sheet>
  );
}
