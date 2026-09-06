/**
 * Question selection.
 *
 * A run's entire question order is decided once, up front, from a seeded PRNG.
 * The order is saved with the run, so a refresh (or a quit and resume) carries
 * on at exactly the same position — nothing is ever redrawn, and there is no
 * way to reroll a question by reloading.
 */

import type { DateEntry, Difficulty } from '@/data';
import { difficultyWeightsForRound } from './rules';

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
 * Questions the player has never been shown (not in `seen`) are drawn first,
 * so a player only meets a repeat once they have exhausted everything new in
 * their selection. Within each half the round-by-round difficulty ramp still
 * applies, so the run opens on approachable questions and hardens as it goes.
 */
export function buildOrder(pool: DateEntry[], seen: ReadonlySet<string>, rng: Rng): string[] {
  const fresh = pool.filter((e) => !seen.has(e.id));
  const stale = pool.filter((e) => seen.has(e.id));

  const order: string[] = [];
  const taken = new Set<string>();

  const drain = (source: DateEntry[]) => {
    for (let i = 0; i < source.length; i++) {
      const entry = pickNext(source, taken, order.length + 1, rng);
      taken.add(entry.id);
      order.push(entry.id);
    }
  };

  drain(fresh);
  drain(stale);
  return order;
}
