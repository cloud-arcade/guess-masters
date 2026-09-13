/**
 * CategoryStep — which topic you are on, and how far through the round.
 *
 * A round is a group of questions that climbs in difficulty, each step drawn
 * from a different category (see `buildOrder`). This names the step: the
 * category's icon, its label in the category accent, and a progress track so
 * the position in the round is visible at a glance. The track therefore reads
 * as a difficulty ramp — step 1 is the round's easiest, the last its hardest.
 *
 * Deliberately unboxed. As a glass panel it competed with the question below it
 * for attention; the accent colour and the track are enough to register without
 * another framed surface on screen.
 *
 * The track deliberately does NOT look like DigitSlots. Those are four separate
 * white rails under the digits, and a row of wide glowing bars here would read
 * as the same control. So this is one continuous, thinner, segmented rail in
 * the category's accent — joined rather than separated, tinted rather than
 * white, and it stretches to fill whatever space is left beside the clock.
 */

import { getCategory, type CategoryId } from '@/data';

interface CategoryStepProps {
  category: CategoryId;
  /** 1-based position within the round. */
  step: number;
  /** Questions in this round. */
  steps: number;
}

export function CategoryStep({ category, step, steps }: CategoryStepProps) {
  const meta = getCategory(category);

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="shrink-0 text-base sm:text-lg" aria-hidden>
        {meta.icon}
      </span>

      <span
        className={`min-w-0 truncate text-sm font-bold tracking-tight ${meta.accent.text}`}
      >
        {meta.label}
      </span>

      {/* Hairline between the topic and its progress, so the dots read as a
          separate readout rather than punctuation after the label. */}
      <span className="h-3 w-px shrink-0 bg-white/10" aria-hidden />

      {/* Progress dots, NOT rails. A row of wide horizontal bars here read as
          the same control as DigitSlots' four underlines directly below —
          same shape, same "fills as you go" meaning. Small round dots are
          unmistakably a different thing, and they sit on the baseline rather
          than spanning the width, so nothing competes with the digit entry.

          Nothing is pre-selected: the current step pulses in the category
          accent so "where am I" is the one thing moving on the line. Steps
          already answered are solid but dimmed; steps to come are hollow. */}
      <div
        className="flex shrink-0 items-center gap-1.5"
        aria-label={`Question ${step} of ${steps}`}
      >
        {Array.from({ length: steps }).map((_, i) => {
          const done = i < step - 1;
          const current = i === step - 1;
          return (
            <span
              key={i}
              className={[
                'block rounded-full transition-all duration-300',
                current
                  ? `h-2 w-2 animate-step-pulse bg-gradient-to-r ${meta.accent.from} ${meta.accent.to}`
                  : done
                    ? `h-1.5 w-1.5 bg-gradient-to-r ${meta.accent.from} ${meta.accent.to} opacity-40`
                    : 'h-1.5 w-1.5 bg-white/15',
              ].join(' ')}
            />
          );
        })}
      </div>
    </div>
  );
}
