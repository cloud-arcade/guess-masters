/**
 * Confetti — pure CSS celebration burst. Pointer-transparent; unmount to stop.
 */

import { useMemo } from 'react';

const COLOURS = ['#34d399', '#22d3ee', '#fbbf24', '#f472b6', '#a78bfa', '#ffffff'];

export function Confetti({ pieces = 70 }: { pieces?: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: pieces }).map((_, i) => ({
        left: (i * 37 + 11) % 100,
        delay: ((i * 13) % 20) / 10,
        duration: 2.6 + ((i * 7) % 14) / 10,
        size: 6 + ((i * 3) % 6),
        colour: COLOURS[i % COLOURS.length],
        round: i % 3 === 0,
      })),
    [pieces]
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden" aria-hidden>
      {items.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 animate-confetti"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 1.6,
            borderRadius: p.round ? '50%' : 2,
            background: p.colour,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            boxShadow: `0 0 8px ${p.colour}`,
          }}
        />
      ))}
    </div>
  );
}
