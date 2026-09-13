/**
 * CountdownRing — the per-question clock.
 *
 * An SVG ring that unwinds as the round runs down, with the seconds remaining
 * in the middle. Three pressure states escalate the styling rather than adding
 * new elements, so nothing jumps around as the clock falls:
 *
 *   calm    (>10s) cool mint, steady
 *   warning (≤10s) amber, ring glows
 *   danger  (≤5s)  rose, the whole dial pulses
 *
 * The ring is driven by `remaining` (a float) rather than the whole-second
 * label, so the sweep stays smooth while the number counts in steps. The stroke
 * transition is deliberately short — at 1s it would visibly lag the clock.
 *
 * The drop-shadow glow renders outside the circle's own geometry, so the SVG is
 * drawn into a viewBox padded by `BLEED` on every side and the element is sized
 * to match. Without that slack the glow is clipped square by the SVG bounds —
 * and the pulse at <=5s pushes it further out still.
 */

import { useEffect, useRef } from 'react';
import { ROUND_SECONDS } from '@/game/rules';
import { sfx } from '@/game/sound';

interface CountdownRingProps {
  /** Seconds left, fractional. */
  remaining: number;
  /** Total seconds in the round; the ring is full at this value. */
  total?: number;
  /** Stops ticking sounds and freezes the pulse (during a reveal). */
  paused?: boolean;
  size?: number;
  /**
   * Untimed mode. The dial keeps its place in the layout — so the line does not
   * reflow between modes — but shows a full, still ring marked ∞ instead of a
   * countdown. No tones, no ticking: there is no pressure to convey.
   */
  unlimited?: boolean;
}

export function CountdownRing({
  remaining,
  total = ROUND_SECONDS,
  paused = false,
  size = 76,
  unlimited = false,
}: CountdownRingProps) {
  const clamped = Math.max(0, Math.min(total, remaining));
  const seconds = Math.ceil(clamped);
  // Unlimited draws a complete ring; a timed one unwinds with the clock.
  const fraction = unlimited ? 1 : total > 0 ? clamped / total : 0;

  const danger = !unlimited && clamped <= 5;
  const warning = !unlimited && !danger && clamped <= 10;

  // Tick once per whole second in the final ten, never twice for the same one.
  const lastTickRef = useRef<number | null>(null);
  useEffect(() => {
    if (unlimited || paused || seconds > 10 || seconds <= 0) {
      lastTickRef.current = null;
      return;
    }
    if (lastTickRef.current === seconds) return;
    lastTickRef.current = seconds;
    sfx.tick(seconds);
  }, [seconds, paused, unlimited]);

  // Geometry. The stroke is inset by half its width so the ring is not clipped,
  // and the whole drawing is padded by BLEED so the glow has room to spill.
  const stroke = Math.max(4, Math.round(size * 0.075));
  const radius = size / 2 - stroke / 2;
  const circumference = 2 * Math.PI * radius;

  // Enough for the widest glow (12px) plus the 9% pulse overshoot.
  const BLEED = 16;
  const box = size + BLEED * 2;
  const centre = box / 2;

  const tone = danger
    ? { ring: '#fb7185', text: 'text-rose-200', glow: 'drop-shadow(0 0 10px rgba(244,63,94,0.85))' }
    : warning
      ? { ring: '#fbbf24', text: 'text-amber-200', glow: 'drop-shadow(0 0 8px rgba(251,191,36,0.7))' }
      : unlimited
        ? // Quieter than the timed calm state: present, but not asking to be read.
          { ring: 'rgba(255,255,255,0.28)', text: 'text-white/50', glow: 'none' }
        : { ring: '#6ee7b7', text: 'text-white', glow: 'drop-shadow(0 0 6px rgba(110,231,183,0.5))' };

  return (
    <div
      className={`relative shrink-0 ${danger && !paused ? 'animate-clock-pulse' : ''}`}
      style={{ width: size, height: size }}
      role="timer"
      aria-live="off"
      aria-label={unlimited ? 'No time limit' : `${seconds} seconds remaining`}
    >
      <svg
        width={box}
        height={box}
        viewBox={`0 0 ${box} ${box}`}
        className="pointer-events-none absolute -rotate-90"
        style={{ left: -BLEED, top: -BLEED, overflow: 'visible' }}
      >
        {/* Track */}
        <circle
          cx={centre}
          cy={centre}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={stroke}
        />
        {/* Remaining time */}
        <circle
          cx={centre}
          cy={centre}
          r={radius}
          fill="none"
          stroke={tone.ring}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          style={{
            filter: tone.glow,
            transition: 'stroke-dashoffset 120ms linear, stroke 300ms ease',
          }}
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        {unlimited ? (
          <span
            className={`font-semibold leading-none ${tone.text}`}
            style={{ fontSize: size * 0.42 }}
            aria-hidden
          >
            ∞
          </span>
        ) : (
          <span
            // Keyed on the second so each new number pops in.
            key={seconds}
            className={`animate-digit-pop tabular-nums font-semibold leading-none ${tone.text}`}
            style={{ fontSize: size * 0.34 }}
          >
            {seconds}
          </span>
        )}
      </div>
    </div>
  );
}
