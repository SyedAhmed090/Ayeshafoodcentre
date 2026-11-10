import "server-only";
import { db } from "@/lib/db";

export async function getSettings() {
  const s = await db.settings.findUnique({ where: { id: 1 } });
  if (!s) throw new Error("Settings row missing: run `npm run db:seed`");
  return s;
}
