import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** For the uptime monitor (DEPLOY.md): 200 while the app and its database answer, 503 otherwise. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
