import { Sheet } from './Sheet';
import type { Stop } from '../data/stops';

export function StopCard({ stop, first, onStart }: { stop: Stop; first: boolean; onStart: () => void }) {
  return (
    <Sheet title={first ? `Base Camp` : `You reached ${stop.theme}`} heading={first ? 'Base Camp' : <>You reached <span>{stop.theme}</span></>}>
      <p className="stop-place">{stop.name}</p>
      <p className="story-text">
        {stop.bonus
          ? 'A secret bonus stop! Finish this challenge for extra XP and a special badge.'
          : first
            ? 'Your adventure starts here. Warm up with a quick challenge to win the first map fragment.'
            : 'Finish the challenge to win a map fragment and a riddle for the next stop.'}
      </p>
      <div className="row">
        <button type="button" className="btn btn-go wide" data-autofocus onClick={onStart}>Start challenge</button>
      </div>
    </Sheet>
  );
}
