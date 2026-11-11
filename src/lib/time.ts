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

/** A ?day=YYYY-MM-DD from the URL if it is a real date, else today in Karachi. */
export function dayParam(v: string | string[] | undefined): string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && dateOnly(v).toISOString().startsWith(v)
    ? v
    : karachiDate();
}

/** The day before or after a YYYY-MM-DD. */
export function shiftDay(ymd: string, days: number): string {
  return new Date(dateOnly(ymd).getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

/** "2:35 pm" in Karachi time. */
export function karachiTime(at: Date): string {
  return at.toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "numeric", minute: "2-digit" });
}
