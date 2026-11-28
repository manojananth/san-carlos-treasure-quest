import { Sheet } from '../components/Sheet';
import { STOPS } from '../data/stops';
import { PIECE_STOPS } from './puzzle';
import './finale.css';

/** First card of the finale: all six fragments are found, now head back to Base Camp. */
export function ReturnCard({ name, fromTheme, onGo }: { name: string; fromTheme: string; onGo: () => void }) {
  return (
    <Sheet title="Return to Base Camp" heading={<>Return to <span>Base Camp</span></>} className="return-card">
      <p className="lead">All six map fragments are yours, {name}!</p>
      <ul className="rc-frags" aria-label="Map fragments found">
        {PIECE_STOPS.map((id) => {
          const s = STOPS.find((x) => x.id === id)!;
          return <li key={id}><span aria-hidden="true">{s.order}</span>{s.theme}</li>;
        })}
      </ul>
      <p className="story-text">Put together, they show a red X right where your adventure began: the old stone depot. Walk back from {fromTheme} and rebuild the treasure map!</p>
      <div className="row">
        <button type="button" className="btn btn-go wide" data-autofocus data-testid="return-base" onClick={onGo}>Return to Base Camp</button>
      </div>
    </Sheet>
  );
}
