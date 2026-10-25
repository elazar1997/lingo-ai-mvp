// Tiny synthesized sound effects (no audio files) and haptics. Sounds are off during voice
// calls so they never reach the microphone; calls use vibration only.

export type Sfx = "tap" | "correct" | "wrong" | "win";

const MUTE_KEY = "lingo.muted";

// Notes as [frequency Hz, start s, length s].
const TUNES: Record<Sfx, [number, number, number][]> = {
  tap: [[660, 0, 0.05]],
  correct: [[784, 0, 0.09], [1175, 0.08, 0.16]],
  wrong: [[392, 0, 0.12], [330, 0.1, 0.18]],
  win: [[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1], [1047, 0.3, 0.3]],
};

let ctx: AudioContext | null = null;

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean) {
  try {
    if (muted) localStorage.setItem(MUTE_KEY, "1");
    else localStorage.removeItem(MUTE_KEY);
  } catch {
    // Storage blocked: the choice lasts until the page closes.
  }
}

export function playSfx(name: Sfx) {
  if (typeof window === "undefined" || isMuted()) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    for (const [freq, start, length] of TUNES[name]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.12, now + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + length);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + length + 0.02);
    }
  } catch {
    // No Web Audio: stay silent.
  }
}

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Not supported (iOS Safari): nothing to do.
  }
}
