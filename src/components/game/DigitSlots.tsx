/**
 * DigitSlots — the four-digit year display.
 *
 * One underlined slot per digit. The active slot glows, filled digits pop in,
 * and on reveal the slots colour-code against the answer.
 */

import { MAX_DIGITS } from '@/game/rules';
import type { Accuracy } from '@/game/rules';

interface DigitSlotsProps {
  digits: string;
  /** When set, the round has been revealed and slots are scored. */
  answer?: number;
  accuracy?: Accuracy;
  shake?: boolean;
}

export function DigitSlots({ digits, answer, accuracy, shake }: DigitSlotsProps) {
  const revealed = answer !== undefined;
  const answerDigits = revealed ? String(answer).padStart(MAX_DIGITS, '0') : '';
  const perfect = accuracy === 'perfect';

  return (
    <div
      className={`flex items-end justify-center gap-3 sm:gap-4 ${shake ? 'animate-shake' : ''}`}
      role="group"
      aria-label="Year guess"
    >
      {Array.from({ length: MAX_DIGITS }).map((_, i) => {
        const char = digits[i];
        const isActive = !revealed && i === digits.length;
        const correct = revealed && (perfect || char === answerDigits[i]);

        return (
          <div key={i} className="flex flex-col items-center gap-2">
            <div
              className={[
                'flex items-center justify-center',
                'h-16 w-12 sm:h-20 sm:w-16 lg:h-24 lg:w-[4.5rem]',
                'font-mono font-black tabular-nums',
                'text-5xl sm:text-6xl lg:text-7xl',
                'transition-colors duration-200',
                revealed ? (correct ? 'text-emerald-300' : 'text-rose-300') : 'text-white',
              ].join(' ')}
            >
              {char ? (
                <span className="animate-digit-pop">{char}</span>
              ) : isActive ? (
                <span className="animate-caret text-white/30">|</span>
              ) : null}
            </div>

            <div
              className={[
                'h-1 w-12 rounded-full transition-all duration-200 sm:w-16 lg:w-[4.5rem]',
                revealed
                  ? correct
                    ? 'bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]'
                    : 'bg-rose-400/70'
                  : isActive
                    ? 'bg-white shadow-[0_0_14px_rgba(255,255,255,0.7)]'
                    : char
                      ? 'bg-white/60'
                      : 'bg-white/15',
              ].join(' ')}
            />
          </div>
        );
      })}
    </div>
  );
}
