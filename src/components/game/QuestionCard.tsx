/**
 * QuestionCard — the prompt, with its category badge and difficulty pips.
 *
 * Keyed on entry id by the caller so each new question animates in.
 */

import { getCategory, type DateEntry } from '@/data';

interface QuestionCardProps {
  entry: DateEntry;
}

export function QuestionCard({ entry }: QuestionCardProps) {
  const category = getCategory(entry.category);

  return (
    <div className="animate-question-in flex flex-col items-center gap-4 text-center">
      <div className="flex items-center gap-2.5">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wider ${category.accent.text}`}
        >
          <span aria-hidden>{category.icon}</span>
          {category.label}
        </span>

        <span className="flex items-center gap-0.5" aria-label={`Difficulty ${entry.difficulty} of 5`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={`h-1 w-2.5 rounded-full ${i < entry.difficulty ? 'bg-white/50' : 'bg-white/10'}`}
            />
          ))}
        </span>
      </div>

      <h2 className="max-w-2xl text-balance text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl lg:text-3xl">
        {entry.prompt}
      </h2>
    </div>
  );
}
