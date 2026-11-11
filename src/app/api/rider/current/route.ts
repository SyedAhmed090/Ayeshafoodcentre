import { getRiderOrder } from "@/lib/orders";
import { riderDevice } from "@/lib/staff-auth";

// The rider phone reloads from here whenever its socket room says something changed.
export async function GET() {
  const d = await riderDevice();
  if (!d) return Response.json({ error: "Not a rider" }, { status: 401 });
  return Response.json(await getRiderOrder(d.riderId), { headers: { "Cache-Control": "no-store" } });
}
