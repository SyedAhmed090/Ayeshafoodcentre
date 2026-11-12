import { OrderError, placeOrder, type CartLine } from "@/lib/orders";
import { MAX_UPLOAD_BYTES, UploadError } from "@/lib/uploads";

// shortcut: no rate limit on placing orders; add one (per IP/phone) if fake orders show up.
export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024) {
    return Response.json({ error: "That screenshot is too big." }, { status: 413 });
  }
  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ error: "Bad request." }, { status: 400 });

  let lines: CartLine[];
  try {
    const raw: unknown = JSON.parse(String(form.get("lines") ?? "[]"));
    if (!Array.isArray(raw)) throw new Error();
    lines = raw.map((l) => ({ id: Number(l?.id), qty: Number(l?.qty) }));
  } catch {
    return Response.json({ error: "Something is wrong with your cart. Please check it again." }, { status: 400 });
  }
  const file = form.get("screenshot");

  try {
    const { token } = await placeOrder({
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      address: String(form.get("address") ?? ""),
      payment: String(form.get("payment") ?? "") as "COD" | "WALLET",
      lines,
      clientKey: String(form.get("key") ?? ""),
      screenshot: file instanceof File && file.size > 0 ? Buffer.from(await file.arrayBuffer()) : null,
    });
    return Response.json({ token });
  } catch (e) {
    if (e instanceof OrderError || e instanceof UploadError) {
      return Response.json({ error: e.message }, { status: 400 });
    }
    console.error("placeOrder failed", e);
    return Response.json({ error: "Could not place the order. Please try again." }, { status: 500 });
  }
}
