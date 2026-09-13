/**
 * Backdrop — full-bleed animated background.
 *
 * Slow-moving colour orbs behind a fine mesh, with a few drifting frosted
 * shards to catch the light. Purely decorative and pointer-transparent.
 * `tint` shifts the orb colours so the play screen can take on the active
 * category's accent.
 *
 * Deliberately carries no text: an earlier version drifted real year numbers
 * across the screen, which handed players answers to the questions they were
 * being asked. Abstract shapes only — nothing here may resemble an answer.
 */

import { useMemo } from 'react';

interface BackdropProps {
  /** Tailwind gradient stop classes, e.g. 'from-amber-400 to-orange-600'. */
  tint?: string;
  /** Lower density on the play screen so it never competes with the question. */
  density?: 'full' | 'calm';
}

export function Backdrop({ tint = 'from-emerald-400 to-cyan-500', density = 'full' }: BackdropProps) {
  // Stable layout per mount so it does not reshuffle on re-render.
  const shards = useMemo(() => {
    const count = density === 'full' ? 7 : 4;
    return Array.from({ length: count }).map((_, i) => ({
      left: (i * 37 + 9) % 92,
      top: (i * 53 + 11) % 84,
      size: 7 + ((i * 5) % 4) * 3.5,
      rotate: (i * 47) % 90,
      radius: i % 3 === 0 ? '42%' : '1.6rem',
      delay: -((i * 6.1) % 26),
      duration: 26 + ((i * 7) % 18),
      opacity: density === 'full' ? 0.05 : 0.035,
    }));
  }, [density]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#07070f]" />

      <div
        className={`absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br ${tint} opacity-[0.16] blur-3xl animate-orb-a`}
      />
      <div
        className={`absolute -bottom-40 -right-24 h-[30rem] w-[30rem] rounded-full bg-gradient-to-tr ${tint} opacity-[0.12] blur-3xl animate-orb-b`}
      />
      <div className="absolute left-1/2 top-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500 opacity-[0.07] blur-3xl animate-orb-c" />

      {/* Frosted shards — the glass caught mid-drift. */}
      {shards.map((s, i) => (
        <span
          key={i}
          className="absolute animate-shard-drift border border-white/10 backdrop-blur-sm"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            height: `${s.size}rem`,
            width: `${s.size}rem`,
            borderRadius: s.radius,
            background: 'linear-gradient(150deg, rgba(255,255,255,0.5), rgba(255,255,255,0))',
            opacity: s.opacity,
            transform: `rotate(${s.rotate}deg)`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}

      {/* Fine mesh — gives the blur something to refract instead of flat colour. */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at center, #000 20%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, #000 20%, transparent 75%)',
        }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.6)_100%)]" />
    </div>
  );
}
