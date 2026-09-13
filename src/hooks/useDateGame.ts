/**
 * useDateGame — the state machine for a run.
 *
 * Phases:
 *   'idle'      nothing running (before the first start, or after reset)
 *   'asking'    the question is up, the player is entering digits
 *   'revealing' the guess is locked in and the result is animating
 *   'dead'      the run is over — health hit zero, or freeplay was finished
 *
 * Clock: survival questions run for ROUND_SECONDS. The deadline is an absolute
 * timestamp rather than a decrementing counter, so a throttled background tab
 * cannot buy extra time. Running out resolves the round as a miss (see
 * `resolveTimeout`) rather than letting the player stall indefinitely.
 *
 * Freeplay is untimed. There is no score and nothing to protect from stalling,
 * so a player can sit on a question as long as they like. The deadline is simply
 * never set, which leaves the clock effect inert and makes a timeout
 * unreachable — `timed` on the API says which mode is in force so the UI can
 * drop the countdown entirely rather than render a frozen one.
 *
 * Question order: the full sequence for a run is fixed the moment it starts
 * (see `buildOrder`) and never redrawn. Questions the player has not been shown
 * before come first, so repeats only appear once the whole selection has been
 * played through.
 *
 * Persistence: a survival run is saved the instant a guess is resolved, and on
 * every question after that. A fresh run is deliberately NOT saved when its
 * first question appears — it only becomes a run once an answer has been given,
 * so opening survival and leaving immediately leaves nothing to resume. The
 * save holds the fixed order and the current position, so a refresh at any
 * point after that first answer — mid-question or mid-reveal — resumes on the
 * same question or the next one, with the health the player actually has. There
 * is no way to reroll a question or undo a guess by reloading. On death the run
 * is cleared and the outcome (rounds survived, new best) is computed exactly
 * once and held in `outcome` for the results screen.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ALL_ENTRIES, getPool, type CategoryId, type DateEntry } from '@/data';
import {
  MAX_DIGITS,
  QUESTIONS_PER_CATEGORY,
  ROUND_SECONDS,
  STARTING_HEALTH,
  resolveGuess,
  resolveTimeout,
  type GameMode,
  type RoundResult,
} from '@/game/rules';
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
import { bestStreakIn, streakAfter } from '@/game/progression';
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
  /** Seconds left on the current question, fractional. Meaningless when untimed. */
  remaining: number;
  /** Total seconds a question is given. */
  roundSeconds: number;
  /** True when the current mode runs a clock. Freeplay does not. */
  timed: boolean;
  /** True when the last result came from the clock running out. */
  timedOut: boolean;
  /** 1-based position of this question within its round (difficulty climbs across it). */
  categoryStep: number;
  /** Questions in the current round (the last round of a run may be short). */
  categorySteps: number;
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
  const [remaining, setRemaining] = useState(ROUND_SECONDS);
  const [timedOut, setTimedOut] = useState(false);

  /** Absolute ms timestamp the current question expires at; null when idle. */
  const deadlineRef = useRef<number | null>(null);

  const cursorRef = useRef<RunCursor>({ order: [], index: 0, pool: ALL_ENTRIES, seed: 0 });

  const streak = useMemo(() => streakAfter(history), [history]);

  /**
   * Position of the current question within its round.
   *
   * A round is a fixed-size group of `QUESTIONS_PER_CATEGORY` questions that
   * climbs in difficulty, each step from a different category (see
   * `buildOrder`). Position is therefore just the offset inside the group —
   * derived from the run's fixed order, so it survives a resume mid-round and
   * can never disagree with the question on screen.
   *
   * The last group of a run can be short if the pool ran out, so the step count
   * is clamped to what the order actually holds.
   */
  const { categoryStep, categorySteps } = useMemo(() => {
    const { order, index } = cursorRef.current;
    if (!entry || order.length === 0) return { categoryStep: 1, categorySteps: QUESTIONS_PER_CATEGORY };

    const start = Math.floor(index / QUESTIONS_PER_CATEGORY) * QUESTIONS_PER_CATEGORY;
    const steps = Math.min(QUESTIONS_PER_CATEGORY, order.length - start);

    return { categoryStep: index - start + 1, categorySteps: steps };
  }, [entry, round]);

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
      /** Seconds left on the question being saved. Defaults to a full round. */
      remaining?: number;
    }) => {
      if (args.mode !== 'survival') return;
      saveRun({
        version: 4,
        categories: args.categories,
        seed: cursorRef.current.seed,
        order: cursorRef.current.order,
        index: args.index,
        health: args.health,
        round: args.round,
        bestStreak: args.bestStreak,
        remaining: args.remaining ?? ROUND_SECONDS,
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
      setTimedOut(false);
      // A resumed run picks the clock up where it was left; a fresh one starts
      // full. Freeplay never sets a deadline, so the clock effect stays inert.
      const startRemaining = Math.min(resume?.remaining ?? ROUND_SECONDS, ROUND_SECONDS);
      deadlineRef.current = nextMode === 'survival' ? Date.now() + startRemaining * 1000 : null;
      setRemaining(startRemaining);
      setPhase('asking');

      // A fresh run is not saved yet: it only becomes a run once an answer has
      // been given. Opening survival and leaving straight away therefore leaves
      // nothing behind to resume — and nothing for the lobby to warn about.
      // A resumed run already exists, so re-saving it here banks the clock it
      // restarted with.
      if (resume) {
        persistRun({
          mode: nextMode,
          categories: nextCategories,
          health: startHealth,
          round: startRound,
          index: first.index,
          bestStreak: startBest,
          remaining: startRemaining,
        });
      }
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

  /** Close a run: write stats and hold the outcome. */
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
          stats: before,
        });
        return;
      }

      const exactThisRun = finalHistory.filter((r) => r.accuracy === 'perfect').length;

      const after: SavedStats = {
        ...before,
        bestRounds: Math.max(before.bestRounds, survived),
        totalRuns: before.totalRuns + 1,
        totalRounds: before.totalRounds + survived,
        perfectGuesses: before.perfectGuesses + exactThisRun,
        bestStreak: Math.max(before.bestStreak, runBest),
        lastPlayedAt: Date.now(),
      };

      saveStats(after);
      setStats(after);
      clearRun();

      setOutcome({
        mode: runMode,
        roundsSurvived: survived,
        history: finalHistory,
        bestStreak: runBest,
        isNewBest: survived > before.bestRounds && survived > 0,
        stats: after,
      });
    },
    [bestStreak]
  );

  /**
   * Resolve the round with an already-computed result. Shared by a real guess
   * and by the clock expiring, so both take exactly the same path through
   * history, streaks, persistence and death.
   */
  const resolveRound = useCallback(
    (res: RoundResult) => {
      if (!entry) return;
      // Whatever happens next, the clock for this question is done.
      deadlineRef.current = null;

      const nextHistory = [...history, res];
      const nextBest = Math.max(bestStreak, streakAfter(nextHistory));

      // Answered once — it will not come round again until everything else has.
      markSeen([entry.id]);

      setResult(res);
      setHistory(nextHistory);
      setBestStreak(nextBest);
      setPhase('revealing');

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
    },
    [entry, history, bestStreak, mode, categories, round, concludeRun, persistRun]
  );

  const submit = useCallback(() => {
    if (!entry || digits.length !== MAX_DIGITS || phase !== 'asking') return;

    const res = resolveGuess(entry, Number(digits), health);

    sfx.submit();
    setTimedOut(false);
    resolveRound(res);

    if (res.accuracy === 'perfect') sfx.perfect();
    else if (res.accuracy === 'close') sfx.close();
    else sfx.hit(res.delta);
  }, [entry, digits, phase, health, resolveRound]);

  /**
   * The clock ran out. Scored as a miss TIMEOUT_PENALTY_YEARS off the true
   * year, so stalling is never cheaper than committing to an answer.
   */
  const timeExpired = useCallback(() => {
    if (!entry || phase !== 'asking') return;

    const res = resolveTimeout(entry, health);

    sfx.timeout();
    setTimedOut(true);
    resolveRound(res);
  }, [entry, phase, health, resolveRound]);

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
    setTimedOut(false);
    deadlineRef.current = mode === 'survival' ? Date.now() + ROUND_SECONDS * 1000 : null;
    setRemaining(ROUND_SECONDS);
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
    deadlineRef.current = null;
    concludeRun(history, mode === 'survival' ? round - 1 : history.length, mode);
    setPhase('dead');
  }, [phase, history, mode, round, concludeRun]);

  const suspend = useCallback(() => {
    // Bank the time left so the player returns to the same question on the same
    // second. Nothing is written for a run with no answers in it: an untouched
    // first question is not a run, and saving one would put a phantom "resume"
    // on the lobby for a game that never started.
    const deadline = deadlineRef.current;
    if (mode === 'survival' && phase === 'asking' && deadline !== null && history.length > 0) {
      persistRun({
        mode,
        categories,
        health,
        round,
        index: cursorRef.current.index,
        bestStreak,
        remaining: Math.max(0.1, Math.min((deadline - Date.now()) / 1000, ROUND_SECONDS)),
      });
    }
    deadlineRef.current = null;
    setPhase('idle');
    setEntry(null);
    setResult(null);
  }, [mode, phase, categories, health, round, bestStreak, history.length, persistRun]);

  const reset = useCallback(() => {
    deadlineRef.current = null;
    setPhase('idle');
    setEntry(null);
    setResult(null);
    setOutcome(null);
  }, []);

  /**
   * Drive the clock while a question is up.
   *
   * Time comes from `Date.now()` against an absolute deadline, so a tab that
   * was throttled or asleep resumes with the correct time left (or expires at
   * once) rather than gaining the time it spent suspended.
   */
  const timeExpiredRef = useRef(timeExpired);
  timeExpiredRef.current = timeExpired;

  useEffect(() => {
    if (phase !== 'asking' || deadlineRef.current === null) return;

    let frame = 0;
    const tick = () => {
      const deadline = deadlineRef.current;
      if (deadline === null) return;

      const left = (deadline - Date.now()) / 1000;
      if (left <= 0) {
        setRemaining(0);
        timeExpiredRef.current();
        return;
      }
      setRemaining(left);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, entry]);

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
    remaining,
    roundSeconds: ROUND_SECONDS,
    timed: mode === 'survival',
    timedOut,
    categoryStep,
    categorySteps,
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
