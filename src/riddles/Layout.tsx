import type { ReactNode } from 'react';

/** Portrait: one column. Short landscape: head + visual on the left, answer + buttons on the right. */
export function RiddleLayout({ head, visual, answer, foot }: { head: ReactNode; visual?: ReactNode; answer: ReactNode; foot: ReactNode }) {
  return (
    <div className="riddle-cols">
      <div className="riddle-l">
        {head}
        {visual}
      </div>
      <div className="riddle-r">
        {answer}
        {foot}
      </div>
    </div>
  );
}
