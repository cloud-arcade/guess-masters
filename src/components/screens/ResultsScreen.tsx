/**
 * ResultsScreen — end of a run.
 *
 * A single clean column: score count-up, rank, XP bar animating from the old
 * level to the new, achievements earned, a compact stat row, and confetti on a
 * personal best.
 */

import { useEffect, useMemo, useState } from 'react';
import { rankFor, type RoundResult } from '@/game/rules';
import { ACHIEVEMENT_MAP, levelProgress, titleForLevel } from '@/game/progression';
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
  const { mode, roundsSurvived, history, isNewBest, xpGained, xpBefore, xpAfter, newAchievements, stats } = outcome;
  const [countUp, setCountUp] = useState(0);
  const [xpShown, setXpShown] = useState(xpBefore);
  const rankInfo = rankFor(roundsSurvived);

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

  // Tween the XP bar after the score lands.
  useEffect(() => {
    if (xpGained === 0) return;
    const start = window.setTimeout(() => {
      const t0 = performance.now();
      const dur = 1100;
      const frame = (now: number) => {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        setXpShown(Math.round(xpBefore + (xpAfter - xpBefore) * eased));
        if (p < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }, 800);
    return () => window.clearTimeout(start);
  }, [xpBefore, xpAfter, xpGained]);

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

  const level = levelProgress(xpShown);
  const leveledUp = level.level > levelProgress(xpBefore).level;

  return (
    <div className="absolute inset-0">
      <Backdrop tint={isNewBest ? 'from-amber-300 to-emerald-400' : 'from-rose-500 to-violet-600'} density="calm" />
      {isNewBest && <Confetti />}

      <div className="relative z-10 flex h-full flex-col overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-xl flex-col items-center justify-center gap-7 px-5 py-8 text-center">
          {/* Verdict */}
          <div>
            {isNewBest ? (
              <div className="animate-bounce-in mb-4 inline-flex rounded-full bg-gradient-to-r from-amber-300 to-yellow-500 px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-black shadow-[0_0_28px_rgba(251,191,36,0.7)]">
                ✦ New personal best ✦
              </div>
            ) : (
              <p className="mb-4 text-[0.65rem] font-black uppercase tracking-[0.3em] text-white/40">
                {mode === 'survival' ? 'Run over' : 'Session complete'}
              </p>
            )}

            <p className="text-[0.7rem] font-bold uppercase tracking-[0.25em] text-white/45">
              {mode === 'survival' ? 'Rounds survived' : 'Rounds played'}
            </p>
            <p className="animate-score-pop mt-1 font-mono text-8xl font-black leading-none tabular-nums sm:text-9xl">
              {countUp}
            </p>
            <p className="mt-4 text-2xl font-black tracking-tight">{rankInfo.title}</p>
            <p className="text-sm text-white/45">{rankInfo.blurb}</p>
          </div>

          {/* XP */}
          {mode === 'survival' && (
            <div className="w-full max-w-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    key={level.level}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-400 to-indigo-600 font-mono text-sm font-black shadow-[0_0_16px_rgba(129,140,248,0.6)] ${leveledUp ? 'animate-bounce-in' : ''}`}
                  >
                    {level.level}
                  </div>
                  <div className="text-left leading-tight">
                    <p className="text-sm font-black">{titleForLevel(level.level)}</p>
                    <p className="text-[0.65rem] text-white/45">
                      {leveledUp ? <span className="font-bold text-amber-300">LEVEL UP!</span> : `Level ${level.level}`}
                    </p>
                  </div>
                </div>
                <span className="animate-slide-up font-mono text-sm font-black text-violet-300">+{xpGained} XP</span>
              </div>
              <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-400 to-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.7)] transition-[width] duration-100"
                  style={{ width: `${Math.round(level.fraction * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="flex w-full items-stretch justify-center gap-5 sm:gap-8">
            <Stat label="Exact" value={String(summary.perfect)} tone="text-emerald-300" />
            <Divider />
            <Stat label="Avg. off" value={`${summary.avgDelta.toFixed(1)}y`} />
            <Divider />
            <Stat label="Streak" value={`${outcome.bestStreak}🔥`} tone="text-amber-300" />
            <Divider />
            <Stat
              label="Closest"
              value={summary.best ? (summary.best.delta === 0 ? 'Exact' : `${summary.best.delta}y`) : '—'}
            />
          </div>

          {/* Achievements */}
          {newAchievements.length > 0 && (
            <div className="flex w-full max-w-sm flex-col gap-2">
              {newAchievements.map((id, i) => {
                const a = ACHIEVEMENT_MAP[id];
                if (!a) return null;
                return (
                  <div
                    key={id}
                    className="animate-toast-in flex items-center gap-3 rounded-xl bg-amber-300/10 px-3 py-2 text-left ring-1 ring-amber-300/30"
                    style={{ animationDelay: `${0.9 + i * 0.18}s` }}
                  >
                    <span className="text-2xl" aria-hidden>
                      {a.icon}
                    </span>
                    <div className="leading-tight">
                      <p className="text-sm font-black">{a.title}</p>
                      <p className="text-[0.7rem] text-white/50">{a.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

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
              <span className="mx-2 text-white/20">·</span>
              Best <span className="font-mono font-bold text-white">{stats.bestRounds}</span>
            </p>
          )}

          <div className="flex w-full max-w-sm flex-col gap-2.5">
            <button type="button" onClick={onPlayAgain} autoFocus className="btn-hero w-full">
              Play again <span aria-hidden>↻</span>
            </button>
            <button type="button" onClick={onHome} className="btn-ghost w-full">
              Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`font-mono text-2xl font-black tabular-nums ${tone ?? ''}`}>{value}</span>
      <span className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-white/45">{label}</span>
    </div>
  );
}

function Divider() {
  return <span className="w-px self-stretch bg-white/10" aria-hidden />;
}
