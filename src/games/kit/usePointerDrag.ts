import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

export interface DragInfo {
  /** the pointer event that triggered this callback */
  event: PointerEvent;
  /** element under the pointer at pointerdown (use `closest('[data-x]')` to tell draggables apart) */
  target: EventTarget | null;
  /** client (viewport) coordinates now */
  x: number;
  y: number;
  /** client coordinates at pointerdown */
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  pointerId: number;
}

export interface DragHandlers {
  /** return `false` to refuse the drag (nothing is captured then) */
  onStart?: (info: DragInfo) => boolean | void;
  onMove?: (info: DragInfo) => void;
  /** `cancelled` = pointercancel or lost capture (treat it as "put it back") */
  onEnd?: (info: DragInfo, cancelled: boolean) => void;
}

/**
 * Pointer-event drag for mouse, touch and pen. Attach it to ONE container (e.g. the stage SVG) and tell
 * draggables apart with `info.target.closest(...)`. Uses setPointerCapture so the drag keeps working when the
 * finger leaves the container, and sets `touch-action: none` so the page does not scroll. Handlers may change on
 * every render; `enabled=false` ignores new drags (an active one is not interrupted, end it yourself).
 */
export function usePointerDrag(ref: RefObject<Element | null>, handlers: DragHandlers, enabled = true): void {
  const h = useRef(handlers);
  h.current = handlers;
  const on = useRef(enabled);
  on.current = enabled;

  useEffect(() => {
    const el = ref.current as HTMLElement | null; // SVG elements work too; HTMLElement gives the typed pointer listeners
    if (!el) return;
    el.style.touchAction = 'none';
    let active: { id: number; target: EventTarget | null; sx: number; sy: number } | null = null;

    const info = (e: PointerEvent): DragInfo => ({
      event: e, target: active?.target ?? e.target, x: e.clientX, y: e.clientY,
      startX: active?.sx ?? e.clientX, startY: active?.sy ?? e.clientY,
      dx: e.clientX - (active?.sx ?? e.clientX), dy: e.clientY - (active?.sy ?? e.clientY), pointerId: e.pointerId,
    });
    const down = (e: PointerEvent) => {
      if (active || !on.current || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const a = { id: e.pointerId, target: e.target, sx: e.clientX, sy: e.clientY };
      active = a;
      if (h.current.onStart?.(info(e)) === false) { active = null; return; }
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    };
    const move = (e: PointerEvent) => {
      if (!active || e.pointerId !== active.id) return;
      e.preventDefault();
      h.current.onMove?.(info(e));
    };
    const end = (cancelled: boolean) => (e: PointerEvent) => {
      if (!active || e.pointerId !== active.id) return;
      const i = info(e);
      active = null;
      try { el.releasePointerCapture(e.pointerId); } catch { /* already released */ }
      h.current.onEnd?.(i, cancelled);
    };
    const up = end(false);
    const cancel = end(true);
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', cancel);
    el.addEventListener('lostpointercapture', cancel as EventListener);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', cancel);
      el.removeEventListener('lostpointercapture', cancel as EventListener);
    };
  }, [ref]);
}
