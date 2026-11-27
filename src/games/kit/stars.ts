/**
 * Turn a score into 1-3 stars. `thresholds` = [scoreForTwo, scoreForThree]; higher scores are better unless
 * `lowerIsBetter` is set (e.g. seconds). Never returns less than 1: a finished attempt always earns a star.
 */
export function starsFor(score: number, thresholds: readonly [number, number], lowerIsBetter = false): 1 | 2 | 3 {
  const [two, three] = thresholds;
  const ok = (t: number) => (lowerIsBetter ? score <= t : score >= t);
  return ok(three) ? 3 : ok(two) ? 2 : 1;
}
