/**
 * ResultReveal — the payoff after each guess.
 *
 * Clean centred text: verdict, the answer, the health change, an optional
 * fact, and the continue button. No box — the flash and the digit colours do
 * the framing.
 */

import type { RoundResult } from '@/game/rules';

interface ResultRevealProps {
  result: RoundResult;
  mode: 'survival' | 'freeplay';
  onNext: () => void;
  /** Label for the continue button — "Next" or "See results". */
  nextLabel: string;
}

const PRESENTATION: Record<RoundResult['accuracy'], { headline: string; text: string; badge: string }> = {
  perfect: { headline: 'EXACT!', text: 'text-emerald-300', badge: 'bg-emerald-400 text-black' },
  close: { headline: 'So close!', text: 'text-teal-300', badge: 'bg-teal-400 text-black' },
  good: { headline: 'Not bad', text: 'text-amber-300', badge: 'bg-amber-400 text-black' },
  off: { headline: 'Way off', text: 'text-orange-300', badge: 'bg-orange-400 text-black' },
  wild: { headline: 'Ouch.', text: 'text-rose-300', badge: 'bg-rose-500 text-white' },
};

export function ResultReveal({ result, mode, onNext, nextLabel }: ResultRevealProps) {
  const style = PRESENTATION[result.accuracy];
  const { entry, delta, damage, bonus, fatal } = result;

  return (
    <div className="animate-slide-up mx-auto flex w-full max-w-sm flex-col items-center gap-4 text-center">
      <p className={`text-3xl font-black tracking-tight ${style.text}`}>{style.headline}</p>

      <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider tabular-nums ${style.badge}`}>
        {delta === 0 ? 'Spot on' : `${delta} ${delta === 1 ? 'year' : 'years'} off`}
      </span>

      <p className="text-sm text-white/55">
        The answer was <span className="font-mono text-2xl font-black text-white">{entry.year}</span>
      </p>

      {mode === 'survival' && (
        <div className="flex items-center gap-3 font-mono text-base font-black tabular-nums">
          {damage > 0 && <span className="text-rose-300">−{damage} ❤️</span>}
          {bonus > 0 && <span className="text-emerald-300">+{bonus} ❤️</span>}
          {damage === 0 && bonus === 0 && <span className="text-white/40">No change</span>}
          {fatal && (
            <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[0.65rem] uppercase tracking-wider text-rose-200">
              Fatal
            </span>
          )}
        </div>
      )}

      {entry.fact && (
        <p className="max-w-xs text-xs leading-relaxed text-white/45">
          <span className="mr-1">💡</span>
          {entry.fact}
        </p>
      )}

      <button
        type="button"
        onClick={onNext}
        autoFocus
        className={`mt-1 w-full ${fatal ? 'btn-ghost !py-3.5 !text-sm !font-black uppercase tracking-wide' : 'btn-hero !py-3.5 !text-sm'}`}
      >
        {nextLabel} <span aria-hidden>{fatal ? '→' : '⏎'}</span>
      </button>
    </div>
  );
}
