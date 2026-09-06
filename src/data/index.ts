/**
 * Knowledge Base — aggregation and pool selection.
 *
 * To add a category: create `categories/<id>.ts`, add it to `CATEGORY_SOURCES`
 * below, and register its metadata in `categories.ts`.
 */

import type { CategoryId, DateEntry, Difficulty } from './types';
import { ART } from './categories/art';
import { DISASTERS } from './categories/disasters';
import { EXPLORATION } from './categories/exploration';
import { FILM } from './categories/film';
import { HISTORY } from './categories/history';
import { INVENTIONS } from './categories/inventions';
import { LITERATURE } from './categories/literature';
import { MUSIC } from './categories/music';
import { POLITICS } from './categories/politics';
import { SCIENCE } from './categories/science';
import { SPACE } from './categories/space';
import { SPORT } from './categories/sport';
import { TECHNOLOGY } from './categories/technology';
import { TELEVISION } from './categories/television';
import { VIDEOGAMES } from './categories/videogames';

export * from './types';
export * from './categories';

const CATEGORY_SOURCES: Record<CategoryId, DateEntry[]> = {
  art: ART,
  disasters: DISASTERS,
  exploration: EXPLORATION,
  film: FILM,
  history: HISTORY,
  inventions: INVENTIONS,
  literature: LITERATURE,
  music: MUSIC,
  politics: POLITICS,
  science: SCIENCE,
  space: SPACE,
  sport: SPORT,
  technology: TECHNOLOGY,
  television: TELEVISION,
  videogames: VIDEOGAMES,
};

/**
 * Every entry, de-duplicated by id. A duplicate id would let the same question
 * appear twice in one run, so the first occurrence wins and the rest are dropped.
 */
export const ALL_ENTRIES: DateEntry[] = (() => {
  const seen = new Set<string>();
  const out: DateEntry[] = [];
  for (const entries of Object.values(CATEGORY_SOURCES)) {
    for (const entry of entries) {
      if (seen.has(entry.id)) continue;
      seen.add(entry.id);
      out.push(entry);
    }
  }
  return out;
})();

export const ENTRIES_BY_CATEGORY: Record<CategoryId, DateEntry[]> = Object.fromEntries(
  (Object.keys(CATEGORY_SOURCES) as CategoryId[]).map((id) => [
    id,
    ALL_ENTRIES.filter((e) => e.category === id),
  ])
) as Record<CategoryId, DateEntry[]>;

export function countFor(categories: CategoryId[] | 'all'): number {
  return getPool(categories).length;
}

/** The playable pool for a selection. `'all'` means the whole library. */
export function getPool(categories: CategoryId[] | 'all'): DateEntry[] {
  if (categories === 'all' || categories.length === 0) return ALL_ENTRIES;
  const wanted = new Set(categories);
  return ALL_ENTRIES.filter((e) => wanted.has(e.category));
}

export function poolByDifficulty(pool: DateEntry[], difficulty: Difficulty): DateEntry[] {
  return pool.filter((e) => e.difficulty === difficulty);
}

/** Library statistics, used by the menu to show off the size of the knowledge base. */
export function libraryStats() {
  const years = ALL_ENTRIES.map((e) => e.year);
  return {
    total: ALL_ENTRIES.length,
    categories: Object.keys(CATEGORY_SOURCES).length,
    earliest: Math.min(...years),
    latest: Math.max(...years),
  };
}
