/**
 * Knowledge Base Types
 *
 * Every entry in the Guess Masters date library conforms to `DateEntry`.
 * Entries live in `src/data/categories/*.ts`, one file per category, and are
 * aggregated by `src/data/index.ts`.
 */

export type CategoryId =
  | 'film'
  | 'music'
  | 'history'
  | 'science'
  | 'space'
  | 'technology'
  | 'sport'
  | 'videogames'
  | 'art'
  | 'exploration'
  | 'politics'
  | 'disasters'
  | 'inventions'
  | 'television'
  | 'literature';

/** 1 = most people know it, 5 = specialist knowledge. */
export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface DateEntry {
  /** Stable unique id, `<category>-<slug>`. Used for de-duplication and seeding. */
  id: string;
  /** The question shown to the player. Should read naturally and end with '?'. */
  prompt: string;
  /** The four-digit answer year (CE). */
  year: number;
  category: CategoryId;
  difficulty: Difficulty;
  /** Optional short fact revealed after the guess. Adds replay value. */
  fact?: string;
}

export interface Category {
  id: CategoryId;
  label: string;
  /** Emoji shown on the category selector tile. */
  icon: string;
  /** One-line description for the category selector. */
  blurb: string;
  /** Tailwind gradient stops used for the tile + in-game accent. */
  accent: { from: string; to: string; text: string; ring: string };
}
