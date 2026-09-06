/**
 * Local persistence.
 *
 * Everything is best-effort: private browsing, blocked site data and quota
 * errors must never break the game, so every access is wrapped. Loaded data is
 * validated field-by-field — a hand-edited or corrupted entry is dropped rather
 * than trusted.
 */

import type { CategoryId } from '@/data';

const PREFIX = 'guess-masters:dates:';
const KEY_RUN = `${PREFIX}run`;
const KEY_STATS = `${PREFIX}stats`;
const KEY_PREFS = `${PREFIX}prefs`;
const KEY_SEEN = `${PREFIX}seen`;

/**
 * A survival run in progress.
 *
 * The whole question order is fixed when the run starts and stored here, with
 * the index of the question currently on screen. The run is saved when a
 * question appears *and* the moment a guess is resolved, so a refresh can never
 * hand the player a fresh question, a second go at a revealed one, or the
 * health they had before a bad guess.
 */
export interface SavedRun {
  version: 3;
  categories: CategoryId[] | 'all';
  seed: number;
  /** Every question id for this run, in the order they will be asked. */
  order: string[];
  /** Position in `order` of the question on screen (or next to show). */
  index: number;
  health: number;
  round: number;
  bestStreak: number;
  savedAt: number;
}

export interface SavedStats {
  bestRounds: number;
  totalRuns: number;
  totalRounds: number;
  perfectGuesses: number;
  bestStreak: number;
  xp: number;
  achievements: string[];
  lastPlayedAt?: number;
}

export interface SavedPrefs {
  categories: CategoryId[] | 'all';
  soundEnabled: boolean;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable or full — the game continues without persistence */
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStrArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');

export function loadRun(): SavedRun | null {
  const run = read<Partial<SavedRun>>(KEY_RUN);
  if (
    !run ||
    run.version !== 3 ||
    !isNum(run.seed) ||
    !isStrArray(run.order) ||
    run.order.length === 0 ||
    !isNum(run.index) ||
    run.index < 0 ||
    !isNum(run.health) ||
    run.health <= 0 ||
    !isNum(run.round) ||
    run.round < 1 ||
    !(run.categories === 'all' || isStrArray(run.categories))
  ) {
    // Unknown or older format — drop it rather than guess at its meaning.
    if (run) remove(KEY_RUN);
    return null;
  }
  return {
    version: 3,
    categories: run.categories as CategoryId[] | 'all',
    seed: run.seed,
    order: run.order,
    index: Math.floor(run.index),
    health: run.health,
    round: run.round,
    bestStreak: isNum(run.bestStreak) ? run.bestStreak : 0,
    savedAt: isNum(run.savedAt) ? run.savedAt : Date.now(),
  };
}

export function saveRun(run: SavedRun): void {
  write(KEY_RUN, run);
}

export function clearRun(): void {
  remove(KEY_RUN);
}

// ============================================
// Seen-question index
// ============================================

/**
 * Ids of every question the player has answered, across all runs and modes.
 * New runs draw from the unseen questions first, so nobody meets a repeat
 * until they have worked through everything new.
 */
export function loadSeen(): Set<string> {
  const raw = read<unknown>(KEY_SEEN);
  return new Set(isStrArray(raw) ? raw : []);
}

export function markSeen(ids: Iterable<string>): void {
  const seen = loadSeen();
  let changed = false;
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      changed = true;
    }
  }
  if (changed) write(KEY_SEEN, [...seen]);
}

export function clearSeen(): void {
  remove(KEY_SEEN);
}

const DEFAULT_STATS: SavedStats = {
  bestRounds: 0,
  totalRuns: 0,
  totalRounds: 0,
  perfectGuesses: 0,
  bestStreak: 0,
  xp: 0,
  achievements: [],
};

export function loadStats(): SavedStats {
  const raw = read<Partial<SavedStats>>(KEY_STATS) ?? {};
  return {
    bestRounds: isNum(raw.bestRounds) ? raw.bestRounds : 0,
    totalRuns: isNum(raw.totalRuns) ? raw.totalRuns : 0,
    totalRounds: isNum(raw.totalRounds) ? raw.totalRounds : 0,
    perfectGuesses: isNum(raw.perfectGuesses) ? raw.perfectGuesses : 0,
    bestStreak: isNum(raw.bestStreak) ? raw.bestStreak : 0,
    xp: isNum(raw.xp) ? raw.xp : 0,
    achievements: isStrArray(raw.achievements) ? raw.achievements : [],
    lastPlayedAt: isNum(raw.lastPlayedAt) ? raw.lastPlayedAt : undefined,
  };
}

export function saveStats(stats: SavedStats): void {
  write(KEY_STATS, stats);
}

const DEFAULT_PREFS: SavedPrefs = { categories: 'all', soundEnabled: true };

export function loadPrefs(): SavedPrefs {
  return { ...DEFAULT_PREFS, ...(read<SavedPrefs>(KEY_PREFS) ?? {}) };
}

export function savePrefs(prefs: SavedPrefs): void {
  write(KEY_PREFS, prefs);
}

export { DEFAULT_STATS };
