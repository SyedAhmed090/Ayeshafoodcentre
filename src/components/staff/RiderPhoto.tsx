import { Photo } from "@/components/Photo";

/**
 * The rider's photo in the design's circle, or their first letter until the owner uploads one.
 * `onGround`: white circle for the grey page background (the designs put photos on white cards).
 */
export function RiderPhoto({
  name,
  photo,
  size,
  busy = false,
  onGround = false,
}: {
  name: string;
  photo: string | null;
  size: number;
  busy?: boolean;
  onGround?: boolean;
}) {
  const tone = busy ? "bg-busy-well text-ink-3" : onGround ? "bg-surface text-muted shadow-card" : "bg-ground text-muted";
  return (
    <span aria-hidden style={{ width: size, height: size, fontSize: size * 0.4 }} className="flex shrink-0">
      <Photo photo={photo} className={`size-full rounded-full font-display font-bold ${tone} ${busy && photo ? "grayscale" : ""}`}>
        {name.trim().charAt(0).toUpperCase()}
      </Photo>
    </span>
  );
}
