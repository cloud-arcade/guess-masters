/**
 * PlayScreen — the active round.
 *
 * Two columns on wide screens (question + slots left, keypad/reveal right),
 * stacked on narrow ones. The backdrop takes the active category's colour.
 * Full-screen flashes and toasts give each guess a physical response.
 *
 * Owns keyboard input for the whole play surface: digits type into the slots,
 * Backspace deletes, Enter locks in a guess or advances past the reveal.
 */

import { useEffect, useMemo, useState } from 'react';
import { getCategory } from '@/data';
import type { DateGameApi } from '@/hooks/useDateGame';
import { Backdrop } from '../game/Backdrop';
import { DigitSlots } from '../game/DigitSlots';
import { HealthBar } from '../game/HealthBar';
import { Keypad } from '../game/Keypad';
import { QuestionCard } from '../game/QuestionCard';
import { ResultReveal } from '../game/ResultReveal';
import { StreakChip } from '../game/StreakChip';

interface PlayScreenProps {
  game: DateGameApi;
  onQuit: () => void;
}

interface Toast {
  id: number;
  text: string;
  tone: 'fire' | 'gold' | 'ice';
}

export function PlayScreen({ game, onQuit }: PlayScreenProps) {
  const { phase, mode, health, round, entry, digits, result, canSubmit, streak, history } = game;
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
    if (streak === 5) fresh.push({ id: Date.now() + 1, text: 'ON FIRE 🔥 ×5', tone: 'fire' });
    if (streak === 10) fresh.push({ id: Date.now() + 2, text: 'UNSTOPPABLE ☄️ ×10', tone: 'gold' });
    if (fresh.length) setToasts((t) => [...t, ...fresh]);
  }, [phase, result, streak]);

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

  if (!entry || !category) return null;

  const revealing = phase === 'revealing';
  const fatal = revealing && mode === 'survival' && Boolean(result?.fatal);
  const flashKey = history.length;
  const heal = revealing && result && (result.accuracy === 'perfect' || result.accuracy === 'close');
  const hit = revealing && result && !heal && result.delta > 0;

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
        {/* HUD */}
        <header className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 pt-4 sm:gap-6 sm:px-8 sm:pt-5">
          <div className="flex shrink-0 items-baseline gap-1.5 leading-none">
            <span className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-white/40">Round</span>
            <span key={round} className="animate-tick font-mono text-2xl font-black tabular-nums sm:text-3xl">
              {round}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            {mode === 'survival' ? (
              <HealthBar
                health={health}
                lastDamage={result?.damage}
                lastBonus={result?.bonus}
                changeKey={flashKey}
                compact
              />
            ) : (
              <div className="text-center text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/35">
                Freeplay · no score
              </div>
            )}
          </div>

          <StreakChip streak={streak} />

          <button
            type="button"
            onClick={onQuit}
            className="h-9 shrink-0 rounded-lg px-3 text-xs font-semibold text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
            title={mode === 'survival' ? 'Save and quit — you can resume from the menu' : 'End session'}
          >
            {mode === 'survival' ? 'Quit' : 'End'}
          </button>
        </header>

        {/* Arena */}
        <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-8 overflow-y-auto px-4 py-6 sm:px-8 lg:grid-cols-[1.25fr_1fr] lg:gap-12">
          <div className="flex flex-col items-center gap-8 lg:gap-10">
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
                onNext={next}
                nextLabel={fatal ? 'See results' : 'Next round'}
              />
            ) : (
              <div className="mx-auto w-full max-w-xs">
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
