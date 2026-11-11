"use client";

import { playChime, unlockAudio } from "@/lib/chime";
import { en as t } from "@/lib/i18n/en";
import { BellIcon } from "@/components/icons";

/**
 * The once-a-shift "Tap to start" screen on staff devices: the tap unlocks sound (browsers block it
 * until then) and keeps the screen awake. Render it while not started; `onStart` runs inside the tap.
 */
export function TapToStart({ onStart }: { onStart: () => void | Promise<void> }) {
  async function start() {
    await unlockAudio();
    playChime();
    await onStart();
    const lock = async () => {
      try {
        await navigator.wakeLock?.request("screen");
      } catch {
        // No wake lock (old browser or battery saver): the device's own sleep setting applies.
      }
    };
    await lock();
    // The browser drops the wake lock whenever the page is hidden; take it again on return.
    document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && lock());
  }

  return (
    <button
      type="button"
      onClick={start}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-ground text-ink"
    >
      <span className="flex size-40 items-center justify-center rounded-full bg-accent text-white shadow-[0_0_0_16px_var(--color-new-tint)]">
        <BellIcon size={80} strokeWidth={1.8} />
      </span>
      <span className="font-display text-[44px] font-bold tracking-[-1px]">{t.tapToStart}</span>
    </button>
  );
}
