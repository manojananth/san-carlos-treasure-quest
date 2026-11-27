import { forwardRef } from 'react';
import type { ReactNode } from 'react';
import './kit.css';

interface StageProps {
  /** game units, default 400 x 300; art is drawn in these units and the SVG scales to fit */
  width?: number;
  height?: number;
  /** accessible name of the play area */
  label: string;
  className?: string;
  children: ReactNode;
  onKeyDown?: (e: React.KeyboardEvent<SVGSVGElement>) => void;
}

/**
 * Responsive SVG stage with a fixed viewBox. It fills the width of its container and is capped in height
 * (`--mg-stage-max`), so the same art fits a portrait phone, a short landscape phone and a desktop.
 * `touch-action: none` is set so drags do not scroll the page.
 */
export const Stage = forwardRef<SVGSVGElement, StageProps>(function Stage(
  { width = 400, height = 300, label, className = '', children, onKeyDown }, ref,
) {
  return (
    <svg
      ref={ref}
      className={`mg-stage ${className}`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-label={label}
      style={{ ['--mg-ar' as string]: width / height }}
      onKeyDown={onKeyDown}
    >
      {children}
    </svg>
  );
});

/** client (viewport) coordinates -> stage game units */
export function clientToStage(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const m = svg.getScreenCTM();
  if (!m) return { x: 0, y: 0 };
  const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
  return { x: p.x, y: p.y };
}
