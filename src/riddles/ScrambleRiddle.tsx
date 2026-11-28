import { useEffect, useRef, useState } from 'react';
import type { ScrambleRiddle as Model } from './types';
import type { KindProps } from './kinds';
import { RiddleLayout } from './Layout';
import { firstUnsolved, lettersOf, slotWord } from './scramble';
import { usePointerDrag } from '../games/kit/usePointerDrag';
import { useReducedMotion } from '../games/kit/useReducedMotion';

interface Ghost { letter: string; x: number; y: number }

/**
 * Letter tiles. Tap a tile to drop it in the next free slot, or drag it onto a slot (drag a placed tile to move it,
 * tap it to take it back). Typing letters works; Backspace undoes. The hint fills the first unsolved letter.
 */
export function ScrambleRiddle({ riddle, hinted, paused, solved, judge, head, foot }: KindProps<Model>) {
  const reduced = useReducedMotion();
  const letters = lettersOf(riddle.word);
  // slots[i] = index into riddle.tiles, or null
  const [slots, setSlots] = useState<(number | null)[]>(() => letters.map(() => null));
  const [locked, setLocked] = useState<boolean[]>(() => letters.map(() => false));
  const [shake, setShake] = useState(false);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [done, setDone] = useState(false);
  const area = useRef<HTMLDivElement>(null);
  const dragSrc = useRef<{ tile: number; from: number | null; moved: boolean } | null>(null);
  const off = paused || solved || done;
  const offRef = useRef(off);
  offRef.current = off;
  const stateRef = useRef({ slots, locked });
  stateRef.current = { slots, locked };
  const judgeRef = useRef(judge);
  judgeRef.current = judge;

  const used = new Set(slots.filter((s): s is number => s !== null));
  const letterAt = (s: (number | null)[]) => s.map((t) => (t === null ? null : riddle.tiles[t]));

  const commit = (s: (number | null)[], l: boolean[]) => {
    stateRef.current = { slots: s, locked: l };
    setSlots(s);
    setLocked(l);
    if (s.every((t) => t !== null)) {
      const guess = slotWord(riddle.word, letterAt(s));
      if (guess === riddle.word) {
        setDone(true);
        judgeRef.current(true, guess);
      } else {
        judgeRef.current(false, guess);
        setShake(true);
        window.setTimeout(() => {
          setShake(false);
          const cur = stateRef.current;
          commit(cur.slots.map((t, i) => (cur.locked[i] ? t : null)), cur.locked);
        }, 450);
      }
    }
  };

  /** put `tile` into slot `at` (default: first free slot); a tile already in another slot moves */
  const place = (tile: number, at?: number) => {
    if (offRef.current) return;
    const { slots: s0, locked: l } = stateRef.current;
    const s = s0.map((t) => (t === tile ? null : t));
    const idx = at ?? s.findIndex((t) => t === null);
    if (idx < 0 || l[idx] || (s0.indexOf(tile) >= 0 && l[s0.indexOf(tile)])) return;
    s[idx] = tile;
    commit(s, l);
  };
  const unplace = (slot: number) => {
    if (offRef.current) return;
    const { slots: s0, locked: l } = stateRef.current;
    if (s0[slot] === null || l[slot]) return;
    commit(s0.map((t, i) => (i === slot ? null : t)), l);
  };
  const undo = () => {
    if (offRef.current) return;
    const { slots: s0, locked: l } = stateRef.current;
    for (let i = s0.length - 1; i >= 0; i--) if (s0[i] !== null && !l[i]) { unplace(i); return; }
  };

  // keyboard: letters place a matching tile, Backspace undoes
  const placeRef = useRef(place);
  placeRef.current = place;
  const undoRef = useRef(undo);
  undoRef.current = undo;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Backspace') { e.preventDefault(); undoRef.current(); return; }
      if (e.key.length !== 1 || !/[a-z]/i.test(e.key)) return;
      const ch = e.key.toUpperCase();
      const free = riddle.tiles.findIndex((t, i) => t === ch && !stateRef.current.slots.includes(i));
      if (free >= 0) { e.preventDefault(); placeRef.current(free); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [riddle.tiles]);

  // hint: put the right letter in the first unsolved slot and lock it
  const hintDone = useRef(false);
  useEffect(() => {
    if (!hinted || hintDone.current) return;
    hintDone.current = true;
    const { slots: s0, locked: l0 } = stateRef.current;
    const have = letterAt(s0) as (string | null)[];
    const i = firstUnsolved(riddle.word, have);
    if (i < 0) return;
    const need = letters[i];
    const s = s0.slice();
    // take the tile from wherever it is (a wrong slot, or the tray); an unlocked tile in slot i goes back to the tray
    let t = riddle.tiles.findIndex((x, k) => x === need && s.indexOf(k) >= 0 && !l0[s.indexOf(k)]);
    if (t < 0) t = riddle.tiles.findIndex((x, k) => x === need && !s.includes(k));
    if (t < 0) return;
    const prev = s.indexOf(t);
    if (prev >= 0) s[prev] = null;
    s[i] = t;
    const l = l0.slice();
    l[i] = true;
    commit(s, l);
  }, [hinted]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- drag ----
  const dropSlot = (x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-slot]');
    return el ? Number(el.dataset.slot) : null;
  };
  usePointerDrag(area, {
    onStart: (i) => {
      if (offRef.current) return false;
      const el = (i.target as HTMLElement | null)?.closest<HTMLElement>('[data-tile], [data-slot]');
      if (!el) return false;
      let tile: number | null = null;
      let from: number | null = null;
      if (el.dataset.slot !== undefined) {
        from = Number(el.dataset.slot);
        tile = stateRef.current.slots[from];
        if (tile === null || stateRef.current.locked[from]) return false;
      } else tile = Number(el.dataset.tile);
      if (!Number.isFinite(tile) || tile === null) return false;
      if (from === null && stateRef.current.slots.includes(tile)) return false;
      dragSrc.current = { tile, from, moved: false };
      setGhost({ letter: riddle.tiles[tile], x: i.x, y: i.y });
    },
    onMove: (i) => {
      const d = dragSrc.current;
      if (!d) return;
      if (Math.hypot(i.dx, i.dy) > 8) d.moved = true;
      setGhost({ letter: riddle.tiles[d.tile], x: i.x, y: i.y });
    },
    onEnd: (i, cancelled) => {
      const d = dragSrc.current;
      dragSrc.current = null;
      setGhost(null);
      if (!d || cancelled) return;
      if (!d.moved) {
        if (d.from !== null) unplace(d.from); else place(d.tile);
        return;
      }
      const slot = dropSlot(i.x, i.y);
      if (slot !== null) place(d.tile, slot);
      else if (d.from !== null) unplace(d.from); // dragged out of the word: back to the tray
    },
  }, !off);

  // split the word into words so long phrases wrap between words
  let k = 0;
  const groups = riddle.word.split(' ').map((w) => w.split('').map(() => k++));

  return (
    <RiddleLayout
      head={head}
      foot={foot}
      answer={
        <div className={`scramble${shake && !reduced ? ' shake' : ''}`} ref={area}>
          <div className="slots" role="group" aria-label={`Answer, ${letters.length} letters`}>
            {groups.map((g, gi) => (
              <span className="slot-word" key={gi}>
                {g.map((si) => {
                  const t = slots[si];
                  return (
                    <span
                      key={si}
                      data-slot={si}
                      className={`slot${t !== null ? ' full' : ''}${locked[si] ? ' locked' : ''}`}
                      aria-label={t === null ? `Empty letter ${si + 1}` : `Letter ${si + 1}: ${riddle.tiles[t]}`}
                    >
                      {t !== null && !(ghost && dragSrc.current?.from === si) ? riddle.tiles[t] : ''}
                    </span>
                  );
                })}
              </span>
            ))}
          </div>
          <div className="tray" role="group" aria-label="Letter tiles">
            {riddle.tiles.map((c, i) => {
              const isUsed = used.has(i);
              return (
                <button
                  key={i}
                  type="button"
                  data-tile={i}
                  data-autofocus={i === 0 ? '' : undefined}
                  className={`tile${isUsed ? ' used' : ''}${ghost && dragSrc.current?.tile === i ? ' lifted' : ''}`}
                  disabled={paused || solved || isUsed}
                  aria-label={`Letter ${c}`}
                  onClick={(e) => { if (e.detail === 0) place(i); }}
                >
                  {c}
                </button>
              );
            })}
          </div>
          <div className="scramble-actions">
            <button type="button" className="btn btn-plain" onClick={undo} disabled={off || !slots.some((t, i) => t !== null && !locked[i])}>Undo ⌫</button>
            {riddle.decoy && <small className="tricky">One tile is a decoy.</small>}
          </div>
          {ghost && <span className="tile ghost" style={{ left: ghost.x, top: ghost.y }} aria-hidden="true">{ghost.letter}</span>}
        </div>
      }
    />
  );
}
