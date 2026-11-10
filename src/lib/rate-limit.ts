import "server-only";

// shortcut: attempts are counted in this process's memory, which is fine for the one-process Hostinger app; move to the DB if it ever runs several.
const LOCK_MS = 5 * 60 * 1000;
const fails = new Map<string, { count: number; until: number }>();

/** True while `key` has failed `max` times and the 5-minute lock hasn't run out. */
export function isLocked(key: string, max: number): boolean {
  const f = fails.get(key);
  if (!f || f.count < max) return false;
  if (Date.now() < f.until) return true;
  fails.delete(key);
  return false;
}

export function recordFail(key: string, max: number) {
  const f = fails.get(key) ?? { count: 0, until: 0 };
  f.count += 1;
  if (f.count >= max) f.until = Date.now() + LOCK_MS;
  fails.set(key, f);
}

export function clearFails(key: string) {
  fails.delete(key);
}
