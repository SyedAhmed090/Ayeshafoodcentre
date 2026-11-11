import { mediaUrl } from "@/lib/media";

/**
 * A stored menu or rider photo filling `className`'s box, or that same box with the placeholder
 * the designs show until the shop sends its photos.
 */
export function Photo({ photo, className, children }: { photo: string | null; className: string; children?: React.ReactNode }) {
  const src = mediaUrl(photo);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- already resized by sharp when uploaded
    <img src={src} alt="" loading="lazy" className={`${className} object-cover`} />
  ) : (
    <span className={`${className} flex items-center justify-center`}>{children}</span>
  );
}
