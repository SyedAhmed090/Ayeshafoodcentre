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

export async function signInDevice(role: DeviceRole, riderId: number | null = null) {
  const token = randomBytes(32).toString("base64url");
  await db.device.create({ data: { role, riderId, tokenHash: hash(token) } });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getDevice() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return db.device.findUnique({ where: { tokenHash: hash(token) }, select: { id: true, role: true, riderId: true } });
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
