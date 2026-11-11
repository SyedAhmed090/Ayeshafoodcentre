import { runBackup } from "@/lib/backup";
import { cronAuthorized } from "@/lib/cron";

export const dynamic = "force-dynamic";

/** Nightly database backup. Hostinger cron calls this once a night (DEPLOY.md). */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return new Response("Unauthorized", { status: 401 });
  try {
    return Response.json({ ok: true, ...(await runBackup()) });
  } catch (e) {
    console.error("[afc] backup failed", e);
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "Backup failed" }, { status: 500 });
  }
}

export const POST = GET;
