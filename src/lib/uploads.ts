import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import sharp from "sharp";

/** Phone screenshots are well under this; anything bigger is not one. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function uploadDir(): string {
  const dir = process.env.UPLOAD_DIR;
  // Must be absolute: on Hostinger the server's working folder is not the project folder.
  if (!dir || !path.isAbsolute(dir)) throw new Error("UPLOAD_DIR must be set to an absolute path");
  return dir;
}

/** JPEG, PNG or WebP by their first bytes; the browser's MIME type isn't trusted. */
export function sniffImage(buf: Buffer): { ext: string; type: string } | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { ext: "png", type: "image/png" };
  }
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return { ext: "webp", type: "image/webp" };
  }
  return null;
}

/**
 * Save a payment screenshot. The hash is of the file exactly as uploaded, so the same
 * screenshot sent twice is caught; the stored copy is resized to keep the counter tablet fast.
 */
export async function saveScreenshot(data: Buffer): Promise<{ path: string; sha256: string }> {
  if (data.length > MAX_UPLOAD_BYTES) throw new UploadError("That screenshot is too big.");
  if (!sniffImage(data)) throw new UploadError("The screenshot must be a JPG, PNG or WebP image.");
  const sha256 = createHash("sha256").update(data).digest("hex");
  const out = await sharp(data)
    .rotate()
    .resize({ width: 1080, withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer()
    .catch(() => {
      throw new UploadError("That screenshot could not be read. Try another one.");
    });
  const now = new Date();
  const rel = `screenshots/${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomBytes(12).toString("hex")}.jpg`;
  const abs = path.join(uploadDir(), rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, out, { flag: "wx" });
  return { path: rel, sha256 };
}

/** Menu and rider photos: square, small enough for phones, under UPLOAD_DIR/<kind>/. Returns the stored path. */
export async function savePhoto(data: Buffer, kind: PhotoKind): Promise<string> {
  if (data.length > MAX_UPLOAD_BYTES) throw new UploadError("That photo is too big (8 MB at most).");
  if (!sniffImage(data)) throw new UploadError("The photo must be a JPG, PNG or WebP image.");
  const size = kind === "menu" ? 800 : 400;
  const out = await sharp(data)
    .rotate()
    .resize({ width: size, height: size, fit: "cover", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer()
    .catch(() => {
      throw new UploadError("That photo could not be read. Try another one.");
    });
  const rel = `${kind}/${randomBytes(12).toString("hex")}.jpg`;
  const abs = path.join(uploadDir(), rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, out, { flag: "wx" });
  return rel;
}

export type PhotoKind = "menu" | "riders";

export async function deleteUpload(rel: string) {
  await unlink(resolveUpload(rel)).catch(() => {});
}

export async function readUpload(rel: string): Promise<{ data: Buffer; type: string }> {
  const data = await readFile(resolveUpload(rel));
  return { data, type: sniffImage(data)?.type ?? "application/octet-stream" };
}

function resolveUpload(rel: string): string {
  const root = path.resolve(uploadDir());
  const abs = path.resolve(root, rel);
  // Paths come from our own DB rows, but never step outside the upload folder.
  if (!abs.startsWith(root + path.sep)) throw new Error("Bad upload path");
  return abs;
}

/** An error whose message is safe to show the customer. */
export class UploadError extends Error {}
