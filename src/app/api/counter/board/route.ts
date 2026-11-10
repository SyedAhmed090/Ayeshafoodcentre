import { getBoard } from "@/lib/orders";
import { counterDevice } from "@/lib/staff-auth";

// The board reloads from here whenever the counter socket room says something changed.
export async function GET() {
  if (!(await counterDevice())) return Response.json({ error: "Not the counter" }, { status: 401 });
  return Response.json(await getBoard(), { headers: { "Cache-Control": "no-store" } });
}
