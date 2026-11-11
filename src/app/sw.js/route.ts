// The rider app's service worker, served from a route so it gets no-cache headers
// (files in public/ skip next.config headers on Hostinger). It only shows push alerts:
// every screen is live, so nothing is cached.

const SCRIPT = `
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.title || "New order", {
    body: d.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-96.png",
    tag: "rider-order",
    renotify: true,
    requireInteraction: true,
    vibrate: [600, 200, 600, 200, 600, 200, 600],
    data: { url: d.url || "/rider" },
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "/rider", self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if (new URL(c.url).pathname.startsWith("/rider") && "focus" in c) return c.focus();
    return self.clients.openWindow(url);
  }));
});
`;

export const dynamic = "force-static";

export function GET() {
  return new Response(SCRIPT, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
