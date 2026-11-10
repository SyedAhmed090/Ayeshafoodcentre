"use client";

// The new-order chime, made with Web Audio so there is no sound file to download.
// Browsers only allow sound after a tap, which is what the "Tap to start" screen is for.

let ctx: AudioContext | null = null;

/** Call from a tap. Returns false if this browser has no Web Audio. */
export async function unlockAudio(): Promise<boolean> {
  try {
    ctx ??= new AudioContext();
    await ctx.resume();
    return true;
  } catch {
    return false;
  }
}

/** A loud two-tone ding-dong, about 0.8 s. */
export function playChime() {
  if (!ctx || ctx.state !== "running") return;
  const now = ctx.currentTime;
  for (const [freq, start] of [
    [1046.5, 0],
    [784, 0.32],
  ] as const) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.exponentialRampToValueAtTime(0.9, now + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + 0.45);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + start);
    osc.stop(now + start + 0.5);
  }
}
