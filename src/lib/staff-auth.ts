import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { DeviceRole } from "@/generated/prisma/enums";

// A staff device logs in once with a PIN and stays logged in: staff never see a login screen mid-shift.
const COOKIE = "afc_dev";
const MAX_AGE = 60 * 60 * 24 * 365;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

// The owner can change prices and PINs, so their login lasts 30 days, not a year.
const OWNER_MAX_AGE = 60 * 60 * 24 * 30;

export async function signInDevice(role: DeviceRole, riderId: number | null = null) {
  const token = randomBytes(32).toString("base64url");
  await db.device.create({ data: { role, riderId, tokenHash: hash(token) } });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: role === "OWNER" ? OWNER_MAX_AGE : MAX_AGE,
  });
}

/** Log this device out: forget its token on the server and drop the cookie. */
export async function signOutDevice() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.device.deleteMany({ where: { tokenHash: hash(token) } });
  jar.delete(COOKIE);
}

export async function getDevice() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const d = await db.device.findUnique({ where: { tokenHash: hash(token) }, select: { id: true, role: true, riderId: true, createdAt: true } });
  // The cookie expiring is the browser's side; this is the server's, so a copied owner cookie dies too.
  if (d?.role === "OWNER" && Date.now() - d.createdAt.getTime() > OWNER_MAX_AGE * 1000) return null;
  return d;
}

/** For counter pages: sends a device that isn't logged in as the counter to the PIN screen. */
export async function requireCounterPage() {
  const d = await getDevice();
  if (d?.role !== "COUNTER") redirect("/counter/login");
  return d;
}

/** For counter actions and API routes: null if this request isn't from the counter. */
export async function counterDevice() {
  const d = await getDevice();
  return d?.role === "COUNTER" ? d : null;
}

/** Key for counting wrong PINs: the client's address as the proxy reports it. */
export async function clientKey(prefix: string): Promise<string> {
  const h = await headers();
  return `${prefix}:${h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local"}`;
}

/** For rider pages: sends a phone that isn't logged in as a rider to the photo + PIN screen. */
export async function requireRiderPage() {
  const d = await getDevice();
  if (d?.role !== "RIDER" || !d.riderId) redirect("/rider/login");
  return { id: d.id, riderId: d.riderId };
}

/** For rider actions and API routes: null if this request isn't from a logged-in rider phone. */
export async function riderDevice() {
  const d = await getDevice();
  return d?.role === "RIDER" && d.riderId ? { id: d.id, riderId: d.riderId } : null;
}

/** For admin pages: sends anyone but the owner to the password screen. */
export async function requireOwnerPage() {
  const d = await getDevice();
  if (d?.role !== "OWNER") redirect("/admin/login");
  return d;
}

/** For admin actions and routes: null if this request isn't from the owner. */
export async function ownerDevice() {
  const d = await getDevice();
  return d?.role === "OWNER" ? d : null;
}
