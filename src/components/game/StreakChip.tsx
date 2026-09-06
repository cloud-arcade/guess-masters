/**
 * StreakChip — consecutive close-or-better guesses.
 *
 * Silent below 2, warms up at 2, catches fire at 3+, and gets loud at 5+.
 */

interface StreakChipProps {
  streak: number;
}

export function StreakChip({ streak }: StreakChipProps) {
  if (streak < 2) {
    return (
      <div className="hidden sm:flex h-9 items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 text-xs font-semibold text-white/30">
        <span aria-hidden>🔥</span>
        <span className="font-mono tabular-nums">×{streak}</span>
      </div>
    );
  }

  const hot = streak >= 5;
  const warm = streak >= 3;

  return (
    <div
      key={streak}
      className={[
        'flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-extrabold tabular-nums animate-bounce-in',
        hot
          ? 'bg-gradient-to-r from-orange-400 to-rose-500 text-black shadow-[0_0_24px_rgba(251,146,60,0.7)]'
          : warm
            ? 'bg-gradient-to-r from-amber-300 to-orange-400 text-black shadow-[0_0_18px_rgba(251,191,36,0.5)]'
            : 'border border-amber-300/40 bg-amber-400/15 text-amber-200',
      ].join(' ')}
      aria-label={`Streak ${streak}`}
    >
      <span className={warm ? 'animate-flame' : ''} aria-hidden>
        🔥
      </span>
      <span className="font-mono">×{streak}</span>
      {hot && <span className="ml-0.5 hidden sm:inline tracking-wider">ON FIRE</span>}
    </div>
  );
}
