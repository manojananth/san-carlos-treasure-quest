import { Sheet } from './Sheet';
import '../finale/finale.css';
import { STOPS } from '../data/stops';
import { BADGES, treasureXp, DIFFICULTY } from '../state/rules';
import { totalStars } from '../state/reducer';
import type { Profile, Run } from '../state/types';

interface Props { profile: Profile; run: Run; onLeaderboard: () => void; onAgain: () => void; onSwitch: () => void; onShop: () => void }

/** Final summary after the treasure chest (also shown for runs saved before the finale existed). */
export function SummaryCard({ profile, run, onLeaderboard, onAgain, onSwitch, onShop }: Props) {
  const rows = STOPS.filter((s) => !s.bonus || run.stars[s.id] !== undefined);
  const stars = totalStars(run);
  const bonus = treasureXp(DIFFICULTY[profile.difficulty].xpMult);
  const earned = run.earned.map((id) => BADGES.find((b) => b.id === id)).filter((b): b is (typeof BADGES)[number] => !!b);
  return (
    <Sheet title={run.treasure ? 'Treasure found' : 'Quest complete'} solid heading={run.treasure ? <>Treasure <span>found!</span></> : <>Quest <span>complete!</span></>} className="summary">
      <p className="lead">
        {run.newBest && <span className="new-best" data-testid="new-best">New best!</span>}
        Great work, {profile.name}! {run.treasure ? 'You found the railroad worker’s treasure.' : 'You found every map fragment.'}
      </p>
      <dl className="stats">
        <div><dt>XP</dt><dd data-testid="sum-xp">{run.xp}</dd></div>
        <div><dt>Stars</dt><dd data-testid="sum-stars">{stars}</dd></div>
        <div><dt>Fragments</dt><dd>{run.fragments.length}/6</dd></div>
        <div><dt>Coins</dt><dd>{profile.coins}</dd></div>
        {run.treasure && <div><dt>Treasure</dt><dd>+{run.treasureXp ?? bonus}</dd></div>}
      </dl>
      <ul className="sum-rows" aria-label="Stars at each stop">
        {rows.map((s) => {
          const n = run.stars[s.id] ?? 0;
          return (
            <li key={s.id} data-testid={`sum-row-${s.id}`}>
              <span className="sum-name">{s.theme}{s.bonus ? <small> bonus</small> : null}</span>
              <span className="sum-stars" role="img" aria-label={`${n} of 3 stars`}>
                {[1, 2, 3].map((i) => <i key={i} className={i <= n ? 'on' : ''} aria-hidden="true">★</i>)}
              </span>
            </li>
          );
        })}
      </ul>
      {earned.length > 0 && (
        <div className="earned">
          <b>Badges earned this run</b>
          <ul>{earned.map((b) => <li key={b.id} className={b.id === 'treasure-finder' ? 'treasure' : undefined}>{b.name}</li>)}</ul>
        </div>
      )}
      <div className="row">
        <button type="button" className="btn btn-go" data-autofocus data-testid="play-again" onClick={onAgain}>Play again</button>
        <button type="button" className="btn btn-plain" data-testid="explorer-shop" onClick={onShop}>Explorer Shop</button>
        <button type="button" className="btn btn-plain" data-testid="switch-player" onClick={onSwitch}>Switch player</button>
        <button type="button" className="btn btn-plain" onClick={onLeaderboard}>Leaderboard</button>
      </div>
    </Sheet>
  );
}
