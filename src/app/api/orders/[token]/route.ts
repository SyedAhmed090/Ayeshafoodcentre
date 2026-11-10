import { getPublicOrder } from "@/lib/orders";

// The status page refetches here after reconnecting, in case it missed a live update.
export async function GET(_req: Request, ctx: RouteContext<"/api/orders/[token]">) {
  const order = await getPublicOrder((await ctx.params).token);
  if (!order) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(order, { headers: { "Cache-Control": "no-store" } });
}
