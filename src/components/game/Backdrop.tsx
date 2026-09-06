/**
 * Backdrop — full-bleed animated background.
 *
 * Drifting year numbers over slow-moving colour orbs. Purely decorative and
 * pointer-transparent. `tint` shifts the orb colours so the play screen can
 * take on the active category's accent.
 */

import { useMemo } from 'react';

interface BackdropProps {
  /** Tailwind gradient stop classes, e.g. 'from-amber-400 to-orange-600'. */
  tint?: string;
  /** Lower density on the play screen so it never competes with the question. */
  density?: 'full' | 'calm';
}

const YEARS = [
  '1066', '1492', '1666', '1776', '1815', '1889', '1912', '1929', '1945', '1969',
  '1977', '1985', '1994', '2001', '2007', '2012', '1215', '1588', '1863', '1953',
];

export function Backdrop({ tint = 'from-emerald-400 to-cyan-500', density = 'full' }: BackdropProps) {
  // Stable random layout per mount so it does not reshuffle on re-render.
  const particles = useMemo(() => {
    const count = density === 'full' ? 16 : 8;
    return Array.from({ length: count }).map((_, i) => ({
      year: YEARS[i % YEARS.length],
      left: (i * 53 + 7) % 100,
      delay: -((i * 7.3) % 28),
      duration: 24 + ((i * 5) % 16),
      size: 0.8 + ((i * 3) % 5) * 0.35,
      opacity: 0.04 + ((i * 2) % 4) * 0.015,
    }));
  }, [density]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#07070f]" />

      <div
        className={`absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br ${tint} opacity-[0.14] blur-3xl animate-orb-a`}
      />
      <div
        className={`absolute -bottom-40 -right-24 h-[30rem] w-[30rem] rounded-full bg-gradient-to-tr ${tint} opacity-[0.1] blur-3xl animate-orb-b`}
      />
      <div className="absolute left-1/2 top-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500 opacity-[0.06] blur-3xl animate-orb-c" />

      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute bottom-[-10%] select-none font-mono font-bold text-white animate-drift-up"
          style={{
            left: `${p.left}%`,
            fontSize: `${p.size}rem`,
            opacity: p.opacity,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        >
          {p.year}
        </span>
      ))}

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.6)_100%)]" />
    </div>
  );
}
