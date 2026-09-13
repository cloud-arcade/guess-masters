/**
 * ResultsScreen — end of a run.
 *
 * A single clean column: the score, a stat list, the platform's leaderboard
 * status, and confetti on a personal best. Levels, XP and local achievements
 * are deliberately absent — ranking belongs to the server.
 *
 * Sizing is fluid rather than stepped. The score uses `clamp()` so it fills a
 * wide screen without overflowing a narrow one, and the stats are rows on
 * phones — where four columns would crush to unreadable slivers — becoming a
 * row of four only once there is width for it.
 */

import { useEffect, useMemo, useState } from 'react';
import { type RoundResult } from '@/game/rules';
import type { RunOutcome } from '@/hooks/useDateGame';
import { Backdrop } from '../game/Backdrop';
import { Confetti } from '../game/Confetti';

interface ResultsScreenProps {
  outcome: RunOutcome;
  submissionState: 'idle' | 'pending' | 'ok' | 'error';
  rank?: number;
  onPlayAgain: () => void;
  onHome: () => void;
}

export function ResultsScreen({ outcome, submissionState, rank, onPlayAgain, onHome }: ResultsScreenProps) {
  const { mode, roundsSurvived, history, isNewBest } = outcome;
  const [countUp, setCountUp] = useState(0);

  // Count the score up on arrival — cheap, effective drama.
  useEffect(() => {
    if (roundsSurvived === 0) return;
    const steps = Math.min(roundsSurvived, 30);
    const stepMs = Math.max(24, 700 / steps);
    let current = 0;
    const timer = window.setInterval(() => {
      current += Math.ceil(roundsSurvived / steps);
      if (current >= roundsSurvived) {
        setCountUp(roundsSurvived);
        window.clearInterval(timer);
      } else {
        setCountUp(current);
      }
    }, stepMs);
    return () => window.clearInterval(timer);
  }, [roundsSurvived]);

  const summary = useMemo(() => {
    const perfect = history.filter((r) => r.accuracy === 'perfect').length;
    const totalDelta = history.reduce((sum, r) => sum + r.delta, 0);
    const avgDelta = history.length > 0 ? totalDelta / history.length : 0;
    const best = history.reduce<RoundResult | null>(
      (acc, r) => (acc === null || r.delta < acc.delta ? r : acc),
      null
    );
    return { perfect, avgDelta, best };
  }, [history]);

  return (
    <div className="absolute inset-0">
      <Backdrop tint={isNewBest ? 'from-amber-300 to-emerald-400' : 'from-rose-500 to-violet-600'} density="calm" />
      {isNewBest && <Confetti />}

      <div className="relative z-10 flex h-full flex-col overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-lg flex-col items-center justify-center gap-6 px-4 py-8 text-center sm:gap-7 sm:px-6">
          {/* Verdict */}
          <div className="w-full">
            {isNewBest ? (
              <div className="animate-bounce-in mb-3 inline-flex max-w-full items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-300 to-yellow-500 px-3.5 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.16em] text-black shadow-[0_0_28px_rgba(251,191,36,0.7)] sm:px-4 sm:text-xs sm:tracking-[0.2em]">
                <span aria-hidden>✦</span>
                <span className="truncate">New personal best</span>
                <span aria-hidden>✦</span>
              </div>
            ) : (
              <p className="mb-3 text-[0.62rem] font-black uppercase tracking-[0.24em] text-white/40 sm:text-[0.65rem] sm:tracking-[0.3em]">
                {mode === 'survival' ? 'Run over' : 'Session complete'}
              </p>
            )}

            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/45 sm:text-[0.7rem] sm:tracking-[0.25em]">
              {mode === 'survival' ? 'Rounds survived' : 'Rounds played'}
            </p>
            {/* clamp() keeps a 3-digit score on one line at 320px and still
                fills the panel on a desktop. */}
            <p
              className="animate-score-pop mt-1 font-semibold leading-none tabular-nums tracking-[-0.03em]"
              style={{ fontSize: 'clamp(4.5rem, 22vw, 8rem)' }}
            >
              {countUp}
            </p>
          </div>

          {/* Stats — unboxed, matching the lobby's rule row: no panel, no
              background, separation carried by a hairline at the same weight.
              Still rows on phones, where four columns would crush values like
              "145.5y" to unreadable slivers — so the rule runs horizontally
              between stacked rows and turns vertical once they go four-up. */}
          <div className="w-full">
            <p className="mb-3 text-center text-[0.6rem] font-bold uppercase tracking-[0.22em] text-white/30">
              This run
            </p>
            <dl className="flex flex-col sm:grid sm:grid-cols-4">
              <Stat label="Exact" value={String(summary.perfect)} tone="text-emerald-300" />
              <Stat label="Avg. off" value={`${summary.avgDelta.toFixed(1)}y`} />
              <Stat label="Best streak" value={`×${outcome.bestStreak}`} tone="text-amber-300" />
              <Stat
                label="Closest"
                value={summary.best ? (summary.best.delta === 0 ? 'Exact' : `${summary.best.delta}y`) : '—'}
              />
            </dl>
          </div>

          {/* Leaderboard */}
          {mode === 'survival' && (
            <p className="text-xs text-white/45">
              Leaderboard:{' '}
              {submissionState === 'pending' && <span className="text-white/60">submitting…</span>}
              {submissionState === 'ok' && (
                <span className="font-bold text-emerald-300">submitted{rank !== undefined ? ` · #${rank}` : ''}</span>
              )}
              {submissionState === 'error' && <span className="font-bold text-rose-300">failed</span>}
              {submissionState === 'idle' && <span className="text-white/35">offline</span>}
            </p>
          )}

          <div className="flex w-full flex-col gap-2.5">
            <button type="button" onClick={onPlayAgain} autoFocus className="btn-hero w-full">
              Play again <span aria-hidden>↻</span>
            </button>
            {/* Menu is the way out, not the thing to do next — so it takes the
                lobby's understated hairline treatment and leaves the filled
                surface to "Play again". */}
            <button
              type="button"
              onClick={onHome}
              className="group flex w-full items-center gap-3 rounded-xl py-1 text-white/60 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60"
            >
              <span className="h-px flex-1 bg-white/[0.08] transition-colors group-hover:bg-white/20" aria-hidden />
              <span className="shrink-0 text-sm font-semibold">Menu</span>
              <span className="h-px flex-1 bg-white/[0.08] transition-colors group-hover:bg-white/20" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * One statistic, unboxed — the same treatment as the lobby's rule numbers.
 * A label/value row on narrow screens, legible whatever the value's length,
 * and a centred value-over-label column once the list becomes a row.
 *
 * The hairline follows the layout: a top rule between stacked rows, becoming
 * a left rule in the four-up grid. Suppressed on the first item either way, so
 * the group is divided rather than enclosed.
 */
function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 border-t border-white/[0.08] px-1 py-2.5 first:border-t-0 sm:flex-col sm:items-center sm:justify-center sm:gap-0 sm:border-l sm:border-t-0 sm:py-0 sm:first:border-l-0">
      <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/40 sm:order-2 sm:mt-1 sm:w-full sm:truncate sm:text-center sm:text-[0.58rem] sm:tracking-[0.1em]">
        {label}
      </dt>
      <dd className={`text-lg font-semibold tabular-nums sm:order-1 sm:text-2xl ${tone ?? ''}`}>{value}</dd>
    </div>
  );
}
