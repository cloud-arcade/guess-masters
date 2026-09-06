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
 * Difficulty ramp. Early rounds lean on well-known entries so a new player gets
 * a foothold; later rounds open up the whole library.
 */
export function difficultyWeightsForRound(round: number): Record<Difficulty, number> {
  if (round <= 3) return { 1: 5, 2: 5, 3: 2, 4: 1, 5: 0 };
  if (round <= 8) return { 1: 3, 2: 4, 3: 4, 4: 2, 5: 1 };
  if (round <= 15) return { 1: 1, 2: 3, 3: 4, 4: 3, 5: 2 };
  return { 1: 1, 2: 2, 3: 3, 4: 4, 5: 3 };
}

/** Rank label for the end-of-run screen, based on rounds survived. */
export function rankFor(rounds: number): { title: string; blurb: string } {
  if (rounds >= 60) return { title: 'Chronomancer', blurb: 'You have seen the timeline itself.' };
  if (rounds >= 45) return { title: 'Time Lord', blurb: 'Frighteningly well-dated.' };
  if (rounds >= 32) return { title: 'Archivist', blurb: 'The records are safe with you.' };
  if (rounds >= 22) return { title: 'Historian', blurb: 'A serious run.' };
  if (rounds >= 14) return { title: 'Curator', blurb: 'You know your eras.' };
  if (rounds >= 8) return { title: 'Apprentice', blurb: 'Getting the hang of it.' };
  if (rounds >= 4) return { title: 'Novice', blurb: 'Everyone starts somewhere.' };
  return { title: 'Tourist', blurb: 'Have another go — dates are hard.' };
}
