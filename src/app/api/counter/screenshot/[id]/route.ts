import { db } from "@/lib/db";
import { getDevice } from "@/lib/staff-auth";
import { readUpload } from "@/lib/uploads";

// Payment screenshots hold customers' wallet details: only the counter and the owner may see them.
export async function GET(_req: Request, ctx: RouteContext<"/api/counter/screenshot/[id]">) {
  const role = (await getDevice())?.role;
  if (role !== "COUNTER" && role !== "OWNER") return new Response(null, { status: 401 });
  const id = Number((await ctx.params).id);
  const shot = Number.isInteger(id) ? await db.paymentScreenshot.findUnique({ where: { id }, select: { path: true } }) : null;
  if (!shot) return new Response(null, { status: 404 });
  const { data, type } = await readUpload(shot.path);
  return new Response(new Uint8Array(data), { headers: { "Content-Type": type, "Cache-Control": "private, max-age=3600" } });
}
