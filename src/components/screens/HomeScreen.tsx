/**
 * HomeScreen — the lobby.
 *
 * One clean centred column: title, the rules in three numbers, a single big
 * Survival button, and Freeplay as a quieter secondary action. Level and best
 * run live in the top bar; everything else waits for the results screen.
 *
 * Survival always plays the full library, because the platform has a single
 * leaderboard and mixing filtered runs into it would make the scores
 * incomparable. Freeplay is where category filters apply.
 */

import { useState } from 'react';
import { libraryStats, type CategoryId } from '@/data';
import type { SavedRun, SavedStats } from '@/game/storage';
import { PERFECT_BONUS, STARTING_HEALTH } from '@/game/rules';
import { levelProgress, titleForLevel } from '@/game/progression';
import { Backdrop } from '../game/Backdrop';
import { CategoryPicker } from '../game/CategoryPicker';

interface HomeScreenProps {
  stats: SavedStats;
  savedRun: SavedRun | null;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onStartSurvival: () => void;
  onStartFreeplay: (categories: CategoryId[] | 'all') => void;
  onResume: (run: SavedRun) => void;
  onDiscardRun: () => void;
}

export function HomeScreen({
  stats,
  savedRun,
  soundEnabled,
  onToggleSound,
  onStartSurvival,
  onStartFreeplay,
  onResume,
  onDiscardRun,
}: HomeScreenProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<Set<CategoryId>>(new Set());
  const lib = libraryStats();
  const level = levelProgress(stats.xp);

  const toggle = (id: CategoryId) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="absolute inset-0">
      <Backdrop />

      <div className="relative z-10 flex h-full flex-col overflow-y-auto">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-8 sm:pt-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-lg shadow-[0_0_20px_rgba(52,211,153,0.5)]">
              🗓️
            </span>
            <div className="leading-none">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.25em] text-white/45">Guess Masters</p>
              <p className="text-sm font-extrabold tracking-tight">Dates</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5" title={`${level.current} / ${level.needed} XP`}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-400 to-indigo-600 font-mono text-sm font-black shadow-[0_0_14px_rgba(129,140,248,0.6)]">
                {level.level}
              </div>
              <div className="hidden sm:block">
                <p className="text-[0.62rem] font-bold uppercase tracking-wider text-white/45">
                  {titleForLevel(level.level)}
                </p>
                <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-400 to-indigo-400"
                    style={{ width: `${Math.round(level.fraction * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleSound}
              className="h-9 w-9 rounded-lg text-base text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
              aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
              aria-pressed={soundEnabled}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 px-5 py-8 text-center">
          <div>
            <h1 className="text-shimmer text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl">
              GUESS THE DATE
            </h1>
            <p className="mx-auto mt-4 max-w-md text-sm text-white/55 sm:text-base">
              Name the year. Every year you’re off costs a heart. Survive as long as you can.
            </p>
          </div>

          {/* Rules in three numbers */}
          <div className="flex items-stretch justify-center gap-6 sm:gap-10">
            <Rule value={String(STARTING_HEALTH)} label="Health" tone="text-rose-300" />
            <Divider />
            <Rule value="−1" label="Per year off" tone="text-amber-300" />
            <Divider />
            <Rule value={`+${PERFECT_BONUS}`} label="Exact answer" tone="text-emerald-300" />
          </div>

          {/* Resume */}
          {savedRun && (
            <div className="animate-slide-up flex w-full max-w-md items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] px-4 py-3">
              <div className="text-left">
                <p className="text-sm font-bold text-amber-200">Run in progress</p>
                <p className="text-xs text-white/50">
                  Round <span className="font-mono font-bold text-white">{savedRun.round}</span> ·{' '}
                  <span className="font-mono font-bold text-white">{savedRun.health}</span> health
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={onDiscardRun} className="btn-ghost !py-2 !text-xs">
                  Discard
                </button>
                <button
                  type="button"
                  onClick={() => onResume(savedRun)}
                  className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-black shadow-[0_0_20px_rgba(251,191,36,0.5)] transition-all hover:brightness-110 active:scale-95"
                >
                  Resume ▶
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex w-full max-w-md flex-col items-center gap-3">
            <button type="button" onClick={onStartSurvival} className="btn-hero w-full !py-5 !text-lg">
              Play survival <span aria-hidden>→</span>
            </button>
            {stats.bestRounds > 0 && (
              <p className="text-xs text-white/45">
                Your best: <span className="font-mono text-sm font-black text-white">{stats.bestRounds}</span> rounds
              </p>
            )}
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="mt-2 text-sm font-semibold text-white/55 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              Freeplay — pick your topics, no score
            </button>
          </div>

          <p className="text-[0.65rem] text-white/30">
            {lib.total.toLocaleString()} questions · {lib.categories} categories · {lib.earliest}–{lib.latest}
          </p>
        </div>
      </div>

      <CategoryPicker
        open={pickerOpen}
        selected={selected}
        onToggle={toggle}
        onClear={() => setSelected(new Set())}
        onClose={() => setPickerOpen(false)}
        onPlay={(c) => {
          setPickerOpen(false);
          onStartFreeplay(c);
        }}
      />
    </div>
  );
}

function Rule({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`font-mono text-3xl font-black tabular-nums sm:text-4xl ${tone}`}>{value}</span>
      <span className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-white/45">{label}</span>
    </div>
  );
}

function Divider() {
  return <span className="w-px self-stretch bg-white/10" aria-hidden />;
}
