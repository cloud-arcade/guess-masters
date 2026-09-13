/**
 * PlayerBar — who is playing, the sound control, and whatever else the screen
 * needs beside them.
 *
 * The same bar on the lobby and in-game so the identity never moves. The player
 * pill is always last, anchoring the right edge; controls fill in to its left,
 * with the `leading` slot ahead of the sound button (in-game, the way back to
 * the menu). There is deliberately no level, XP or local rank here: the
 * platform owns scoring and ranking, and a second, local ladder alongside it
 * would only ever disagree with the real one.
 *
 * Sound is one control, not two. The speaker button still toggles mute on a
 * click, and hovering (or focusing) it drops a vertical level slider beneath —
 * so the common action stays one tap and the fine adjustment is there without
 * a settings screen. The panel is rendered inside the hover target's own
 * wrapper, so moving the pointer down onto the slider never crosses a gap that
 * would dismiss it.
 */

import { useEffect, useId, useRef, useState } from 'react';

interface PlayerBarProps {
  /** Platform display name; null when playing standalone. */
  userName: string | null;
  soundEnabled: boolean;
  onToggleSound: () => void;
  /** Master level, 0..1. */
  volume: number;
  onVolumeChange: (value: number) => void;
  /**
   * Slot rendered at the START of the group, left of the sound control. Used
   * in-game for the way back to the menu; the lobby passes nothing, since it is
   * already there.
   */
  leading?: React.ReactNode;
  /** Slot for an extra control on the right. */
  children?: React.ReactNode;
}

export function PlayerBar({
  userName,
  soundEnabled,
  onToggleSound,
  volume,
  onVolumeChange,
  leading,
  children,
}: PlayerBarProps) {
  const name = userName?.trim() || 'Guest';
  // First glyph of the name, uppercased — works for non-Latin names too.
  const initial = [...name][0]?.toUpperCase() ?? '?';

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const sliderId = useId();

  // Touch has no hover, so a tap outside is the only way back out.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const percent = Math.round(volume * 100);
  const muted = !soundEnabled || volume === 0;

  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      {leading}

      <div
        ref={wrapRef}
        className="relative"
        onPointerEnter={(e) => {
          if (e.pointerType !== 'touch') setOpen(true);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType !== 'touch') setOpen(false);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
        }}
      >
        <button
          type="button"
          onClick={onToggleSound}
          className="glass-key flex h-9 w-9 items-center justify-center !rounded-full text-sm"
          aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
          aria-pressed={soundEnabled}
        >
          {muted ? '🔇' : '🔊'}
        </button>

        {/* Opens downward, anchored to the button. Width matches the button so
            the column reads as an extension of it rather than a popover. */}
        <div
          className={[
            'absolute left-1/2 top-full z-40 -translate-x-1/2 pt-2',
            'transition-all duration-150',
            open
              ? 'pointer-events-auto translate-y-0 opacity-100'
              : 'pointer-events-none -translate-y-1 opacity-0',
          ].join(' ')}
          aria-hidden={!open}
        >
          <div className="glass-key flex w-9 flex-col items-center gap-2 !rounded-full px-1 py-3">
            {/* Rotated so the track runs bottom-to-top: full at the top, silent
                at the bottom, which is the direction people expect a level to
                travel. The box is sized to the rotated footprint, not the
                input's own, or it would reserve a wide horizontal strip. */}
            <div className="flex h-24 w-5 items-center justify-center">
              <input
                id={sliderId}
                type="range"
                min={0}
                max={100}
                step={1}
                value={percent}
                onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
                className="volume-range h-1.5 w-24 -rotate-90 cursor-pointer appearance-none rounded-full bg-white/15"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(110,231,183,0.9) 0%, rgba(110,231,183,0.9) var(--fill), rgba(255,255,255,0.15) var(--fill))',
                  ['--fill' as string]: `${percent}%`,
                }}
                aria-label="Volume"
                aria-valuetext={`${percent}%`}
              />
            </div>

            <span className="text-[0.55rem] font-bold tabular-nums text-white/45">{percent}</span>
          </div>
        </div>
      </div>

      <div className="glass-key flex items-center gap-2 !rounded-full py-1 pl-1 pr-2.5 sm:pr-3.5">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 text-xs font-bold text-black shadow-[0_0_14px_rgba(52,211,153,0.45)]"
          aria-hidden
        >
          {initial}
        </span>
        <span className="max-w-[7rem] truncate text-xs font-semibold text-white/85 sm:max-w-[10rem] sm:text-sm">
          {name}
        </span>
      </div>

      {children}
    </div>
  );
}
