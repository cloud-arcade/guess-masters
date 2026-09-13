/**
 * Question selection.
 *
 * A run's entire question order is decided once, up front, from a seeded PRNG.
 * The order is saved with the run, so a refresh (or a quit and resume) carries
 * on at exactly the same position — nothing is ever redrawn, and there is no
 * way to reroll a question by reloading.
 */

import type { CategoryId, DateEntry, Difficulty } from '@/data';
import { QUESTIONS_PER_CATEGORY, difficultyWeightsForRound } from './rules';

export interface Rng {
  next(): number;
  /** Current internal state — persist this to resume the stream later. */
  getState(): number;
  setState(state: number): void;
}

/** mulberry32 — small, fast, deterministic, single 32-bit word of state. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    getState() {
      return a;
    },
    setState(state: number) {
      a = state >>> 0;
    },
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

/**
 * Pick the next question.
 *
 * Entries already asked in this run are excluded. The round's difficulty
 * weighting is applied to whatever remains; if the weighting leaves nothing
 * available we fall back to the full remaining pool so a run can always
 * continue. When the entire pool is exhausted the asked set is ignored, which
 * only happens on runs longer than the pool itself.
 */
export function pickNext(pool: DateEntry[], asked: Set<string>, round: number, rng: Rng): DateEntry {
  const remaining = pool.filter((e) => !asked.has(e.id));
  const available = remaining.length > 0 ? remaining : pool;

  const weights = difficultyWeightsForRound(round);
  const weighted: DateEntry[] = [];
  let totalWeight = 0;

  for (const entry of available) {
    const w = weights[entry.difficulty as Difficulty] ?? 1;
    if (w > 0) {
      totalWeight += w;
      weighted.push(entry);
    }
  }

  if (weighted.length === 0) {
    return available[Math.floor(rng.next() * available.length)];
  }

  // Weighted draw over the filtered set.
  let ticket = rng.next() * totalWeight;
  for (const entry of weighted) {
    ticket -= weights[entry.difficulty as Difficulty] ?? 1;
    if (ticket <= 0) return entry;
  }
  return weighted[weighted.length - 1];
}

/**
 * Build the complete, fixed question order for a run: every entry in the pool
 * exactly once, as a list of ids.
 *
 * The run is grouped into rounds of `QUESTIONS_PER_CATEGORY` questions. Within
 * a round, each step comes from a *different* category and the difficulty
 * climbs: step 1 is the easiest question of the round, step 5 the hardest. So a
 * round reads Film(easy) → Space → Music → Sport → History(hard), and the step
 * indicator doubles as a difficulty ramp the player can feel.
 *
 * Two things bend before the shape breaks, in this order:
 *
 * 1. Difficulty is a *target*, not a guarantee. A category rarely holds an
 *    untouched question at exactly the wanted grade, so each step takes the
 *    nearest available difficulty from the category it drew. The curve stays
 *    monotonic in intent even when the library cannot supply an exact 1..5.
 * 2. One-per-category holds only while enough categories have questions left.
 *    A freeplay run on two categories still fills five steps; it just repeats
 *    categories within the round rather than stalling.
 *
 * Questions the player has never seen are consumed before repeats, and every id
 * appears exactly once — steps are drawn from per-category pools that are only
 * ever consumed.
 */
export function buildOrder(pool: DateEntry[], seen: ReadonlySet<string>, rng: Rng): string[] {
  // Remaining questions per category, freshest first so unseen ones go first.
  const byCategory = new Map<CategoryId, DateEntry[]>();
  for (const entry of pool) {
    const list = byCategory.get(entry.category);
    if (list) list.push(entry);
    else byCategory.set(entry.category, [entry]);
  }

  for (const [category, entries] of byCategory) {
    const fresh = shuffle(entries.filter((e) => !seen.has(e.id)), rng);
    const stale = shuffle(entries.filter((e) => seen.has(e.id)), rng);
    byCategory.set(category, [...fresh, ...stale]);
  }

  /**
   * Take the question closest to `want` from a category, preferring an easier
   * one on a tie so an early step never jumps above its target. Consumes it.
   */
  const takeNearest = (entries: DateEntry[], want: Difficulty): DateEntry | null => {
    if (entries.length === 0) return null;
    let bestIndex = 0;
    let bestCost = Infinity;
    for (let i = 0; i < entries.length; i++) {
      const diff = entries[i].difficulty - want;
      // Distance first; on a tie the easier side (negative diff) wins.
      const cost = Math.abs(diff) * 2 + (diff > 0 ? 1 : 0);
      if (cost < bestCost) {
        bestCost = cost;
        bestIndex = i;
        if (cost === 0) break;
      }
    }
    return entries.splice(bestIndex, 1)[0];
  };

  const order: string[] = [];

  for (;;) {
    const live = [...byCategory.entries()].filter(([, q]) => q.length > 0).map(([c]) => c);
    if (live.length === 0) break;

    // Categories for this round: a different one per step while supply allows.
    const roster = shuffle(live, rng);
    const usedThisRound = new Set<CategoryId>();

    for (let step = 0; step < QUESTIONS_PER_CATEGORY; step++) {
      const want = (step + 1) as Difficulty;

      // Prefer a category not yet used this round; fall back to any with stock.
      let category = roster.find((c) => !usedThisRound.has(c) && (byCategory.get(c)?.length ?? 0) > 0);
      if (!category) {
        category = roster.find((c) => (byCategory.get(c)?.length ?? 0) > 0);
      }
      if (!category) break; // Pool exhausted mid-round; the run ends short.

      const entries = byCategory.get(category);
      if (!entries) break;

      const picked = takeNearest(entries, want);
      if (!picked) break;

      usedThisRound.add(category);
      order.push(picked.id);
    }
  }

  return order;
}

/** Fisher-Yates on a copy, driven by the run's seeded stream. */
function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
