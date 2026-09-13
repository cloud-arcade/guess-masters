/**
 * DigitSlots — the four-digit year display.
 *
 * One underlined slot per digit. The active underline glows and breathes,
 * filled digits pop in, and on reveal the underlines colour-code against the
 * answer. No boxes — the underline keeps the numbers feeling light and lets
 * the digits themselves carry the weight.
 */

import { MAX_DIGITS } from '@/game/rules';
import type { Accuracy } from '@/game/rules';

interface DigitSlotsProps {
  digits: string;
  /** When set, the round has been revealed and slots are scored. */
  answer?: number;
  accuracy?: Accuracy;
  shake?: boolean;
  /**
   * Geometry in px, measured by the caller from the space the arena actually
   * has. Passed in rather than expressed as viewport units because the host
   * frame, the header and the keypad have already spent part of the window —
   * sizing from `vmin` here is what let the digits and their underlines crush
   * into the question on a small screen.
   */
  boxHeight: number;
  boxWidth: number;
  fontSize: number;
  gap: number;
}

export function DigitSlots({
  digits,
  answer,
  accuracy,
  shake,
  boxHeight,
  boxWidth,
  fontSize,
  gap,
}: DigitSlotsProps) {
  const revealed = answer !== undefined;
  const answerDigits = revealed ? String(answer).padStart(MAX_DIGITS, '0') : '';
  const perfect = accuracy === 'perfect';

  return (
    <div
      className={`flex items-end justify-center ${shake ? 'animate-shake' : ''}`}
      style={{ gap }}
      role="group"
      aria-label="Year guess"
    >
      {Array.from({ length: MAX_DIGITS }).map((_, i) => {
        const char = digits[i];
        const isActive = !revealed && i === digits.length;
        const correct = revealed && (perfect || char === answerDigits[i]);

        return (
          <div
            key={i}
            className="flex flex-col items-center"
            style={{ gap: Math.max(3, gap * 0.55) }}
          >
            <div
              className={[
                'flex items-center justify-center',
                'tabular-nums font-semibold leading-none tracking-[-0.02em]',
                'transition-colors duration-200',
                revealed ? (correct ? 'text-emerald-200' : 'text-rose-200') : 'text-white',
              ].join(' ')}
              style={{
                height: boxHeight,
                width: boxWidth,
                fontSize,
                ...(revealed
                  ? null
                  : { textShadow: '0 2px 18px rgba(255,255,255,0.22), 0 1px 2px rgba(0,0,0,0.5)' }),
              }}
            >
              {char ? <span className="animate-digit-pop">{char}</span> : null}
            </div>

            {/* The underline carries the state: a glowing rail that stretches
                under the active slot and colours on reveal. */}
            <div
              className="relative overflow-hidden rounded-full"
              style={{ height: 3, width: boxWidth }}
            >
              <div
                className={[
                  'absolute inset-0 rounded-full transition-all duration-300',
                  revealed
                    ? correct
                      ? 'bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.9)]'
                      : 'bg-rose-400/70'
                    : char
                      ? 'bg-white/70'
                      : 'bg-white/15',
                ].join(' ')}
              />
              {/* Active slot: a brighter rail that sweeps in and pulses, so the
                  caret is the underline rather than a blinking bar. */}
              {isActive && (
                <div
                  className="animate-rail absolute inset-0 rounded-full bg-white"
                  style={{ boxShadow: '0 0 18px rgba(255,255,255,0.95), 0 0 6px rgba(255,255,255,0.8)' }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
