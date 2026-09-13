/**
 * Game Rules — pure, framework-free logic.
 *
 * Survival: the player starts with `STARTING_HEALTH` and loses one health per
 * year they are off by. An exact answer heals `PERFECT_BONUS`. The run ends when
 * health reaches zero, and the leaderboard score is the number of rounds
 * *survived*.
 */

import type { DateEntry, Difficulty } from '@/data';

export const STARTING_HEALTH = 250;
export const MAX_DIGITS = 4;

/** Seconds allowed per question before the round resolves itself. */
export const ROUND_SECONDS = 30;

/**
 * Consecutive questions drawn from one category before the run moves on.
 * Grouping keeps the on-screen category stable long enough to register, and
 * makes the "question N of 3" step indicator meaningful.
 */
export const QUESTIONS_PER_CATEGORY = 5;
/**
 * Penalty for letting the clock run out, in years off. Deliberately worse than
 * a typical wrong guess: running down the clock must never be cheaper than
 * committing to an answer.
 */
export const TIMEOUT_PENALTY_YEARS = 50;

/** An exact answer heals this much, capped at STARTING_HEALTH. */
export const PERFECT_BONUS = 50;
/** Within this many years counts as "close" — a small heal and its own flourish. */
export const CLOSE_THRESHOLD = 2;
export const CLOSE_BONUS = 5;

export type GameMode = 'survival' | 'freeplay';

export interface RoundResult {
  entry: DateEntry;
  guess: number;
  /** Absolute difference in years. */
  delta: number;
  /** Health actually removed (never more than the health remaining). */
  damage: number;
  /** Health granted back for a perfect or near-perfect guess. Zero on a fatal round. */
  bonus: number;
  healthBefore: number;
  healthAfter: number;
  /** True when this result took health to zero. */
  fatal: boolean;
  accuracy: Accuracy;
}

export type Accuracy = 'perfect' | 'close' | 'good' | 'off' | 'wild';

export function classify(delta: number): Accuracy {
  if (delta === 0) return 'perfect';
  if (delta <= CLOSE_THRESHOLD) return 'close';
  if (delta <= 10) return 'good';
  if (delta <= 40) return 'off';
  return 'wild';
}

/**
 * Resolve a guess against an entry.
 *
 * Damage is applied first; a bonus only heals a player who is still alive after
 * the hit. That keeps `fatal` and `healthAfter` in agreement — a close guess at
 * one health is still a death, and the bar shows zero.
 *
 * Bonuses are applied only in survival mode where health is a real resource;
 * freeplay uses the same numbers for display but the caller ignores the health
 * change.
 */
export function resolveGuess(entry: DateEntry, guess: number, health: number): RoundResult {
  const delta = Math.abs(entry.year - guess);
  const accuracy = classify(delta);

  const damage = Math.min(delta, health);
  const fatal = health - damage <= 0;

  const rawBonus = accuracy === 'perfect' ? PERFECT_BONUS : accuracy === 'close' ? CLOSE_BONUS : 0;
  const bonus = fatal ? 0 : Math.min(rawBonus, STARTING_HEALTH - (health - damage));

  const healthAfter = fatal ? 0 : health - damage + bonus;

  return {
    entry,
    guess,
    delta,
    damage,
    bonus,
    healthBefore: health,
    healthAfter,
    fatal,
    accuracy,
  };
}

/**
 * Resolve a round the player never answered.
 *
 * Scored as a miss exactly `TIMEOUT_PENALTY_YEARS` off the true year, so it
 * flows through the same damage, health and accuracy rules as a real guess.
 * `guess` is reported as the year that penalty lands on, which keeps
 * `delta = |year - guess|` true for anything reading the result later.
 */
export function resolveTimeout(entry: DateEntry, health: number): RoundResult {
  return resolveGuess(entry, entry.year + TIMEOUT_PENALTY_YEARS, health);
}

/**
 * Difficulty ramp. Early rounds lean on well-known entries so a new player gets
 * a foothold; later rounds open up the whole library.
 */
export function difficultyWeightsForRound(round: number): Record<Difficulty, number> {
  if (round <= 3) return { 1: 5, 2: 5, 3: 2, 4: 1, 5: 0 };
  if (round <= 8) return { 1: 3, 2: 4, 3: 4, 4: 2, 5: 1 };
  if (round <= 15) return { 1: 1, 2: 3, 3: 4, 4: 3, 5: 2 };
  return { 1: 1, 2: 2, 3: 3, 4: 4, 5: 3 };
}
