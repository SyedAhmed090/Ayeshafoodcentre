import "server-only";
import webpush from "web-push";
import { after } from "next/server";
import { db } from "@/lib/db";
import { en as t, fmt } from "@/lib/i18n/en";

// Rings a rider's phone when the app is in the background or closed. The open app rings by itself (socket).

let configured: boolean | null = null;

/** Push is off until VAPID keys are set, so local dev and a half-set-up server just skip it. */
function ready(): boolean {
  if (configured !== null) return configured;
  const { VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv, VAPID_SUBJECT: subject } = process.env;
  configured = !!(pub && priv);
  if (configured) webpush.setVapidDetails(subject || "mailto:owner@example.com", pub!, priv!);
  return configured;
}

export function vapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export async function savePush(deviceId: number, sub: { endpoint: string; p256dh: string; auth: string }) {
  // One phone, one rider: if someone else logged in on this browser before, their old row stops getting this rider's alerts.
  await db.device.updateMany({
    where: { pushEndpoint: sub.endpoint, id: { not: deviceId } },
    data: { pushEndpoint: null, pushP256dh: null, pushAuth: null },
  });
  await db.device.update({
    where: { id: deviceId },
    data: { pushEndpoint: sub.endpoint, pushP256dh: sub.p256dh, pushAuth: sub.auth, lastSeenAt: new Date() },
  });
}

async function pushNewOrder(riderId: number, number: number) {
  if (!ready()) return;
  const devices = await db.device.findMany({
    where: { riderId, role: "RIDER", pushEndpoint: { not: null } },
    select: { id: true, pushEndpoint: true, pushP256dh: true, pushAuth: true },
  });
  const body = JSON.stringify({ title: t.newOrder, body: fmt("#{n}", { n: number }), url: "/rider" });
  await Promise.all(
    devices.map(async (d) => {
      try {
        // Urgent + short TTL: an alert that arrives after 10 minutes is no use to anyone.
        await webpush.sendNotification({ endpoint: d.pushEndpoint!, keys: { p256dh: d.pushP256dh!, auth: d.pushAuth! } }, body, {
          TTL: 600,
          urgency: "high",
        });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await db.device.update({ where: { id: d.id }, data: { pushEndpoint: null, pushP256dh: null, pushAuth: null } });
        } else console.error("[afc] push failed", e);
      }
    }),
  );
}

/** Send after the response, so the counter's tap never waits on a push service. */
export function deferPush(riderId: number, number: number) {
  const run = () => pushNewOrder(riderId, number).catch((e) => console.error("[afc] push failed", e));
  try {
    after(run);
  } catch {
    void run();
  }
}
