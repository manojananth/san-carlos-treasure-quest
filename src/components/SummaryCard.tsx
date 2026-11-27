import { Sheet } from './Sheet';
import { MAIN_STOPS, badgeName } from '../state/rules';
import { totalStars } from '../state/reducer';
import type { Profile, Run } from '../state/types';

export function SummaryCard({ profile, run, onLeaderboard, onAgain }: { profile: Profile; run: Run; onLeaderboard: () => void; onAgain: () => void }) {
  const bonus = run.stars.hiller !== undefined;
  return (
    <Sheet title="Quest complete" solid heading={<>Quest <span>complete!</span></>} className="summary">
      <p className="lead">Great work, {profile.name}! You found every map fragment.</p>
      <dl className="stats">
        <div><dt>XP</dt><dd data-testid="sum-xp">{run.xp}</dd></div>
        <div><dt>Stars</dt><dd data-testid="sum-stars">{totalStars(run)}</dd></div>
        <div><dt>Fragments</dt><dd>{run.fragments.length}/{MAIN_STOPS.length}</dd></div>
        <div><dt>Bonus</dt><dd>{bonus ? 'Found' : 'Skipped'}</dd></div>
      </dl>
      {run.earned.length > 0 && (
        <div className="earned">
          <b>Badges earned</b>
          <ul>{run.earned.map((b) => <li key={b}>{badgeName(b)}</li>)}</ul>
        </div>
      )}
      <p className="note">The treasure chest finale is coming soon!</p>
      <div className="row">
        <button type="button" className="btn btn-go" data-autofocus onClick={onAgain}>Play again</button>
        <button type="button" className="btn btn-plain" onClick={onLeaderboard}>Leaderboard</button>
      </div>
    </Sheet>
  );
}
