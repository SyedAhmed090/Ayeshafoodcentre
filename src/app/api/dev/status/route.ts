import { db } from "@/lib/db";
import { applyStatus } from "@/lib/orders";
import type { OrderStatus } from "@/generated/prisma/enums";

const STATUSES: OrderStatus[] = ["CHECK_PAYMENT", "NEW", "COOKING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED", "CANCELLED"];

// Development only, for testing the status page by hand before the counter exists (Phase 2):
//   curl -X POST localhost:3000/api/dev/status -H "content-type: application/json" -d '{"number":1,"status":"COOKING"}'
// Delete once the counter board can move orders.
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return new Response(null, { status: 404 });
  const { number, status, cash } = (await req.json()) as { number: number; status: OrderStatus; cash?: boolean };
  if (!STATUSES.includes(status)) return Response.json({ error: `status must be one of ${STATUSES.join(", ")}` }, { status: 400 });
  const order = await db.order.findFirst({ where: { number }, orderBy: { id: "desc" }, select: { id: true } });
  if (!order) return Response.json({ error: "No such order number" }, { status: 404 });
  const rider = status === "OUT_FOR_DELIVERY" ? await db.rider.findFirst({ select: { id: true } }) : null;
  await applyStatus(order.id, status, {
    ...(rider ? { rider: { connect: { id: rider.id } } } : {}),
    ...(cash ? { paymentMethod: "COD" } : {}),
  });
  return Response.json({ ok: true });
}
