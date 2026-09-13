/**
 * ResultReveal — the payoff after each guess.
 *
 * Clean centred text: verdict, the answer, the health change, an optional
 * fact, and the continue button. No box — the flash and the digit colours do
 * the framing.
 *
 * A round lost to the clock gets its own verdict: it was never a guess, so
 * presenting it as one ("Way off") would misreport what happened.
 */

import type { RoundResult } from '@/game/rules';

interface ResultRevealProps {
  result: RoundResult;
  mode: 'survival' | 'freeplay';
  /** The clock ran out; no guess was submitted. */
  timedOut?: boolean;
  onNext: () => void;
  /** Label for the continue button — "Next" or "See results". */
  nextLabel: string;
  /** Start a fresh run. Only offered when this result ended the run. */
  onPlayAgain?: () => void;
  /** Rounds fully survived — shown alongside the run summary on a fatal round. */
  roundsSurvived?: number;
  /** Longest close-or-better streak of the run. */
  bestStreak?: number;
  /** Exact answers in the run. */
  perfectCount?: number;
  /** Mean years off across the run. */
  avgDelta?: number;
  /** Leave for the main menu. Offered between rounds, under the continue button. */
  onExit?: () => void;
}

/**
 * Headlines vary within each band so a long run does not repeat one word over
 * and over. The choice is derived from the entry id rather than random, so a
 * re-render (or a resumed round) never swaps the message mid-reveal.
 */
const PRESENTATION: Record<
  RoundResult['accuracy'],
  { headlines: readonly string[]; text: string; badge: string }
> = {
  perfect: {
    headlines: ['EXACT!', 'Nailed it!', 'Bang on!', 'Perfect!'],
    text: 'text-emerald-300',
    badge: 'bg-emerald-400 text-black',
  },
  close: {
    headlines: ['So close!', 'Almost!', 'Nearly had it!', 'Just barely!'],
    text: 'text-teal-300',
    badge: 'bg-teal-400 text-black',
  },
  good: {
    headlines: ['Not bad', 'In the ballpark', 'Close enough', 'Respectable'],
    text: 'text-amber-300',
    badge: 'bg-amber-400 text-black',
  },
  off: {
    headlines: ['Way off', 'Not quite', 'Wide of the mark', 'Off the pace'],
    text: 'text-orange-300',
    badge: 'bg-orange-400 text-black',
  },
  wild: {
    headlines: ['Ouch.', 'Oof.', 'Not even close', 'Wrong century'],
    text: 'text-rose-300',
    badge: 'bg-rose-500 text-white',
  },
};

const TIMEOUT_HEADLINES = ["Time's up!", 'Out of time!', 'The clock beat you'] as const;

/** Small stable hash of the entry id, so the same round always reads the same. */
function pick<T>(options: readonly T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return options[h % options.length];
}

export function ResultReveal({
  result,
  mode,
  timedOut,
  onNext,
  nextLabel,
  onPlayAgain,
  roundsSurvived,
  bestStreak,
  perfectCount,
  avgDelta,
  onExit,
}: ResultRevealProps) {
  const { entry, delta, damage, bonus, fatal } = result;

  const style = timedOut
    ? {
        headline: pick(TIMEOUT_HEADLINES, entry.id),
        text: 'text-rose-300',
        badge: 'bg-rose-500 text-white',
      }
    : {
        headline: pick(PRESENTATION[result.accuracy].headlines, entry.id),
        text: PRESENTATION[result.accuracy].text,
        badge: PRESENTATION[result.accuracy].badge,
      };

  const showSummary = fatal && mode === 'survival' && roundsSurvived !== undefined;

  return (
    <div className="animate-slide-up mx-auto flex w-full max-w-sm flex-col items-center gap-4 text-center">
      <p className={`text-3xl font-black tracking-tight ${style.text}`}>{style.headline}</p>

      <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider tabular-nums ${style.badge}`}>
        {timedOut
          ? `No answer · −${delta} years`
          : delta === 0
            ? 'Spot on'
            : `${delta} ${delta === 1 ? 'year' : 'years'} off`}
      </span>

      {/* The answer and what it cost, on one line. They were two stacked rows
          with a gap between them, which spent vertical space on a pair of facts
          that belong together — you read the year and the damage as one thought.
          The hairline keeps them distinct without a second row; it is dropped in
          freeplay, where there is no health and nothing follows it. */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
        <p className="text-sm text-white/55">
          The answer was <span className="font-mono text-2xl font-black text-white">{entry.year}</span>
        </p>

        {mode === 'survival' && (
          <>
            <span className="h-5 w-px bg-white/10" aria-hidden />
            <span className="flex items-center gap-2 font-mono text-base font-black tabular-nums">
              {damage > 0 && <span className="text-rose-300">−{damage} ❤️</span>}
              {bonus > 0 && <span className="text-emerald-300">+{bonus} ❤️</span>}
              {damage === 0 && bonus === 0 && <span className="text-white/40">No change</span>}
              {fatal && (
                <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[0.65rem] uppercase tracking-wider text-rose-200">
                  Fatal
                </span>
              )}
            </span>
          </>
        )}
      </div>

      {/* How the run went. Enough to know whether it was a good one without
          leaving the screen; the results page does the deeper breakdown.
          No surface of its own — bare cells divided by a single hairline, the
          same rule the results screen and the lobby use, so all three read as
          one system rather than as a card dropped onto the reveal. */}
      {showSummary && (
        <div className="animate-fact-in mt-1 w-full">
          <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-[0.22em] text-white/30">
            Run over
          </p>
          <dl className="grid grid-cols-4">
            <Stat label="Rounds" value={String(roundsSurvived)} tone="text-white" />
            <Stat label="Exact" value={String(perfectCount ?? 0)} tone="text-emerald-300" />
            <Stat label="Streak" value={`×${bestStreak ?? 0}`} tone="text-amber-300" />
            {/* With no round survived there is no run to average: the only
                guess on record is the one that ended it, and reporting that as
                an average reads as broken next to a round count of zero. */}
            <Stat
              label="Avg. off"
              value={avgDelta !== undefined && (roundsSurvived ?? 0) > 0 ? `${avgDelta.toFixed(1)}y` : '—'}
              tone="text-white/80"
            />
          </dl>
        </div>
      )}

      {/* Actions. On a fatal round the run is over, so the thing most players
          want next — another go — takes the hero and leads. The results page
          drops to the hairline treatment beneath it: only one filled surface in
          the group, and the two quiet ways onward (results, menu) then share
          one visual language. Mid-run there is only one action. */}
      {fatal && onPlayAgain ? (
        <div className="mt-1 flex w-full flex-col gap-2">
          <button type="button" onClick={onPlayAgain} autoFocus className="btn-hero w-full !py-3.5 !text-sm">
            Play again <span aria-hidden>↻</span>
          </button>
          <button
            type="button"
            onClick={onNext}
            className="group flex w-full items-center gap-3 rounded-xl py-1 text-white/60 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60"
          >
            <span className="h-px flex-1 bg-white/[0.08] transition-colors group-hover:bg-white/20" aria-hidden />
            <span className="shrink-0 text-sm font-semibold">
              {nextLabel} <span aria-hidden>→</span>
            </span>
            <span className="h-px flex-1 bg-white/[0.08] transition-colors group-hover:bg-white/20" aria-hidden />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onNext}
          autoFocus
          className={`mt-1 w-full ${fatal ? 'btn-secondary !py-3.5' : 'btn-hero !py-3.5 !text-sm'}`}
        >
          {nextLabel} <span aria-hidden>{fatal ? '→' : '⏎'}</span>
        </button>
      )}

      {/* Under the action, above the way out: the round is resolved and the
          next tap is already in place, so this reads as the parting detail
          rather than something standing between you and the button. Unboxed —
          a lifted label does the framing, so it never becomes another card. */}
      {entry.fact && (
        <p className="animate-fact-in max-w-xs text-xs leading-relaxed text-white/50">
          <span className="mr-1.5 align-middle text-[0.55rem] font-bold uppercase tracking-[0.18em] text-amber-300/70">
            Did you know
          </span>
          <span className="align-middle">{entry.fact}</span>
        </p>
      )}

      {/* The way out, between rounds — the natural moment to stop, rather than
          a permanent control competing for attention during a question. Takes
          the lobby's hairline treatment: it is an exit, not the thing to do
          next. The consequence rides underneath rather than behind a
          confirmation step, so one tap leaves and nothing is a surprise. */}
      {onExit && !fatal && (
        <div className="mt-1 w-full">
          <button
            type="button"
            onClick={onExit}
            className="group flex w-full items-center gap-3 rounded-xl py-1 text-white/50 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60"
          >
            <span className="h-px flex-1 bg-white/[0.08] transition-colors group-hover:bg-white/20" aria-hidden />
            <span className="shrink-0 text-sm font-semibold">Exit to menu</span>
            <span className="h-px flex-1 bg-white/[0.08] transition-colors group-hover:bg-white/20" aria-hidden />
          </button>
          <p className="mt-1.5 text-center text-[0.65rem] leading-relaxed text-white/30">
            {mode === 'survival'
              ? 'Leaves this run — it is saved, so you can resume it from the menu.'
              : 'Ends this freeplay session.'}
          </p>
        </div>
      )}

    </div>
  );
}

/**
 * One run statistic. Sits on a hairline grid rather than in its own box, so a
 * row of four reads as a single readout instead of four competing cards.
 */
/**
 * One run statistic. No surface of its own: a single hairline on the left edge
 * divides it from its neighbour, suppressed on the first cell so the row reads
 * as divided rather than boxed. This is the same rule the results screen and
 * the lobby use, at the same weight, so all three read as one system.
 */
function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center gap-1 border-l border-white/[0.08] px-1 first:border-l-0">
      <dd className={`text-lg font-semibold tabular-nums leading-none ${tone}`}>{value}</dd>
      <dt className="w-full truncate text-center text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-white/35">
        {label}
      </dt>
    </div>
  );
}
