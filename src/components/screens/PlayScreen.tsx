/**
 * PlayScreen — the active round.
 *
 * Two columns on wide screens (question + slots left, keypad/reveal right),
 * stacked on narrow ones. The backdrop takes the active category's colour.
 * Full-screen flashes and toasts give each guess a physical response.
 *
 * Owns keyboard input for the whole play surface: digits type into the slots,
 * Backspace deletes, Enter locks in a guess or advances past the reveal.
 *
 * Layout: the HUD is a full-bleed bar whose contents are constrained to the
 * same max width as the arena below it, so the bar spans the viewport while
 * everything inside reads as one contained column.
 *
 * Two surfaces, and only two:
 *   Header — the run's own state, fixed at the top and isolated: the round,
 *            the way out, and the health draining directly beneath them. One
 *            blurred, bordered block, and the only such surface on the screen.
 *            It never changes shape, so it holds still while the game moves.
 *   Arena  — everything about the current question. It opens with a bare line
 *            giving the topic, the step dots and the clock — no band, no card,
 *            nothing framed — then the question, the digits and the keypad.
 *
 * The split is by what changes: the header is the run, the arena is the
 * question. One clock, in one place, at the top of the arena where the player
 * is already looking to see where they are.
 *
 * Freeplay is untimed — no deadline is ever set — but the dial stays, marked
 * unlimited, so the line does not reflow between modes and the absence of a
 * clock is stated rather than inferred from a gap. The low-time vignette is
 * survival's alone: there is no pressure in freeplay to convey.
 */

import { useEffect, useMemo, useState } from 'react';
import { getCategory } from '@/data';
import type { DateGameApi } from '@/hooks/useDateGame';
import { Backdrop } from '../game/Backdrop';
import { CategoryStep } from '../game/CategoryStep';
import { CountdownRing } from '../game/CountdownRing';
import { PlayerBar } from '../game/PlayerBar';
import { DigitSlots } from '../game/DigitSlots';
import { HealthBar } from '../game/HealthBar';
import { Keypad } from '../game/Keypad';
import { QuestionCard } from '../game/QuestionCard';
import { ResultReveal } from '../game/ResultReveal';

interface PlayScreenProps {
  game: DateGameApi;
  /** Platform display name; null when playing standalone. */
  userName: string | null;
  soundEnabled: boolean;
  onToggleSound: () => void;
  /** Master sound level, 0..1. */
  volume: number;
  onVolumeChange: (value: number) => void;
  onQuit: () => void;
  /** Start a fresh run — offered on the reveal once a run has ended. */
  onPlayAgain: () => void;
}

/**
 * The countdown dial draws an SVG from a pixel size, so it cannot take a CSS
 * clamp() the way the rest of the arena does. Size it against the smaller
 * window axis instead, floored so it stays legible in a small embedded frame.
 */
function ringSizeFor(): number {
  if (typeof window === 'undefined') return 44;
  const vmin = Math.min(window.innerWidth, window.innerHeight);
  return Math.round(Math.max(26, Math.min(44, vmin * 0.075)));
}

interface Toast {
  id: number;
  text: string;
  tone: 'fire' | 'gold' | 'ice';
}

export function PlayScreen({
  game,
  userName,
  soundEnabled,
  onToggleSound,
  volume,
  onVolumeChange,
  onQuit,
  onPlayAgain,
}: PlayScreenProps) {
  const { phase, mode, health, round, entry, digits, result, canSubmit, streak, history } = game;
  const { roundsSurvived, bestStreak } = game;

  /**
   * How the run has gone so far. Shown on the reveal when a run ends, so the
   * player gets the shape of it without leaving the screen — the results page
   * still owns the deeper breakdown.
   */
  const runSummary = useMemo(() => {
    const perfect = history.filter((r) => r.accuracy === 'perfect').length;
    const avgDelta =
      history.length > 0 ? history.reduce((sum, r) => sum + r.delta, 0) / history.length : 0;
    return { perfect, avgDelta };
  }, [history]);
  const { remaining, roundSeconds, timed, timedOut, categoryStep, categorySteps } = game;
  const { pushDigit, popDigit, submit, next } = game;

  const [toasts, setToasts] = useState<Toast[]>([]);

  // Physical keyboard, available alongside the on-screen keypad.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        pushDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        popDigit();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (phase === 'asking' && canSubmit) submit();
        else if (phase === 'revealing') next();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, canSubmit, pushDigit, popDigit, submit, next]);

  // Milestone toasts — streak and round.
  useEffect(() => {
    if (phase !== 'revealing' || !result) return;
    const fresh: Toast[] = [];
    if (streak === 3) fresh.push({ id: Date.now(), text: 'Streak ×3 — warming up', tone: 'fire' });
    if (streak === 5) fresh.push({ id: Date.now() + 1, text: 'ON FIRE ×5', tone: 'fire' });
    if (streak === 10) fresh.push({ id: Date.now() + 2, text: 'UNSTOPPABLE ☄️ ×10', tone: 'gold' });
    if (fresh.length) setToasts((t) => [...t, ...fresh]);
  }, [phase, result, streak]);

  useEffect(() => {
    if (phase !== 'revealing' || !timedOut) return;
    setToasts((t) => [...t, { id: Date.now() + 4, text: '⏱ Time is up', tone: 'fire' }]);
  }, [phase, timedOut]);

  useEffect(() => {
    if (phase !== 'asking' || round === 1 || round % 10 !== 0) return;
    const id = Date.now() + 3;
    setToasts((t) => [...t, { id, text: `Round ${round} 🏁`, tone: 'ice' }]);
  }, [phase, round]);

  useEffect(() => {
    if (!toasts.length) return;
    const t = window.setTimeout(() => setToasts((all) => all.slice(1)), 1600);
    return () => window.clearTimeout(t);
  }, [toasts]);

  const category = useMemo(() => (entry ? getCategory(entry.category) : null), [entry]);

  // Re-measured on resize so an embedded frame gets a dial in proportion to
  // everything around it.
  const [ringSize, setRingSize] = useState(() => ringSizeFor());
  useEffect(() => {
    const onResize = () => setRingSize(ringSizeFor());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!entry || !category) return null;

  const revealing = phase === 'revealing';
  const fatal = revealing && mode === 'survival' && Boolean(result?.fatal);
  const flashKey = history.length;
  const heal = revealing && result && (result.accuracy === 'perfect' || result.accuracy === 'close');
  const hit = revealing && result && !heal && result.delta > 0;
  // Only while the player can still act on it, and only where a clock exists.
  const lowTime = timed && phase === 'asking' && remaining <= 10;

  return (
    <div className="absolute inset-0">
      <Backdrop tint={`${category.accent.from} ${category.accent.to}`} density="calm" />

      {/* Flashes */}
      {hit && (
        <div
          key={`hit-${flashKey}`}
          className="pointer-events-none absolute inset-0 z-20 animate-flash-hit"
          style={{
            background:
              result.accuracy === 'wild'
                ? 'radial-gradient(ellipse at center, transparent 30%, rgba(244,63,94,0.55) 100%)'
                : 'radial-gradient(ellipse at center, transparent 45%, rgba(244,63,94,0.32) 100%)',
          }}
          aria-hidden
        />
      )}
      {heal && (
        <div
          key={`heal-${flashKey}`}
          className="pointer-events-none absolute inset-0 z-20 animate-flash-heal"
          style={{
            background:
              result.accuracy === 'perfect'
                ? 'radial-gradient(ellipse at center, rgba(52,211,153,0.28) 0%, transparent 70%)'
                : 'radial-gradient(ellipse at center, rgba(45,212,191,0.16) 0%, transparent 70%)',
          }}
          aria-hidden
        />
      )}

      {/* Running out of time — the edges close in. */}
      {lowTime && (
        <div
          className="animate-time-warn pointer-events-none absolute inset-0 z-20"
          style={{
            background:
              remaining <= 5
                ? 'radial-gradient(ellipse at center, transparent 45%, rgba(244,63,94,0.35) 100%)'
                : 'radial-gradient(ellipse at center, transparent 55%, rgba(251,191,36,0.2) 100%)',
          }}
          aria-hidden
        />
      )}

      {/* Toasts */}
      <div className="pointer-events-none absolute inset-x-0 top-20 z-30 flex flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              'animate-toast-in rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider shadow-lg',
              t.tone === 'fire' && 'bg-gradient-to-r from-orange-400 to-rose-500 text-black',
              t.tone === 'gold' && 'bg-gradient-to-r from-amber-300 to-yellow-500 text-black',
              t.tone === 'ice' && 'bg-gradient-to-r from-cyan-300 to-sky-500 text-black',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {t.text}
          </div>
        ))}
      </div>

      <div className="relative z-10 flex h-full flex-col">
        {/* Header — run state, fixed at the top and isolated.
            The round count on the left, the player on the right, and the health
            draining beneath them: one blurred, bordered block, the only such
            surface on the screen. It never changes shape, so it can sit still
            while everything below it changes with the question.

            The streak is deliberately not here. It already announces itself
            through the milestone toasts and the reveal's run summary, and a
            third live copy in the header was one more number to track. */}
        <header className="w-full shrink-0 border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 pt-3 sm:gap-5 sm:px-6">
            <div className="flex shrink-0 items-baseline gap-1.5 leading-none">
              <span className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-white/40">
                Round
              </span>
              <span key={round} className="animate-tick text-lg font-semibold tabular-nums sm:text-xl">
                {round}
              </span>
            </div>

            {/* Profile sits top right, the round count opposite it on the left.
                No exit here: the way out lives on the reveal between rounds,
                where stopping is a natural choice — in the header it was a
                permanent control inviting a mis-tap mid-question. */}
            <div className="ml-auto flex items-center">
              <PlayerBar
                userName={userName}
                soundEnabled={soundEnabled}
                onToggleSound={onToggleSound}
                volume={volume}
                onVolumeChange={onVolumeChange}
                leading={
                  <button
                    type="button"
                    onClick={onQuit}
                    className="glass-key flex h-9 items-center justify-center !rounded-full px-3.5 text-xs font-semibold text-white/70 transition-colors hover:text-white"
                    title={
                      mode === 'survival'
                        ? 'Main menu — this run is saved, so you can resume it'
                        : 'Main menu — ends this freeplay session'
                    }
                  >
                    Menu
                  </button>
                }
              />
            </div>
          </div>

          {/* Health, still inside the block — the run's other number, directly
              under the row it belongs to, spanning the full width so it reads
              at a glance. */}
          <div className="mx-auto w-full max-w-5xl px-4 pb-3 pt-2.5 sm:px-6">
            {mode === 'survival' ? (
              <HealthBar
                health={health}
                lastDamage={result?.damage}
                lastBonus={result?.bonus}
                changeKey={flashKey}
              />
            ) : (
              <div className="text-center text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/35">
                Freeplay · no score
              </div>
            )}
          </div>
        </header>

        {/* Arena */}
        <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-[clamp(0.5rem,2vmin,2rem)] px-[clamp(0.75rem,3vw,1.5rem)] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[clamp(0.5rem,2vmin,2rem)] lg:grid lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-14 lg:py-10">
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[clamp(0.5rem,2.2vmin,2.25rem)] lg:flex-none">
            {/* Where you are — a bare line above the question, not a band.
                Just the topic, a few dots and the clock: no border, no blur,
                no card, nothing to compete with the question underneath.

                Centred and shrunk to its contents rather than spanning the
                width: the question and digits below are both centred columns,
                so pinning the topic left and the clock right made this read as
                a separate bar across the top instead of the head of one column. */}
            <div
              key={entry.category}
              className="animate-slide-up flex max-w-full items-center justify-center gap-4"
            >
              <CategoryStep category={entry.category} step={categoryStep} steps={categorySteps} />

              {/* Freeplay keeps the dial but marks it unlimited, so the line
                  does not reflow between modes and the absence of a clock is
                  stated rather than left to be inferred from a gap. */}
              <CountdownRing
                remaining={revealing ? 0 : remaining}
                total={roundSeconds}
                paused={revealing}
                size={ringSize}
                unlimited={!timed}
              />
            </div>

            <div key={entry.id} className="w-full">
              <QuestionCard entry={entry} />
            </div>

            <DigitSlots
              digits={digits}
              answer={revealing ? entry.year : undefined}
              accuracy={result?.accuracy}
              shake={revealing && (result?.accuracy === 'wild' || result?.accuracy === 'off')}
            />
          </div>

          <div className="w-full">
            {revealing && result ? (
              <ResultReveal
                result={result}
                mode={mode}
                timedOut={timedOut}
                onNext={next}
                nextLabel={fatal ? 'See results' : 'Next round'}
                onPlayAgain={onPlayAgain}
                onExit={onQuit}
                roundsSurvived={roundsSurvived}
                bestStreak={Math.max(bestStreak, streak)}
                perfectCount={runSummary.perfect}
                avgDelta={runSummary.avgDelta}
              />
            ) : (
              <div className="mx-auto w-full max-w-[22rem] shrink-0 sm:max-w-xs">
                <Keypad
                  onDigit={pushDigit}
                  onDelete={popDigit}
                  onSubmit={submit}
                  canSubmit={canSubmit}
                  disabled={phase !== 'asking'}
                />
                <p className="mt-3 text-center text-[0.65rem] text-white/35">
                  Type a 4-digit year · <kbd className="rounded bg-white/10 px-1">Enter</kbd> to lock in
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
