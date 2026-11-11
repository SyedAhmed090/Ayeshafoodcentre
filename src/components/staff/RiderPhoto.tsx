// shortcut: shows the rider's first letter in the design's grey circle; Phase 4 adds photo upload and swaps in the real image here.
/** `onGround`: white circle for the grey page background (the designs put photos on white cards). */
export function RiderPhoto({ name, size, busy = false, onGround = false }: { name: string; size: number; busy?: boolean; onGround?: boolean }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={`flex shrink-0 items-center justify-center rounded-full font-display font-bold ${
        busy ? "bg-busy-well text-ink-3" : onGround ? "bg-surface text-muted shadow-card" : "bg-ground text-muted"
      }`}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
