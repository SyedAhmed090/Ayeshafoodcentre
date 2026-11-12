// Reading the owner's admin forms. Pure, so the checks are unit tested; messages are shown to the owner as is.
import { formatPhone, normalizePhone } from "@/lib/phone";

export class AdminError extends Error {}

const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
};

export function text(fd: FormData, key: string, label: string, max = 80, min = 1): string {
  const v = str(fd, key);
  if (v.length < min) throw new AdminError(`${label} is required.`);
  if (v.length > max) throw new AdminError(`${label} is too long (${max} characters at most).`);
  return v;
}

export function optionalText(fd: FormData, key: string, label: string, max = 120): string | null {
  return text(fd, key, label, max, 0) || null;
}

/** Whole rupees, e.g. "1,450" or "1450". */
export function rupees(fd: FormData, key: string, label: string, max = 100_000): number {
  const v = str(fd, key).replace(/[,\s]/g, "");
  if (!/^\d+$/.test(v) || Number(v) > max) throw new AdminError(`${label} must be a whole number of rupees (0 to ${max.toLocaleString("en-PK")}).`);
  return Number(v);
}

export function int(fd: FormData, key: string, fallback = 0): number {
  const v = Number(str(fd, key));
  return Number.isInteger(v) && Math.abs(v) < 100_000 ? v : fallback;
}

export function checkbox(fd: FormData, key: string): boolean {
  return fd.get(key) === "on";
}

/** Exactly 4 digits, or null when the field was left empty and `optional`. */
export function pin(fd: FormData, key: string, optional = false): string | null {
  const v = str(fd, key);
  if (!v && optional) return null;
  if (!/^\d{4}$/.test(v)) throw new AdminError("The PIN must be exactly 4 digits.");
  return v;
}

/** A mobile number, stored as "0300 1234567". */
export function mobile(fd: FormData, key: string, label: string, optional = false): string | null {
  const v = str(fd, key);
  if (!v && optional) return null;
  const n = normalizePhone(v);
  if (!n) throw new AdminError(`${label} must be a mobile number like 0300 1234567.`);
  return formatPhone(n);
}

/** A time box ("13:30") as minutes after midnight, or null when empty. */
export function clock(fd: FormData, key: string, label: string): number | null {
  const v = str(fd, key);
  if (!v) return null;
  const m = /^(\d{2}):(\d{2})$/.exec(v);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) throw new AdminError(`${label} must be a time like 12:00.`);
  return Number(m[1]) * 60 + Number(m[2]);
}

/** An uploaded file, or null if none was chosen. */
export function file(fd: FormData, key: string): File | null {
  const f = fd.get(key);
  return f instanceof File && f.size > 0 ? f : null;
}
