/**
 * Progression — XP, levels and achievements.
 *
 * XP is earned from survival runs only: one point per round survived plus a
 * bonus for exact guesses. Levels follow a gently steepening curve so early
 * levels come fast and later ones are worth chasing.
 */

import type { RoundResult } from './rules';

export const XP_PER_ROUND = 10;
export const XP_PER_EXACT = 15;
export const XP_PER_CLOSE = 5;

/** Total XP required to *reach* a level (level 1 = 0). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  // 100, 250, 450, 700, 1000, ...
  return Math.round(50 * (level - 1) * (level + 2));
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export interface LevelProgress {
  level: number;
  /** XP into the current level. */
  current: number;
  /** XP needed to finish the current level. */
  needed: number;
  /** 0–1 */
  fraction: number;
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelForXp(xp);
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  const current = xp - floor;
  const needed = ceil - floor;
  return { level, current, needed, fraction: needed > 0 ? current / needed : 1 };
}

export function xpForRun(history: RoundResult[], roundsSurvived: number): number {
  let xp = roundsSurvived * XP_PER_ROUND;
  for (const r of history) {
    if (r.accuracy === 'perfect') xp += XP_PER_EXACT;
    else if (r.accuracy === 'close') xp += XP_PER_CLOSE;
  }
  return xp;
}

export const LEVEL_TITLES = [
  'Tourist',
  'Novice',
  'Apprentice',
  'Curator',
  'Historian',
  'Archivist',
  'Scholar',
  'Sage',
  'Time Lord',
  'Chronomancer',
];

export function titleForLevel(level: number): string {
  return LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, level - 1)];
}

// ============================================
// Achievements
// ============================================

export interface RunSummary {
  roundsSurvived: number;
  history: RoundResult[];
  bestStreak: number;
  /** Lifetime totals *after* this run is added. */
  totals: {
    runs: number;
    rounds: number;
    exact: number;
  };
}

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  /** Returns true when the achievement is earned by the given run. */
  check: (run: RunSummary) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-run', icon: '🎟️', title: 'First Steps', description: 'Finish your first run', check: (r) => r.totals.runs >= 1 },
  { id: 'exact-1', icon: '🎯', title: 'Bullseye', description: 'Guess a year exactly', check: (r) => r.history.some((h) => h.accuracy === 'perfect') },
  { id: 'exact-3-run', icon: '🎯', title: 'Triple Tap', description: 'Three exact guesses in one run', check: (r) => r.history.filter((h) => h.accuracy === 'perfect').length >= 3 },
  { id: 'streak-3', icon: '🔥', title: 'Warming Up', description: 'A streak of 3 close guesses', check: (r) => r.bestStreak >= 3 },
  { id: 'streak-6', icon: '🔥', title: 'On Fire', description: 'A streak of 6 close guesses', check: (r) => r.bestStreak >= 6 },
  { id: 'streak-10', icon: '☄️', title: 'Unstoppable', description: 'A streak of 10 close guesses', check: (r) => r.bestStreak >= 10 },
  { id: 'rounds-10', icon: '🥉', title: 'Survivor', description: 'Survive 10 rounds', check: (r) => r.roundsSurvived >= 10 },
  { id: 'rounds-20', icon: '🥈', title: 'Endurer', description: 'Survive 20 rounds', check: (r) => r.roundsSurvived >= 20 },
  { id: 'rounds-35', icon: '🥇', title: 'Veteran', description: 'Survive 35 rounds', check: (r) => r.roundsSurvived >= 35 },
  { id: 'rounds-50', icon: '💎', title: 'Legend', description: 'Survive 50 rounds', check: (r) => r.roundsSurvived >= 50 },
  { id: 'wild-miss', icon: '🙈', title: 'Wrong Century', description: 'Miss by 100 years or more', check: (r) => r.history.some((h) => h.delta >= 100) },
  { id: 'near-death', icon: '🫀', title: 'Living Dangerously', description: 'Survive a round with 5 health or less', check: (r) => r.history.some((h) => !h.fatal && h.healthAfter > 0 && h.healthAfter <= 5) },
  { id: 'lifetime-100', icon: '📚', title: 'Well Read', description: '100 rounds survived in total', check: (r) => r.totals.rounds >= 100 },
  { id: 'lifetime-exact-25', icon: '🧠', title: 'Photographic', description: '25 exact guesses in total', check: (r) => r.totals.exact >= 25 },
  { id: 'runs-10', icon: '🔁', title: 'Regular', description: 'Play 10 runs', check: (r) => r.totals.runs >= 10 },
];

export const ACHIEVEMENT_MAP: Record<string, Achievement> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a])
);

/** Ids newly earned by this run, excluding those already unlocked. */
export function newlyUnlocked(run: RunSummary, alreadyUnlocked: string[]): string[] {
  const have = new Set(alreadyUnlocked);
  return ACHIEVEMENTS.filter((a) => !have.has(a.id) && a.check(run)).map((a) => a.id);
}

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
