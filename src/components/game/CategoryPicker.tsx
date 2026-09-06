/**
 * CategoryPicker — freeplay topic selection overlay.
 *
 * Colourful tiles in a responsive grid. Nothing selected means "everything".
 */

import { useEffect } from 'react';
import { CATEGORIES, ENTRIES_BY_CATEGORY, countFor, type CategoryId } from '@/data';

interface CategoryPickerProps {
  open: boolean;
  selected: Set<CategoryId>;
  onToggle: (id: CategoryId) => void;
  onClear: () => void;
  onClose: () => void;
  onPlay: (categories: CategoryId[] | 'all') => void;
}

export function CategoryPicker({ open, selected, onToggle, onClear, onClose, onPlay }: CategoryPickerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const chosen: CategoryId[] | 'all' = selected.size === 0 ? 'all' : [...selected];
  const count = countFor(chosen);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm animate-slide-up sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Choose topics"
      onClick={onClose}
    >
      <div
        className="glass flex max-h-full w-full max-w-4xl flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">Choose your topics</h2>
            <p className="text-xs text-white/45">
              Freeplay · pick as many as you like — none selected plays everything
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost h-9 w-9 !p-0" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            <button
              type="button"
              onClick={onClear}
              aria-pressed={selected.size === 0}
              className={[
                'group relative flex flex-col items-start gap-2 overflow-hidden rounded-2xl border p-3.5 text-left transition-all duration-150',
                selected.size === 0
                  ? 'border-white/40 bg-white/[0.12] ring-2 ring-white/50'
                  : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07]',
              ].join(' ')}
            >
              <span className="text-2xl" aria-hidden>
                🌍
              </span>
              <span className="text-sm font-bold">Everything</span>
              <span className="font-mono text-[0.65rem] text-white/40">{countFor('all')} questions</span>
            </button>

            {CATEGORIES.map((c) => {
              const on = selected.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onToggle(c.id)}
                  aria-pressed={on}
                  className={[
                    'group relative flex flex-col items-start gap-2 overflow-hidden rounded-2xl border p-3.5 text-left transition-all duration-150',
                    on
                      ? `border-white/30 ring-2 ${c.accent.ring} scale-[1.02]`
                      : 'border-white/[0.08] hover:scale-[1.02] hover:border-white/20',
                  ].join(' ')}
                >
                  <span
                    className={`absolute inset-0 bg-gradient-to-br ${c.accent.from} ${c.accent.to} transition-opacity duration-150 ${on ? 'opacity-30' : 'opacity-[0.08] group-hover:opacity-20'}`}
                  />
                  <span className="relative text-2xl drop-shadow" aria-hidden>
                    {c.icon}
                  </span>
                  <span className="relative text-sm font-bold">{c.label}</span>
                  <span className="relative font-mono text-[0.65rem] text-white/50">
                    {ENTRIES_BY_CATEGORY[c.id].length} questions
                  </span>
                  {on && (
                    <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[0.65rem] font-black text-black">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-4">
          <p className="text-xs text-white/50">
            <span className="font-bold text-white">{selected.size === 0 ? 'Everything' : `${selected.size} topic${selected.size === 1 ? '' : 's'}`}</span>
            {' · '}
            <span className="font-mono">{count}</span> questions
          </p>
          <button type="button" onClick={() => onPlay(chosen)} className="btn-hero !px-6 !py-3 !text-sm">
            Play freeplay →
          </button>
        </div>
      </div>
    </div>
  );
}
