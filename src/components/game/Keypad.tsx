/**
 * Keypad — touch-first number entry.
 *
 * Physical keyboard input is handled separately in PlayScreen so both work at
 * once. Buttons are sized for thumbs and give immediate press feedback.
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
    'flex items-center justify-center rounded-2xl',
    'h-14 sm:h-16',
    'text-2xl font-black font-mono tabular-nums',
    'bg-white/[0.06] text-white border border-white/[0.1]',
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
    'transition-all duration-100 select-none',
    'hover:bg-white/[0.12] hover:border-white/25 hover:-translate-y-px',
    'active:scale-95 active:bg-white/20 active:translate-y-0',
    'disabled:opacity-30 disabled:pointer-events-none',
  ].join(' ');

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {KEYS.map((k) => (
        <button key={k} type="button" className={keyClass} disabled={disabled} onClick={() => onDigit(k)} aria-label={`Digit ${k}`}>
          {k}
        </button>
      ))}

      <button type="button" className={`${keyClass} text-lg`} disabled={disabled} onClick={onDelete} aria-label="Delete last digit">
        ⌫
      </button>

      <button type="button" className={keyClass} disabled={disabled} onClick={() => onDigit('0')} aria-label="Digit 0">
        0
      </button>

      <button
        type="button"
        className={[
          'flex items-center justify-center rounded-2xl h-14 sm:h-16',
          'text-sm font-black uppercase tracking-wider',
          'transition-all duration-150 select-none',
          canSubmit && !disabled
            ? 'bg-gradient-to-br from-emerald-300 via-emerald-400 to-cyan-400 text-black shadow-[0_0_28px_rgba(52,211,153,0.55)] hover:brightness-110 hover:-translate-y-px active:scale-95'
            : 'bg-white/[0.04] text-white/25 border border-white/[0.06] pointer-events-none',
        ].join(' ')}
        disabled={!canSubmit || disabled}
        onClick={onSubmit}
        aria-label="Lock in guess"
      >
        Lock in
      </button>
    </div>
  );
}
