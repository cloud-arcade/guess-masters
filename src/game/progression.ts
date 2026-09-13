/**
 * Progression — streak helpers.
 *
 * Scoring, ranking and any notion of a player's standing belong to the
 * platform, which owns the leaderboard. This module deliberately keeps no
 * local XP, levels or achievements: a second ladder computed in the browser
 * would only ever disagree with the real one.
 */

import type { RoundResult } from './rules';

/** Streak = consecutive guesses that were 'close' or better. */
export function streakAfter(history: RoundResult[]): number {
  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const a = history[i].accuracy;
    if (a === 'perfect' || a === 'close') streak++;
    else break;
  }
  return streak;
}

export function bestStreakIn(history: RoundResult[]): number {
  let best = 0;
  let run = 0;
  for (const h of history) {
    if (h.accuracy === 'perfect' || h.accuracy === 'close') {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}
