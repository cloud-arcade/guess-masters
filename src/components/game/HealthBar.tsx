/**
 * HealthBar — animated survival meter.
 *
 * Two stacked fills: a fast foreground bar showing current health, and a slower
 * "ghost" bar that drains behind it so the player sees exactly how much a bad
 * guess cost. Colour shifts from green through amber to red as health falls.
 *
 * The floating +/− numbers are keyed on `changeKey` (the round they belong to),
 * not on the health value — two rounds landing on the same health must both
 * animate.
 */

import { useEffect, useRef, useState } from 'react';
import { STARTING_HEALTH } from '@/game/rules';

interface HealthBarProps {
  health: number;
  /** Damage applied this round, shown as a floating number. */
  lastDamage?: number;
  lastBonus?: number;
  /** Changes once per round so repeated equal values still animate. */
  changeKey: number;
  compact?: boolean;
}

export function HealthBar({ health, lastDamage, lastBonus, changeKey, compact }: HealthBarProps) {
  const pct = Math.max(0, Math.min(100, (health / STARTING_HEALTH) * 100));
  const [ghostPct, setGhostPct] = useState(pct);
  const timerRef = useRef<number | undefined>(undefined);

  // The ghost bar lags behind so the drop is legible. It only ever trails a
  // *drop*; on a heal it snaps up with the bar so it never paints a red band
  // over gained health.
  useEffect(() => {
    window.clearTimeout(timerRef.current);
    if (pct >= ghostPct) {
      setGhostPct(pct);
      return;
    }
    timerRef.current = window.setTimeout(() => setGhostPct(pct), 380);
    return () => window.clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct]);

  const tone =
    pct > 60
      ? { bar: 'from-emerald-400 via-emerald-400 to-teal-400', glow: 'shadow-[0_0_18px_rgba(52,211,153,0.55)]', text: 'text-emerald-300' }
      : pct > 30
        ? { bar: 'from-amber-300 via-amber-400 to-orange-500', glow: 'shadow-[0_0_18px_rgba(251,191,36,0.5)]', text: 'text-amber-300' }
        : { bar: 'from-rose-400 via-rose-500 to-red-600', glow: 'shadow-[0_0_22px_rgba(244,63,94,0.6)]', text: 'text-rose-300' };

  const critical = pct <= 20;

  return (
    <div className="w-full">
      <div className={`flex items-baseline justify-between ${compact ? 'mb-1' : 'mb-1.5'}`}>
        <span className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/45">
          <span className={`${critical ? 'animate-heartbeat' : ''}`} aria-hidden>
            ❤️
          </span>
          Health
        </span>

        <div className="relative flex items-baseline gap-2">
          {lastBonus ? (
            <span
              key={`bonus-${changeKey}`}
              className="animate-float-up text-sm font-extrabold text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
            >
              +{lastBonus}
            </span>
          ) : null}
          {lastDamage ? (
            <span
              key={`dmg-${changeKey}`}
              className="animate-float-up text-sm font-extrabold text-rose-300 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]"
            >
              −{lastDamage}
            </span>
          ) : null}
          <span
            className={`font-mono text-base font-extrabold tabular-nums ${tone.text} ${critical ? 'animate-pulse-fast' : ''}`}
          >
            {health}
            <span className="text-white/25">/{STARTING_HEALTH}</span>
          </span>
        </div>
      </div>

      <div
        className={`relative w-full overflow-hidden rounded-full bg-white/[0.07] ring-1 ring-white/[0.06] ${compact ? 'h-2.5' : 'h-3.5'}`}
      >
        {/* Ghost — drains slowly to reveal the size of the hit */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-rose-500/45 transition-[width] duration-700 ease-out"
          style={{ width: `${ghostPct}%` }}
        />
        {/* Actual health */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${tone.bar} ${tone.glow} transition-[width] duration-300 ease-out`}
          style={{ width: `${pct}%` }}
        >
          <div className="absolute inset-0 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.35),transparent_55%)]" />
        </div>
      </div>
    </div>
  );
}
