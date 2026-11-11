"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { clearFails, isLocked, recordFail } from "@/lib/rate-limit";
import { clientKey, riderDevice, signInDevice } from "@/lib/staff-auth";
import { markDelivered, undoOrder } from "@/lib/orders";
import { savePush } from "@/lib/push";

// A 4-digit PIN has 10,000 values: limit tries per phone, per rider, and across all riders.
const PER_CLIENT_MAX = 5;
const PER_RIDER_MAX = 10;
const ALL_MAX = 30;
const ALL = "rider-pin:all";

export async function riderLogin(riderId: number, pin: string): Promise<{ error: "wrong" | "locked" } | void> {
  if (!Number.isInteger(riderId)) return { error: "wrong" };
  const key = await clientKey("rider-pin");
  const riderKey = `rider-pin:r${riderId}`;
  if (isLocked(key, PER_CLIENT_MAX) || isLocked(riderKey, PER_RIDER_MAX) || isLocked(ALL, ALL_MAX)) return { error: "locked" };
  const rider = await db.rider.findFirst({ where: { id: riderId, active: true }, select: { pinHash: true } });
  const ok = !!rider && /^\d{4}$/.test(pin) && (await bcrypt.compare(pin, rider.pinHash));
  if (!ok) {
    recordFail(key, PER_CLIENT_MAX);
    recordFail(riderKey, PER_RIDER_MAX);
    recordFail(ALL, ALL_MAX);
    // The try that used up the last chance says so at once, not on the next one.
    return { error: isLocked(key, PER_CLIENT_MAX) || isLocked(riderKey, PER_RIDER_MAX) || isLocked(ALL, ALL_MAX) ? "locked" : "wrong" };
  }
  clearFails(key);
  clearFails(riderKey);
  await signInDevice("RIDER", riderId);
  redirect("/rider");
}

export async function riderDelivered(orderId: number): Promise<boolean> {
  const d = await riderDevice();
  if (!d) throw new Error("Not a rider");
  if (!Number.isInteger(orderId)) throw new Error("Bad order");
  return markDelivered(orderId, d.riderId);
}

/** Undo a Delivered tap, only on this rider's own order. */
export async function riderUndo(orderId: number): Promise<boolean> {
  const d = await riderDevice();
  if (!d) throw new Error("Not a rider");
  if (!Number.isInteger(orderId)) throw new Error("Bad order");
  const own = await db.order.count({ where: { id: orderId, riderId: d.riderId } });
  return own > 0 && undoOrder(orderId, "DELIVERED");
}

export async function riderSavePush(sub: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }) {
  const d = await riderDevice();
  if (!d) throw new Error("Not a rider");
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (typeof endpoint !== "string" || typeof p256dh !== "string" || typeof auth !== "string") throw new Error("Bad subscription");
  if (!isPushService(endpoint) || endpoint.length > 1000 || p256dh.length > 200 || auth.length > 100) throw new Error("Bad subscription");
  await savePush(d.id, { endpoint, p256dh, auth });
}

// The server POSTs to this URL, so it may only be a browser's push service (Chrome, Firefox, Safari, Edge).
const PUSH_HOSTS = /(^|\.)(fcm\.googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)$/;
function isPushService(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && PUSH_HOSTS.test(u.hostname);
  } catch {
    return false;
  }
}
