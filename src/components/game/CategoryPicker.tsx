/**
 * CategoryPicker — freeplay topic selection overlay.
 *
 * Frosted tiles in a responsive grid. Nothing selected means "everything".
 *
 * The entrance is deliberately staged: the scrim's blur ramps while the panel
 * rises with a slight overshoot and the tiles stagger in behind it. Popping
 * all three at once is what made this read flat.
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

  // Cap the stagger so a long category list never delays the last tile past
  // the panel's own entrance.
  const tileDelay = (i: number) => `${Math.min(i * 22, 260)}ms`;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 p-3 sm:p-6"
      style={{ animation: 'scrim-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
      role="dialog"
      aria-modal="true"
      aria-label="Choose topics"
      onClick={onClose}
    >
      <div
        className="glass-panel flex max-h-full w-full max-w-4xl flex-col overflow-hidden"
        style={{ animation: 'panel-in 420ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.09] px-5 py-4 sm:px-6 sm:py-5">
          <div>
            <h2 className="text-lg font-bold tracking-tight sm:text-xl">Choose your topics</h2>
            <p className="mt-0.5 text-xs text-white/50">
              Freeplay · pick as many as you like — none selected plays everything
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="glass-key flex h-9 w-9 shrink-0 items-center justify-center text-sm text-white/70"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            <button
              type="button"
              onClick={onClear}
              aria-pressed={selected.size === 0}
              className="glass-tile glass-key group relative flex flex-col items-start gap-1.5 overflow-hidden p-3.5 text-left"
              style={{
                animation: `tile-in 360ms cubic-bezier(0.22, 1, 0.36, 1) both`,
                animationDelay: tileDelay(0),
                ...(selected.size === 0
                  ? {
                      borderColor: 'rgba(255,255,255,0.5)',
                      background:
                        'linear-gradient(165deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0.03) 100%)',
                      boxShadow:
                        'inset 0 1px 0 rgba(255,255,255,0.45), 0 0 28px -8px rgba(255,255,255,0.5), 0 10px 28px -12px rgba(0,0,0,0.8)',
                    }
                  : {}),
              }}
            >
              <span className="text-2xl drop-shadow" aria-hidden>
                🌍
              </span>
              <span className="text-sm font-bold">Everything</span>
              <span className="text-[0.65rem] tabular-nums text-white/45">{countFor('all')} questions</span>
              {selected.size === 0 && <Check />}
            </button>

            {CATEGORIES.map((c, i) => {
              const on = selected.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onToggle(c.id)}
                  aria-pressed={on}
                  className="glass-tile glass-key group relative flex flex-col items-start gap-1.5 overflow-hidden p-3.5 text-left"
                  style={{
                    animation: `tile-in 360ms cubic-bezier(0.22, 1, 0.36, 1) both`,
                    animationDelay: tileDelay(i + 1),
                    ...(on
                      ? {
                          borderColor: 'rgba(255,255,255,0.42)',
                          boxShadow:
                            'inset 0 1px 0 rgba(255,255,255,0.4), 0 0 26px -8px rgba(255,255,255,0.35), 0 10px 28px -12px rgba(0,0,0,0.8)',
                        }
                      : {}),
                  }}
                >
                  {/* Accent wash sits under the content, above the glass. */}
                  <span
                    className={`absolute inset-0 bg-gradient-to-br ${c.accent.from} ${c.accent.to} transition-opacity duration-200 ${
                      on ? 'opacity-40' : 'opacity-[0.12] group-hover:opacity-25'
                    }`}
                    aria-hidden
                  />
                  <span className="relative text-2xl drop-shadow" aria-hidden>
                    {c.icon}
                  </span>
                  <span className="relative text-sm font-bold">{c.label}</span>
                  <span className="relative text-[0.65rem] tabular-nums text-white/60">
                    {ENTRIES_BY_CATEGORY[c.id].length} questions
                  </span>
                  {on && <Check />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.09] px-5 py-4 sm:px-6">
          <p className="text-xs text-white/55">
            <span className="font-bold text-white">
              {selected.size === 0 ? 'Everything' : `${selected.size} topic${selected.size === 1 ? '' : 's'}`}
            </span>
            {' · '}
            <span className="tabular-nums">{count}</span> questions
          </p>
          <button type="button" onClick={() => onPlay(chosen)} className="btn-hero !px-6 !py-3 !text-sm">
            Play freeplay →
          </button>
        </div>
      </div>
    </div>
  );
}

function Check() {
  return (
    <span
      className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[0.65rem] font-black text-black shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
      aria-hidden
    >
      ✓
    </span>
  );
}
