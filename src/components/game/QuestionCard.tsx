/**
 * QuestionCard — the prompt itself.
 *
 * Keyed on entry id by the caller so each new question animates in.
 *
 * The category and its step live in CategoryStep above this, which owns the
 * whole "where am I" line; repeating them here only split the player's
 * attention between two versions of the same information. Difficulty is no
 * longer surfaced at all during play — it was one more thing to read on a
 * clock, and it never changed how the question was answered.
 */

import type { DateEntry } from '@/data';

interface QuestionCardProps {
  entry: DateEntry;
}

export function QuestionCard({ entry }: QuestionCardProps) {
  return (
    <div className="animate-question-in flex flex-col items-center text-center">
      <h2
        className="max-w-2xl text-balance font-bold leading-snug tracking-tight text-white"
        // Inline, not a Tailwind arbitrary value: two attempts at
        // text-[clamp(...)] with a calc() inside were silently dropped by the
        // scanner, leaving the prompt with no font-size at all. An inline style
        // bypasses the scanner entirely and cannot fail that way.
        style={{ fontSize: 'clamp(0.95rem, calc(2.4vmin + 0.55rem), 1.875rem)' }}
      >
        {entry.prompt}
      </h2>
    </div>
  );
}
