/**
 * GameContainer — screen routing and platform wiring.
 *
 * Holds the run lifecycle: starting a session when a survival run begins,
 * submitting rounds-survived when it ends, and ending the session afterwards.
 * The container fills whatever frame it is embedded in; each screen handles its
 * own centring and max-widths.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { PlayScreen } from './screens/PlayScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { useDateGame, type RunOutcome } from '@/hooks/useDateGame';
import { useCloudArcade } from '@/hooks/useCloudArcade';
import { loadRun, loadPrefs, savePrefs, type SavedRun } from '@/game/storage';
import { setSoundEnabled, setVolume, unlockAudio } from '@/game/sound';
import type { CategoryId } from '@/data';

type Screen = 'home' | 'playing' | 'results';

export function GameContainer() {
  const game = useDateGame();
  const { startSession, endSession, submitScore, gameOver, isConnected, lastRank, scoreState, userName } =
    useCloudArcade({ debug: import.meta.env.DEV });

  const [screen, setScreen] = useState<Screen>('home');
  const [savedRun, setSavedRun] = useState<SavedRun | null>(() => loadRun());
  const [sound, setSound] = useState(() => loadPrefs().soundEnabled);
  const [volume, setVolumeState] = useState(() => loadPrefs().volume);

  // Each outcome object is scored exactly once, regardless of how the screen
  // state moves afterwards.
  const scoredRef = useRef<RunOutcome | null>(null);

  useEffect(() => {
    setSoundEnabled(sound);
  }, [sound]);

  useEffect(() => {
    setVolume(volume);
  }, [volume]);

  /**
   * Submit the moment the run ends — not when a screen is reached.
   *
   * `outcome` is written once, by `concludeRun`, at the instant the fatal guess
   * resolves. `phase` does not become 'dead' until the player taps past the
   * reveal, so keying submission off the phase made the score depend on a tap:
   * closing the tab on the reveal, or simply never tapping, meant the run was
   * never scored. The outcome existing is the real end-of-run signal, so that
   * is what this watches. `scoredRef` still guarantees one submission per run.
   */
  useEffect(() => {
    const outcome = game.outcome;
    if (!outcome) return;
    if (scoredRef.current === outcome) return;
    scoredRef.current = outcome;

    setSavedRun(null);

    if (outcome.mode === 'survival') {
      const { roundsSurvived: rounds, history } = outcome;
      submitScore(rounds, {
        rounds,
        mode: 'survival',
        exactGuesses: history.filter((r) => r.accuracy === 'perfect').length,
        bestStreak: outcome.bestStreak,
        averageDelta: Number(
          (history.reduce((sum, r) => sum + r.delta, 0) / Math.max(1, history.length)).toFixed(2)
        ),
      });
      gameOver(rounds, true);
    }
  }, [game.outcome, submitScore, gameOver]);

  /**
   * Navigation is a separate concern: the results screen appears once the
   * player has actually dismissed the reveal. Scoring above has already
   * happened by this point, whether or not they ever get here.
   */
  useEffect(() => {
    if (game.phase !== 'dead' || !game.outcome) return;
    setScreen('results');
  }, [game.phase, game.outcome]);

  const beginSurvival = useCallback(
    (resume?: SavedRun) => {
      unlockAudio();
      startSession({ mode: 'survival', resumed: Boolean(resume) });
      game.start({ mode: 'survival', categories: 'all', resume });
      setSavedRun(null);
      setScreen('playing');
    },
    [game, startSession]
  );

  // A refresh mid-run goes straight back into the run at the exact question it
  // left. It only reaches the menu once that run has finished or been quit, so
  // reloading is never a way to see a different question or dodge a guess.
  const autoResumedRef = useRef(false);
  const beginSurvivalRef = useRef(beginSurvival);
  beginSurvivalRef.current = beginSurvival;
  useEffect(() => {
    if (autoResumedRef.current) return;
    autoResumedRef.current = true;
    const pending = loadRun();
    if (pending) beginSurvivalRef.current(pending);
  }, []);

  const beginFreeplay = useCallback(
    (categories: CategoryId[] | 'all') => {
      unlockAudio();
      savePrefs({ ...loadPrefs(), categories });
      game.start({ mode: 'freeplay', categories });
      setScreen('playing');
    },
    [game]
  );

  /**
   * Leave the play screen for the menu. Both modes go straight there — a
   * deliberate exit is not a finished run, so freeplay does not detour through
   * a results screen the player did not ask for.
   *
   * Survival keeps the run resumable: it was saved when the question appeared,
   * and `suspend` banks the clock on the way out, so the menu can offer it back
   * at the same question, health and second.
   */
  const handleQuit = useCallback(() => {
    if (game.mode === 'survival') {
      game.suspend();
      endSession({ suspended: true });
    } else {
      game.reset();
      endSession();
    }
    setSavedRun(loadRun());
    setScreen('home');
  }, [game, endSession]);

  const handleHome = useCallback(() => {
    if (game.mode === 'survival') endSession();
    game.reset();
    setSavedRun(loadRun());
    setScreen('home');
  }, [game, endSession]);

  const handlePlayAgain = useCallback(() => {
    if (game.mode === 'survival') {
      endSession();
      beginSurvival();
    } else {
      beginFreeplay(loadPrefs().categories);
    }
  }, [game.mode, endSession, beginSurvival, beginFreeplay]);

  const changeVolume = useCallback((value: number) => {
    setVolumeState(value);
    savePrefs({ ...loadPrefs(), volume: value });
  }, []);

  const toggleSound = useCallback(() => {
    setSound((s) => {
      const next = !s;
      savePrefs({ ...loadPrefs(), soundEnabled: next });
      return next;
    });
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#07070f]">
      {screen === 'home' && (
        <HomeScreen
          savedRun={savedRun}
          userName={userName}
          soundEnabled={sound}
          onToggleSound={toggleSound}
          volume={volume}
          onVolumeChange={changeVolume}
          onStartSurvival={() => beginSurvival()}
          onStartFreeplay={beginFreeplay}
          onResume={(run) => beginSurvival(run)}
        />
      )}

      {screen === 'playing' && (
        <PlayScreen
          game={game}
          userName={userName}
          soundEnabled={sound}
          onToggleSound={toggleSound}
          volume={volume}
          onVolumeChange={changeVolume}
          onQuit={handleQuit}
          onPlayAgain={handlePlayAgain}
        />
      )}

      {screen === 'results' && game.outcome && (
        <ResultsScreen
          outcome={game.outcome}
          submissionState={
            game.outcome.mode === 'survival' ? (isConnected ? scoreState : 'idle') : 'idle'
          }
          rank={lastRank}
          onPlayAgain={handlePlayAgain}
          onHome={handleHome}
        />
      )}
    </div>
  );
}
