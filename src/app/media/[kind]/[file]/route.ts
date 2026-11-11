import { MEDIA_FILE } from "@/lib/media";
import { readUpload } from "@/lib/uploads";

// Menu and rider photos (public). Payment screenshots are NOT here: they go through login-only routes.
export async function GET(_req: Request, ctx: RouteContext<"/media/[kind]/[file]">) {
  const { kind, file } = await ctx.params;
  if ((kind !== "menu" && kind !== "riders") || !MEDIA_FILE.test(file)) return new Response(null, { status: 404 });
  const photo = await readUpload(`${kind}/${file}`).catch(() => null);
  if (!photo) return new Response(null, { status: 404 });
  // A new photo always gets a new random name, so a stored one never changes.
  return new Response(new Uint8Array(photo.data), {
    headers: { "Content-Type": photo.type, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
