import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameMap } from './map/GameMap';
import type { GameMapHandle, MarkerState } from './map/GameMap';
import { STOPS } from './data/stops';
import { hatColor } from './data/hats';
import { getRiddle } from './data/riddles';
import { GAMES } from './games/registry';
import { sfx } from './audio/sfx';
import { buzz } from './audio/haptics';
import { GameProvider, useGame } from './state/GameContext';
import { activeProfile, nextStopId, stopIndex } from './state/reducer';
import { DIFFICULTY, MAIN_STOPS, badgeName } from './state/rules';
import { Sheet } from './components/Sheet';
import { HUD } from './components/HUD';
import { ProfileScreen } from './components/ProfileScreen';
import { StoryCard } from './components/StoryCard';
import { StopCard } from './components/StopCard';
import { RiddleCard } from './components/RiddleCard';
import { SummaryCard } from './components/SummaryCard';
import { MenuSheet } from './components/MenuSheet';
import { Leaderboard } from './components/Leaderboard';
import type { Profile, Run } from './state/types';
import type { Stop } from './data/stops';

const DEBUG = typeof location !== 'undefined' && location.search.includes('debug');
const newId = () => (globalThis.crypto?.randomUUID?.() ?? `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);

interface Toast { id: number; text: string; kind: 'unlock' | 'fragment' | 'badge' }

function ChallengeFlow({ profile, run, stop, paused, onFinish }: { profile: Profile; run: Run; stop: Stop; paused: boolean; onFinish: (s: 1 | 2 | 3) => void }) {
  const [started, setStarted] = useState(false);
  const Game = GAMES[stop.id];
  const [snap] = useState(() => ({ difficulty: profile.difficulty, timeScale: DIFFICULTY[profile.difficulty].timeScale }));
  if (!started) return <StopCard stop={stop} first={run.at === 'depot' && run.unlocked.length === 1} onStart={() => setStarted(true)} />;
  return (
    <Sheet title={`${stop.theme} challenge`} heading={<>{stop.theme} <span>challenge</span></>} className="sheet-game">
      <Game difficulty={snap.difficulty} timeScale={snap.timeScale} paused={paused} onFinish={onFinish} />
    </Sheet>
  );
}

function Game() {
  const { state, dispatch } = useGame();
  const profile = activeProfile(state);
  const run = profile?.run ?? null;
  const mapRef = useRef<GameMapHandle>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [overlay, setOverlay] = useState<null | 'menu' | 'leaderboard'>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [announce, setAnnounce] = useState('');
  const queue = useRef<Toast[]>([]);
  const toastTimer = useRef(0);
  const toastId = useRef(0);

  const atIdx = run ? stopIndex(run.at) : 0;
  const key = profile && run ? `${profile.id}:${run.startedAt}` : '';

  const states = useMemo<MarkerState[]>(
    () => STOPS.map((s) => (!run || !run.unlocked.includes(s.id) ? 'locked' : run.stars[s.id] ? 'done' : 'current')),
    [run],
  );
  const legs = useMemo(() => (run ? run.unlocked.slice(1).map((id, i) => `${run.unlocked[i]}>${id}`) : []), [run]);

  // ---- toasts: one at a time, queued ----
  const showing = useRef(false);
  const showNext = useCallback(() => {
    const next = queue.current.shift() ?? null;
    showing.current = next !== null;
    setToast(next);
    window.clearTimeout(toastTimer.current);
    if (next) toastTimer.current = window.setTimeout(showNext, 3000);
  }, []);
  const pushToast = useCallback((text: string, kind: Toast['kind']) => {
    queue.current.push({ id: ++toastId.current, text, kind });
    if (!showing.current) showNext();
  }, [showNext]);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  // ---- put the map in step with a loaded / restarted / switched run ----
  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => {
    const r = runRef.current;
    if (!ready || !r || !key) return;
    mapRef.current?.restore(stopIndex(r.at), r.unlocked.length - 1);
    setBusy(false);
    queue.current = [];
    showing.current = false;
    window.clearTimeout(toastTimer.current);
    setToast(null);
  }, [ready, key]);

  // ---- react to progress: fly to new stop, toasts, announcements ----
  const seen = useRef({ key: '', unlocked: 0, fragments: 0, earned: 0, xp: 0 });
  useEffect(() => {
    if (!run || !ready) return;
    const s = seen.current;
    const n = { key, unlocked: run.unlocked.length, fragments: run.fragments.length, earned: run.earned.length, xp: run.xp };
    if (s.key === key) {
      if (n.fragments > s.fragments) pushToast(`Map fragment ${n.fragments} of ${MAIN_STOPS.length} found!`, 'fragment');
      if (n.earned > s.earned) pushToast(`New badge: ${badgeName(run.earned[run.earned.length - 1])}`, 'badge');
      if (n.xp !== s.xp) setAnnounce(`${n.xp > s.xp ? '+' : '−'}${Math.abs(n.xp - s.xp)} XP. Total ${n.xp} XP.`);
      if (n.unlocked > s.unlocked) {
        const stop = STOPS[n.unlocked - 1];
        pushToast(`New stop unlocked: ${stop.theme}!`, 'unlock');
        sfx('unlock');
        setBusy(true);
        const map = mapRef.current;
        (map ? map.flyToUnlock(n.unlocked - 1) : Promise.resolve()).finally(() => setBusy(false));
      }
    }
    seen.current = n;
  }, [run, ready, key, pushToast]);

  const walk = useCallback(async () => {
    const r = runRef.current;
    if (!r || r.phase !== 'travel' || busy) return;
    const from = stopIndex(r.at), to = r.unlocked.length - 1;
    dispatch({ type: 'startWalk' });
    sfx('step');
    const ok = (await mapRef.current?.walk(from, to)) ?? false;
    dispatch(ok ? { type: 'arrive', now: Date.now() } : { type: 'cancelWalk' });
    if (ok) buzz(20);
  }, [busy, dispatch]);

  // close the menu if the player/run changes under it
  useEffect(() => { setOverlay(null); }, [key]);

  const target = run ? nextStopId(run) : null;
  const targetStop = target ? STOPS[stopIndex(target)] : null;
  const tier = profile ? DIFFICULTY[profile.difficulty].tier : 'medium';
  const riddle = target ? getRiddle(target, tier) : null;
  const hat = profile ? hatColor(profile.avatar) : hatColor('red');
  const phase = run?.phase;
  const overlayOpen = overlay !== null;

  return (
    <div className="app">
      <GameMap ref={mapRef} states={states} legs={legs} hat={hat} onReady={() => setReady(true)} />

      {!ready && (
        <div className="loading" role="status">
          <div className="spinner" aria-hidden="true" />
          Unrolling the map…
        </div>
      )}

      {profile && run && <HUD profile={profile} run={run} onMenu={() => setOverlay('menu')} />}

      <div className="toasts" role="status" aria-live="polite">
        {toast && <div key={toast.id} className={`toast ${toast.kind}`}>{toast.text}</div>}
      </div>
      <div className="sr-only" role="status" aria-live="polite">{announce}</div>

      {profile && run && (phase === 'travel' || phase === 'walking') && targetStop && (
        <section className="panel" aria-live="polite">
          <div className="panel-text">
            <small>Next stop</small>
            <strong data-testid="next-stop">{targetStop.theme}</strong>
          </div>
          <div className="panel-actions">
            <button type="button" className="btn btn-go" data-testid="walk" onClick={walk} disabled={!ready || busy || phase === 'walking'}>
              {phase === 'walking' ? 'Walking…' : 'Walk to next stop'}
            </button>
          </div>
        </section>
      )}

      {DEBUG && profile && run && phase === 'challenge' && (
        <button type="button" className="debug-skip" data-testid="skip-challenge" onClick={() => dispatch({ type: 'finishChallenge', stars: 3, now: Date.now() })}>
          skip challenge (3★)
        </button>
      )}

      <div hidden={overlayOpen}>
        {(!profile || !run) && (
          <ProfileScreen
            profiles={state.profiles}
            onPick={(id) => dispatch({ type: 'selectProfile', id, now: Date.now() })}
            onCreate={(p) => dispatch({ type: 'createProfile', id: newId(), ...p, now: Date.now() })}
            onDelete={(id) => dispatch({ type: 'deleteProfile', id })}
            onLeaderboard={() => setOverlay('leaderboard')}
          />
        )}
        {profile && run && phase === 'intro' && <StoryCard name={profile.name} onBegin={() => dispatch({ type: 'continueIntro' })} />}
        {profile && run && phase === 'challenge' && (
          <ChallengeFlow
            key={`${key}:${run.at}`}
            profile={profile}
            run={run}
            stop={STOPS[atIdx]}
            paused={overlayOpen}
            onFinish={(stars) => dispatch({ type: 'finishChallenge', stars, now: Date.now() })}
          />
        )}
        {profile && run && phase === 'riddle' && riddle && target && (
          <RiddleCard
            key={`${key}:${target}:${profile.difficulty}`}
            riddle={riddle}
            state={run.riddles[target]}
            difficulty={profile.difficulty}
            paused={overlayOpen}
            bonus={!!targetStop?.bonus}
            onAnswer={(choice) => {
              if (choice === riddle.answer) setBusy(true); // the unlock fly-to starts next; keep Walk disabled until it ends
              dispatch({ type: 'answerRiddle', choice });
            }}
            onHint={() => dispatch({ type: 'useHint' })}
            onTimeout={() => dispatch({ type: 'riddleTimeout' })}
            onSkip={targetStop?.bonus ? () => dispatch({ type: 'skipBonus', now: Date.now() }) : undefined}
          />
        )}
        {profile && run && phase === 'summary' && (
          <SummaryCard profile={profile} run={run} onLeaderboard={() => setOverlay('leaderboard')} onAgain={() => dispatch({ type: 'resetRun', now: Date.now() })} />
        )}
      </div>

      {profile && overlay === 'menu' && (
        <MenuSheet
          profile={profile}
          onClose={() => setOverlay(null)}
          onDifficulty={(difficulty) => dispatch({ type: 'setDifficulty', difficulty })}
          onLeaderboard={() => setOverlay('leaderboard')}
          onSwitch={() => { setOverlay(null); dispatch({ type: 'selectProfile', id: null, now: Date.now() }); }}
          onRestart={() => { setOverlay(null); dispatch({ type: 'resetRun', now: Date.now() }); }}
        />
      )}
      {overlay === 'leaderboard' && (
        <Leaderboard profiles={state.profiles} activeId={state.activeId} onClose={() => setOverlay(profile && run?.phase !== 'summary' ? 'menu' : null)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <Game />
    </GameProvider>
  );
}
