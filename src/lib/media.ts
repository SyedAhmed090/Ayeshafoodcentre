// Shared by server and client code. Photo paths are stored as "menu/<hex>.jpg" or "riders/<hex>.jpg".

/** The public URL of a stored menu or rider photo, or null if there is none. */
export function mediaUrl(photo: string | null | undefined): string | null {
  return photo ? `/media/${photo}` : null;
}

/** What /media/[kind]/[file] will serve: our own random names only, never a path. */
export const MEDIA_FILE = /^[0-9a-f]{24}\.jpg$/;
