import { GOLD, INK, RED } from './theme';

/** Row of attempt pips: goal = gold, miss = red, upcoming = empty, current = ringed. */
export function Pips({ results, total, label }: { results: boolean[]; total: number; label: string }) {
  return (
    <svg className="sp-pips" viewBox={`0 0 ${total * 22} 22`} role="img" aria-label={label}>
      {Array.from({ length: total }, (_, i) => {
        const r = results[i];
        return (
          <circle
            key={i} cx={11 + i * 22} cy={11} r={8} strokeWidth={2.5} stroke={INK}
            fill={r === undefined ? '#fff' : r ? GOLD : RED} strokeDasharray={i === results.length ? '3 3' : undefined}
          />
        );
      })}
    </svg>
  );
}
