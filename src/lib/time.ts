// Karachi is UTC+5 all year (no daylight saving), so a fixed offset is exact.
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

/** Calendar date in Karachi as YYYY-MM-DD. */
export function karachiDate(at: Date = new Date()): string {
  return new Date(at.getTime() + PKT_OFFSET_MS).toISOString().slice(0, 10);
}

/** A YYYY-MM-DD string as the Date Prisma stores in a @db.Date column. */
export function dateOnly(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}
