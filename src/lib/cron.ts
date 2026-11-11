import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Hostinger cron calls /api/cron/* with the shared secret, either as
 * `Authorization: Bearer <CRON_SECRET>` or `?key=<CRON_SECRET>` (some cron panels can't set headers).
 */
export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const header = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const given = header || new URL(request.url).searchParams.get("key") || "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
