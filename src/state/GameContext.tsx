import { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import type { Dispatch, ReactNode } from 'react';
import { reducer } from './reducer';
import type { Action } from './reducer';
import { loadSave, writeSave } from './storage';
import type { GameState } from './types';

interface Ctx { state: GameState; dispatch: Dispatch<Action> }
const GameCtx = createContext<Ctx | null>(null);

export const useGame = (): Ctx => {
  const c = useContext(GameCtx);
  if (!c) throw new Error('useGame outside GameProvider');
  return c;
};

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadSave);
  const latest = useRef(state);
  latest.current = state;
  const first = useRef(true);

  // debounced save after every change; flushed when the page is hidden/closed so a quick reload keeps progress
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = window.setTimeout(() => writeSave(latest.current), 200);
    return () => window.clearTimeout(t);
  }, [state]);
  useEffect(() => {
    const flush = () => writeSave(latest.current);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flush);
    };
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV || location.search.includes('debug')) {
      (window as unknown as { __game: unknown }).__game = {
        dispatch,
        get state() { return latest.current; },
      };
    }
  }, []);

  return <GameCtx.Provider value={{ state, dispatch }}>{children}</GameCtx.Provider>;
}
