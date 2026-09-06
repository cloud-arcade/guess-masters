/**
 * Sound — synthesised with WebAudio so the game ships no audio assets.
 *
 * The context is created lazily on first user gesture, which is what browsers
 * require. Every call is a no-op if audio is unavailable or muted.
 */

let ctx: AudioContext | null = null;
let enabled = true;

function context(): AudioContext | null {
  if (!enabled) return null;
  if (ctx) return ctx;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}

export function setSoundEnabled(value: boolean): void {
  enabled = value;
}

export function isSoundEnabled(): boolean {
  return enabled;
}

/** Resume the context — call from a click handler before the first sound. */
export function unlockAudio(): void {
  const c = context();
  if (c && c.state === 'suspended') void c.resume();
}

interface ToneOptions {
  freq: number;
  duration?: number;
  type?: OscillatorType;
  volume?: number;
  /** Slide to this frequency over the duration. */
  slideTo?: number;
  delay?: number;
}

function tone({ freq, duration = 0.12, type = 'sine', volume = 0.2, slideTo, delay = 0 }: ToneOptions): void {
  const c = context();
  if (!c) return;
  try {
    const start = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), start + duration);
    }

    // Short attack, exponential release — avoids clicks at the edges.
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  } catch {
    /* ignore audio failures */
  }
}

export const sfx = {
  digit: () => tone({ freq: 620, duration: 0.05, type: 'square', volume: 0.06 }),
  delete: () => tone({ freq: 300, duration: 0.05, type: 'square', volume: 0.06 }),
  submit: () => tone({ freq: 480, duration: 0.08, type: 'triangle', volume: 0.12 }),

  perfect: () => {
    tone({ freq: 660, duration: 0.1, type: 'triangle', volume: 0.18 });
    tone({ freq: 880, duration: 0.1, type: 'triangle', volume: 0.18, delay: 0.09 });
    tone({ freq: 1320, duration: 0.22, type: 'triangle', volume: 0.16, delay: 0.18 });
  },
  close: () => {
    tone({ freq: 560, duration: 0.1, type: 'triangle', volume: 0.14 });
    tone({ freq: 760, duration: 0.14, type: 'triangle', volume: 0.12, delay: 0.08 });
  },
  hit: (severity: number) => {
    // Bigger misses land lower and longer.
    const base = 320 - Math.min(180, severity * 3);
    tone({ freq: base, duration: 0.18, type: 'sawtooth', volume: 0.12, slideTo: base * 0.6 });
  },
  gameOver: () => {
    tone({ freq: 400, duration: 0.25, type: 'sawtooth', volume: 0.16, slideTo: 200 });
    tone({ freq: 260, duration: 0.5, type: 'sine', volume: 0.14, slideTo: 90, delay: 0.2 });
  },
  newBest: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ freq: f, duration: 0.16, type: 'triangle', volume: 0.16, delay: i * 0.1 })
    );
  },
};
