import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  /** visually shown heading (defaults to `title`); pass false to hide it and keep the aria label only */
  heading?: ReactNode | false;
  children: ReactNode;
  /** when set the sheet can be dismissed with Esc / the backdrop. Critical steps (riddle, challenge) leave it unset. */
  onClose?: () => void;
  className?: string;
  /** darker backdrop that hides the map (profile picker, summary) */
  solid?: boolean;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/** Modal card: bottom sheet on portrait phones, centered card on landscape/desktop. Traps focus. */
export function Sheet({ title, heading, children, onClose, className = '', solid }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const root = ref.current;
    const target = root?.querySelector<HTMLElement>('[data-autofocus]') ?? root?.querySelector<HTMLElement>(FOCUSABLE) ?? root;
    target?.focus({ preventScroll: true });
    return () => { if (prev && document.contains(prev)) prev.focus({ preventScroll: true }); };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && closeRef.current) {
      e.stopPropagation();
      closeRef.current();
      return;
    }
    if (e.key !== 'Tab' || !ref.current) return;
    const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === ref.current)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  };

  return (
    <div
      className={`backdrop${solid ? ' solid' : ''}`}
      onPointerDown={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
    >
      <div
        ref={ref}
        className={`sheet ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <h2 id={id} className={heading === false ? 'sr-only' : 'sheet-title'}>{heading === undefined || heading === false ? title : heading}</h2>
        {children}
      </div>
    </div>
  );
}
