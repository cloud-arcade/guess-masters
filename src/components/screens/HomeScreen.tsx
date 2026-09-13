/**
 * HomeScreen — the lobby.
 *
 * One clean centred column: title, the rules in three numbers, a single big
 * Survival button, and Freeplay as a quieter secondary action. The top bar
 * carries the player's name and the sound toggle — scoring and ranking are the
 * platform's job, so nothing of the sort is kept or shown locally.
 *
 * Survival always plays the full library, because the platform has a single
 * leaderboard and mixing filtered runs into it would make the scores
 * incomparable. Freeplay is where category filters apply.
 */

import { useEffect, useState } from 'react';
import type { CategoryId } from '@/data';
import type { SavedRun } from '@/game/storage';
import { PERFECT_BONUS, ROUND_SECONDS, STARTING_HEALTH } from '@/game/rules';
import { Backdrop } from '../game/Backdrop';
import { CategoryPicker } from '../game/CategoryPicker';
import { PlayerBar } from '../game/PlayerBar';

interface HomeScreenProps {
  savedRun: SavedRun | null;
  /** Platform display name; null when playing standalone. */
  userName: string | null;
  soundEnabled: boolean;
  onToggleSound: () => void;
  /** Master sound level, 0..1. */
  volume: number;
  onVolumeChange: (value: number) => void;
  onStartSurvival: () => void;
  onStartFreeplay: (categories: CategoryId[] | 'all') => void;
  onResume: (run: SavedRun) => void;
}

export function HomeScreen({
  savedRun,
  userName,
  soundEnabled,
  onToggleSound,
  volume,
  onVolumeChange,
  onStartSurvival,
  onStartFreeplay,
  onResume,
}: HomeScreenProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<Set<CategoryId>>(new Set());
  /** Starting a fresh survival run would overwrite a saved one — ask first. */
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!confirmOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmOpen]);

  // A saved run is only at risk from a *new* survival run; freeplay leaves it
  // untouched, so it starts without asking.
  const startSurvival = () => {
    if (savedRun) setConfirmOpen(true);
    else onStartSurvival();
  };

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
        {/* Top bar — full-bleed bar, contained contents. */}
        <header className="w-full shrink-0 border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-lg shadow-[0_0_20px_rgba(52,211,153,0.5)]">
                🗓️
              </span>
              <div className="min-w-0 leading-none">
                <p className="truncate text-[0.62rem] font-bold uppercase tracking-[0.25em] text-white/45">
                  Guess Masters
                </p>
                <p className="truncate text-sm font-extrabold tracking-tight">Dates</p>
              </div>
            </div>

            <PlayerBar
              userName={userName}
              soundEnabled={soundEnabled}
              onToggleSound={onToggleSound}
              volume={volume}
              onVolumeChange={onVolumeChange}
            />
          </div>
        </header>

        {/* Body */}
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-7 px-4 py-8 text-center sm:gap-8 sm:px-6">
          <div>
            <h1 className="text-shimmer text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl">
              GUESS THE DATE
            </h1>
            <p className="mx-auto mt-4 max-w-md text-sm text-white/55 sm:text-base">
              Name the year before the clock runs out. Every year you’re off costs 1Health Point.
            </p>
          </div>

          {/* The survival ruleset — four numbers on open space. Still no frame
              or background; separation comes from a hairline between each pair,
              which reads as clean division rather than as a box. */}
          <div className="w-full max-w-md">
            <p className="mb-3 text-center text-[0.6rem] font-bold uppercase tracking-[0.22em] text-white/30">
              Survival rules
            </p>
            <div className="grid grid-cols-4">
              <Rule value={String(STARTING_HEALTH)} label="Health" tone="text-rose-300" />
              <Rule value="−1" label="Per year" tone="text-amber-300" />
              <Rule value={`+${PERFECT_BONUS}`} label="Exact" tone="text-emerald-300" />
              <Rule value={`${ROUND_SECONDS}s`} label="Per question" tone="text-cyan-300" />
            </div>
          </div>

          {/* Actions — one stack, tightly spaced, so the choices read as a set
              rather than as scattered controls.

              Resume leads when a run exists: it is the thing that player is
              most likely here to do, and it takes the hero surface so the pair
              never shows two competing filled buttons. Play survival then steps
              back to the secondary surface at the same height, so the two are
              siblings rather than a button and a card.

              Freeplay carries no button surface at all: text between two
              hairlines, at the same weight as the rules above, so the lobby
              reads as one divided system. Still a real button, so it keeps its
              hit area and focus ring. */}
          <div className="flex w-full max-w-md flex-col gap-2.5">
            {savedRun && (
              <button
                type="button"
                onClick={() => onResume(savedRun)}
                className="animate-slide-up btn-hero w-full !flex-col !gap-0.5 !py-4"
              >
                <span className="flex items-center gap-2 text-base leading-none">
                  <span className="h-1.5 w-1.5 rounded-full bg-black/40 animate-pulse-fast" aria-hidden />
                  Resume run <span aria-hidden>▶</span>
                </span>
                <span className="text-[0.65rem] font-bold normal-case tracking-normal text-black/55">
                  Round {savedRun.round} · {savedRun.health} health
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={startSurvival}
              className={savedRun ? 'btn-secondary w-full !py-4 !text-base' : 'btn-hero w-full !py-5 !text-lg'}
            >
              {savedRun ? 'New run' : 'Play survival'} <span aria-hidden>→</span>
            </button>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="group flex w-full items-center gap-3 rounded-xl py-1 text-white/60 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60"
            >
              <span className="h-px flex-1 bg-white/[0.08] transition-colors group-hover:bg-white/20" aria-hidden />
              <span className="shrink-0 text-sm font-semibold">
                <span aria-hidden>🎯</span> Freeplay
                <span className="ml-1 font-medium text-white/35 transition-colors group-hover:text-white/55">
                  · pick topics, untimed
                </span>
              </span>
              <span className="h-px flex-1 bg-white/[0.08] transition-colors group-hover:bg-white/20" aria-hidden />
            </button>

          </div>

        </div>
      </div>

      {/* Overwrite guard. Same shell as the category picker so the lobby has
          one dialog language: scrim, glass panel, escape and click-away.
          Resuming leads — it is the non-destructive choice and almost always
          what someone wants after seeing what they are about to lose. */}
      {confirmOpen && savedRun && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          style={{ animation: 'scrim-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
          role="dialog"
          aria-modal="true"
          aria-label="Start a new run?"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="glass-panel w-full max-w-sm overflow-hidden"
            style={{ animation: 'panel-in 420ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-5 text-center">
              <h2 className="text-lg font-bold tracking-tight">Start a new run?</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                You have a run in progress at{' '}
                <span className="font-mono font-bold text-white">round {savedRun.round}</span> with{' '}
                <span className="font-mono font-bold text-white">{savedRun.health}</span> health.
                Starting a new one replaces it — the saved run cannot be recovered.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 px-5 pb-5">
              {/* No "resume" here any more. The lobby now offers Resume as the
                  leading button directly above New run, so repeating it would
                  be asking the player to reconsider a choice they just made.
                  This dialog exists only to state what is lost and confirm. */}
              <button
                type="button"
                autoFocus
                onClick={() => {
                  setConfirmOpen(false);
                  onStartSurvival();
                }}
                className="btn-secondary w-full !py-3.5"
              >
                Start new · replace it
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="group flex w-full items-center gap-3 rounded-xl py-1 text-white/50 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60"
              >
                <span className="h-px flex-1 bg-white/[0.08] transition-colors group-hover:bg-white/20" aria-hidden />
                <span className="shrink-0 text-sm font-semibold">Cancel</span>
                <span className="h-px flex-1 bg-white/[0.08] transition-colors group-hover:bg-white/20" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      )}

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

/**
 * One rule, unboxed. The numbers carry themselves — framing each one made the
 * lobby read as a grid of boxes competing with the buttons below.
 *
 * Separation is a single hairline on the left edge, suppressed on the first
 * tile so the row is divided rather than enclosed. ResultsScreen's `Stat` uses
 * the same rule at the same weight, so the two screens read as one system.
 */
function Rule({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center border-l border-white/[0.08] px-1 first:border-l-0">
      <span className={`text-lg font-semibold tabular-nums sm:text-2xl ${tone}`}>{value}</span>
      <span className="mt-1 w-full truncate text-center text-[0.5rem] font-semibold uppercase tracking-[0.1em] text-white/40 sm:text-[0.58rem]">
        {label}
      </span>
    </div>
  );
}
