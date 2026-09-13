/**
 * Keypad — touch-first number entry.
 *
 * Physical keyboard input is handled separately in PlayScreen so both work at
 * once. Keys are frosted glass tiles sized for thumbs; the press states live
 * in `.glass-key` so every interactive glass surface depresses identically.
 */

interface KeypadProps {
  onDigit: (d: string) => void;
  onDelete: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
  disabled?: boolean;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function Keypad({ onDigit, onDelete, onSubmit, canSubmit, disabled }: KeypadProps) {
  const keyClass = [
    'glass-key flex items-center justify-center',
    // Fluid, not stepped: the game is embedded, so the frame can be short as
    // well as narrow. vmin ties the key to whichever axis is tighter, and the
    // floor keeps a thumb-sized target in a very small window.
    'text-[clamp(1.15rem,5.5vw,1.6rem)] font-semibold tabular-nums leading-none',
    'text-white/95 select-none',
    // Tabular figures with a touch of tracking read as a designed keypad
    // rather than a monospace terminal.
    'tracking-[0.01em]',
  ].join(' ');

  return (
    <div className="keypad-surface">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          className={keyClass}
          style={{ aspectRatio: '1.45 / 1', minHeight: '2.4rem' }}
          disabled={disabled}
          onClick={() => onDigit(k)}
          aria-label={`Digit ${k}`}
        >
          {k}
        </button>
      ))}

      <button
        type="button"
        className={`${keyClass} !text-[clamp(0.95rem,4vw,1.125rem)] text-white/70`}
        style={{ aspectRatio: '1.45 / 1', minHeight: '2.4rem' }}
        disabled={disabled}
        onClick={onDelete}
        aria-label="Delete last digit"
      >
        ⌫
      </button>

      <button
        type="button"
        className={keyClass}
        style={{ aspectRatio: '1.45 / 1', minHeight: '2.4rem' }}
        disabled={disabled}
        onClick={() => onDigit('0')}
        aria-label="Digit 0"
      >
        0
      </button>

      <button
        type="button"
        className={[
          'glass-key flex items-center justify-center',
          'text-[clamp(0.6rem,2.6vw,0.75rem)] font-bold uppercase tracking-[0.12em]',
          canSubmit && !disabled ? 'is-live text-black' : 'text-white/25',
        ].join(' ')}
        style={{
          aspectRatio: '1.45 / 1',
          minHeight: '2.4rem',
          ...(canSubmit && !disabled
            ? {
                background: 'linear-gradient(150deg, #6ee7b7 0%, #34d399 45%, #22d3ee 100%)',
                borderColor: 'rgba(255,255,255,0.45)',
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.55), 0 8px 26px -8px rgba(52,211,153,0.85), 0 0 34px -12px rgba(34,211,238,0.7)',
              }
            : {}),
        }}
        disabled={!canSubmit || disabled}
        onClick={onSubmit}
        aria-label="Lock in guess"
      >
        Lock in
      </button>
    </div>
  );
}
