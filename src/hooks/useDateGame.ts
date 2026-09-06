/**
 * useDateGame — the state machine for a run.
 *
 * Phases:
 *   'idle'      nothing running (before the first start, or after reset)
 *   'asking'    the question is up, the player is entering digits
 *   'revealing' the guess is locked in and the result is animating
 *   'dead'      the run is over — health hit zero, or freeplay was finished
 *
 * Question order: the full sequence for a run is fixed the moment it starts
 * (see `buildOrder`) and never redrawn. Questions the player has not been shown
 * before come first, so repeats only appear once the whole selection has been
 * played through.
 *
 * Persistence: a survival run is saved when a question appears *and* again the
 * instant a guess is resolved. The save holds the fixed order and the current
 * position, so a refresh at any point — mid-question or mid-reveal — resumes on
 * the same question or the next one, with the health the player actually has.
 * There is no way to reroll a question or undo a guess by reloading. On death
 * the run is cleared and the outcome (XP, new best, achievements) is computed
 * exactly once and held in `outcome` for the results screen.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ALL_ENTRIES, getPool, type CategoryId, type DateEntry } from '@/data';
import { MAX_DIGITS, STARTING_HEALTH, resolveGuess, type GameMode, type RoundResult } from '@/game/rules';
import { buildOrder, createRng, randomSeed } from '@/game/selector';
import {
  clearRun,
  loadSeen,
  loadStats,
  markSeen,
  saveRun,
  saveStats,
  type SavedRun,
  type SavedStats,
} from '@/game/storage';
import { bestStreakIn, newlyUnlocked, streakAfter, xpForRun } from '@/game/progression';
import { sfx } from '@/game/sound';

export type Phase = 'idle' | 'asking' | 'revealing' | 'dead';

export interface StartOptions {
  mode: GameMode;
  categories: CategoryId[] | 'all';
  /** Restore this run instead of starting fresh. */
  resume?: SavedRun;
}

/** Computed once when a run ends. */
export interface RunOutcome {
  mode: GameMode;
  roundsSurvived: number;
  history: RoundResult[];
  bestStreak: number;
  isNewBest: boolean;
  xpGained: number;
  xpBefore: number;
  xpAfter: number;
  newAchievements: string[];
  stats: SavedStats;
}

export interface DateGameApi {
  phase: Phase;
  mode: GameMode;
  health: number;
  round: number;
  entry: DateEntry | null;
  digits: string;
  result: RoundResult | null;
  /** Rounds fully survived — the leaderboard score. */
  roundsSurvived: number;
  /** Consecutive close-or-better guesses. */
  streak: number;
  bestStreak: number;
  history: RoundResult[];
  outcome: RunOutcome | null;
  stats: SavedStats;
  canSubmit: boolean;
  pushDigit: (d: string) => void;
  popDigit: () => void;
  clearDigits: () => void;
  submit: () => void;
  next: () => void;
  start: (options: StartOptions) => void;
  /** End a freeplay session and show results. */
  finish: () => void;
  /** Leave a survival run resumable and return to idle. */
  suspend: () => void;
  /** Return to idle without touching storage. */
  reset: () => void;
}

const ENTRY_BY_ID = new Map(ALL_ENTRIES.map((e) => [e.id, e]));

interface RunCursor {
  /** Fixed question order for this run, as ids. Extended only if the run outlives it. */
  order: string[];
  /** Position in `order` of the question on screen. */
  index: number;
  pool: DateEntry[];
  seed: number;
}

/**
 * Resolve the entry at `index`, skipping ids that no longer exist in the pool
 * (the library changed between sessions). If the order runs out — a run longer
 * than the whole pool — a further pass over the pool is appended, derived from
 * the same seed so it is still deterministic.
 */
function resolveAt(cursor: RunCursor, index: number): { index: number; entry: DateEntry } {
  const inPool = new Set(cursor.pool.map((e) => e.id));
  let i = index;
  for (;;) {
    if (i >= cursor.order.length) {
      const rng = createRng((cursor.seed ^ cursor.order.length) >>> 0);
      cursor.order.push(...buildOrder(cursor.pool, new Set(), rng));
    }
    const entry = ENTRY_BY_ID.get(cursor.order[i]);
    if (entry && inPool.has(entry.id)) return { index: i, entry };
    i++;
  }
}

export function useDateGame(): DateGameApi {
  const [mode, setMode] = useState<GameMode>('survival');
  const [categories, setCategories] = useState<CategoryId[] | 'all'>('all');
  const [phase, setPhase] = useState<Phase>('idle');
  const [health, setHealth] = useState(STARTING_HEALTH);
  const [round, setRound] = useState(1);
  const [entry, setEntry] = useState<DateEntry | null>(null);
  const [digits, setDigits] = useState('');
  const [result, setResult] = useState<RoundResult | null>(null);
  const [history, setHistory] = useState<RoundResult[]>([]);
  const [bestStreak, setBestStreak] = useState(0);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [stats, setStats] = useState<SavedStats>(() => loadStats());

  const cursorRef = useRef<RunCursor>({ order: [], index: 0, pool: ALL_ENTRIES, seed: 0 });

  const streak = useMemo(() => streakAfter(history), [history]);

  /**
   * Survival: rounds completed before the fatal one. Freeplay: every answered
   * question counts, since there is no death round.
   */
  const roundsSurvived = mode === 'survival' ? round - 1 : history.length;

  /** Save the run as it stands. Survival only. */
  const persistRun = useCallback(
    (args: {
      mode: GameMode;
      categories: CategoryId[] | 'all';
      health: number;
      round: number;
      index: number;
      bestStreak: number;
    }) => {
      if (args.mode !== 'survival') return;
      saveRun({
        version: 3,
        categories: args.categories,
        seed: cursorRef.current.seed,
        order: cursorRef.current.order,
        index: args.index,
        health: args.health,
        round: args.round,
        bestStreak: args.bestStreak,
        savedAt: Date.now(),
      });
    },
    []
  );

  const start = useCallback(
    (options: StartOptions) => {
      const { mode: nextMode, categories: nextCategories, resume } = options;
      const nextPool = getPool(nextCategories);

      const seed = resume?.seed ?? randomSeed();
      const order = resume
        ? [...resume.order]
        : buildOrder(nextPool, loadSeen(), createRng(seed));

      cursorRef.current = { order, index: 0, pool: nextPool, seed };

      const startHealth = resume?.health ?? STARTING_HEALTH;
      const startRound = resume?.round ?? 1;
      const startBest = resume?.bestStreak ?? 0;

      const first = resolveAt(cursorRef.current, resume?.index ?? 0);
      cursorRef.current.index = first.index;

      setMode(nextMode);
      setCategories(nextCategories);
      setHealth(startHealth);
      setRound(startRound);
      setBestStreak(startBest);
      setHistory([]);
      setResult(null);
      setOutcome(null);
      setDigits('');
      setEntry(first.entry);
      setPhase('asking');

      persistRun({
        mode: nextMode,
        categories: nextCategories,
        health: startHealth,
        round: startRound,
        index: first.index,
        bestStreak: startBest,
      });
    },
    [persistRun]
  );

  const pushDigit = useCallback(
    (d: string) => {
      if (phase !== 'asking') return;
      setDigits((current) => {
        if (current.length >= MAX_DIGITS) return current;
        sfx.digit();
        return current + d;
      });
    },
    [phase]
  );

  const popDigit = useCallback(() => {
    if (phase !== 'asking') return;
    setDigits((current) => {
      if (current.length === 0) return current;
      sfx.delete();
      return current.slice(0, -1);
    });
  }, [phase]);

  const clearDigits = useCallback(() => {
    if (phase !== 'asking') return;
    setDigits('');
  }, [phase]);

  const canSubmit = phase === 'asking' && digits.length === MAX_DIGITS;

  /** Close a run: write stats, compute achievements/XP, hold the outcome. */
  const concludeRun = useCallback(
    (finalHistory: RoundResult[], survived: number, runMode: GameMode) => {
      const runBest = Math.max(bestStreak, bestStreakIn(finalHistory));
      const before = loadStats();

      if (runMode !== 'survival') {
        setOutcome({
          mode: runMode,
          roundsSurvived: survived,
          history: finalHistory,
          bestStreak: runBest,
          isNewBest: false,
          xpGained: 0,
          xpBefore: before.xp,
          xpAfter: before.xp,
          newAchievements: [],
          stats: before,
        });
        return;
      }

      const exactThisRun = finalHistory.filter((r) => r.accuracy === 'perfect').length;
      const xpGained = xpForRun(finalHistory, survived);

      const after: SavedStats = {
        ...before,
        bestRounds: Math.max(before.bestRounds, survived),
        totalRuns: before.totalRuns + 1,
        totalRounds: before.totalRounds + survived,
        perfectGuesses: before.perfectGuesses + exactThisRun,
        bestStreak: Math.max(before.bestStreak, runBest),
        xp: before.xp + xpGained,
        lastPlayedAt: Date.now(),
      };

      const unlocked = newlyUnlocked(
        {
          roundsSurvived: survived,
          history: finalHistory,
          bestStreak: runBest,
          totals: { runs: after.totalRuns, rounds: after.totalRounds, exact: after.perfectGuesses },
        },
        before.achievements
      );
      after.achievements = [...before.achievements, ...unlocked];

      saveStats(after);
      setStats(after);
      clearRun();

      setOutcome({
        mode: runMode,
        roundsSurvived: survived,
        history: finalHistory,
        bestStreak: runBest,
        isNewBest: survived > before.bestRounds && survived > 0,
        xpGained,
        xpBefore: before.xp,
        xpAfter: after.xp,
        newAchievements: unlocked,
        stats: after,
      });
    },
    [bestStreak]
  );

  const submit = useCallback(() => {
    if (!entry || digits.length !== MAX_DIGITS || phase !== 'asking') return;

    const guess = Number(digits);
    const res = resolveGuess(entry, guess, health);
    const nextHistory = [...history, res];
    const nextBest = Math.max(bestStreak, streakAfter(nextHistory));

    // Answered once — it will not come round again until everything else has.
    markSeen([entry.id]);

    sfx.submit();
    setResult(res);
    setHistory(nextHistory);
    setBestStreak(nextBest);
    setPhase('revealing');

    if (res.accuracy === 'perfect') sfx.perfect();
    else if (res.accuracy === 'close') sfx.close();
    else sfx.hit(res.delta);

    if (mode === 'freeplay') return;

    setHealth(res.healthAfter);

    if (res.fatal) {
      // The run is over the moment the fatal guess lands, so the stats are
      // written now rather than when the results screen appears — a refresh
      // during the reveal must not lose the run.
      concludeRun(nextHistory, round - 1, 'survival');
      return;
    }

    // The guess is final. Save the run already pointing at the next question
    // with the post-guess health, so a refresh during the reveal cannot replay
    // this question with the answer known, nor restore the health before it.
    persistRun({
      mode,
      categories,
      health: res.healthAfter,
      round: round + 1,
      index: cursorRef.current.index + 1,
      bestStreak: nextBest,
    });
  }, [entry, digits, phase, health, history, bestStreak, mode, categories, round, concludeRun, persistRun]);

  const next = useCallback(() => {
    if (phase !== 'revealing') return;

    if (mode === 'survival' && result?.fatal) {
      sfx.gameOver();
      setPhase('dead');
      return;
    }

    const nextRound = round + 1;
    const following = resolveAt(cursorRef.current, cursorRef.current.index + 1);
    cursorRef.current.index = following.index;

    setRound(nextRound);
    setEntry(following.entry);
    setDigits('');
    setResult(null);
    setPhase('asking');

    persistRun({
      mode,
      categories,
      health,
      round: nextRound,
      index: following.index,
      bestStreak,
    });
  }, [phase, mode, result, round, health, categories, bestStreak, persistRun]);

  const finish = useCallback(() => {
    if (phase === 'idle' || phase === 'dead') return;
    concludeRun(history, mode === 'survival' ? round - 1 : history.length, mode);
    setPhase('dead');
  }, [phase, history, mode, round, concludeRun]);

  const suspend = useCallback(() => {
    // The run was already saved when the current question appeared (and again
    // when it was answered); nothing more to write. Just leave.
    setPhase('idle');
    setEntry(null);
    setResult(null);
  }, []);

  const reset = useCallback(() => {
    setPhase('idle');
    setEntry(null);
    setResult(null);
    setOutcome(null);
  }, []);

  // New-best fanfare once the results screen is up.
  useEffect(() => {
    if (phase === 'dead' && outcome?.isNewBest) {
      const t = window.setTimeout(() => sfx.newBest(), 400);
      return () => window.clearTimeout(t);
    }
  }, [phase, outcome]);

  return {
    phase,
    mode,
    health,
    round,
    entry,
    digits,
    result,
    roundsSurvived,
    streak,
    bestStreak,
    history,
    outcome,
    stats,
    canSubmit,
    pushDigit,
    popDigit,
    clearDigits,
    submit,
    next,
    start,
    finish,
    suspend,
    reset,
  };
}
