"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { riderDelivered, riderSavePush, riderUndo } from "@/app/rider/actions";
import { playChime } from "@/lib/chime";
import { en as t, fmt } from "@/lib/i18n/en";
import { rs } from "@/lib/money";
import { UNDO_WINDOW_MS } from "@/lib/order-rules";
import type { RiderOrder } from "@/lib/orders";
import { AlarmIcon, ArrowIcon, CheckIcon, MapIcon, PhoneIcon } from "@/components/icons";
import { RiderPhoto } from "@/components/staff/RiderPhoto";
import { TapToStart } from "@/components/staff/TapToStart";
import { UndoBar } from "@/components/staff/UndoBar";

// One order at a time: free → red alert (rings until Go) → delivery screen → Delivered → free.

const GO_KEY = "afc:rider-go"; // the order id this phone already tapped Go on, so a reload doesn't ring again
const RING_EVERY_MS = 2500;
const VIBRATE = [600, 200, 600, 200, 600];

type Undo = { orderId: number; number: number; until: number };

function loadGo(): number | null {
  try {
    return Number(localStorage.getItem(GO_KEY)) || null;
  } catch {
    return null;
  }
}

export function RiderApp({
  riderId,
  name,
  initial,
  pushKey,
}: {
  riderId: number;
  name: string;
  initial: RiderOrder | null;
  pushKey: string | null;
}) {
  const router = useRouter();
  const [order, setOrder] = useState(initial);
  const [goId, setGoId] = useState<number | null>(loadGo);
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [undo, setUndo] = useState<Undo | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/rider/current", { cache: "no-store" })
      .then((r) => {
        if (r.status === 401) router.replace("/rider/login");
        return r.ok ? r.json() : undefined;
      })
      .then((o: RiderOrder | null | undefined) => o !== undefined && setOrder(o))
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    const socket = io();
    socket.on("connect", () => {
      socket.emit("join:rider", riderId);
      refresh(); // catch up on anything missed while offline
    });
    socket.on("rider:changed", refresh);
    // A phone coming back from the pocket may have missed socket events while asleep.
    const onShow = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onShow);
    return () => {
      socket.disconnect();
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [riderId, refresh]);

  useEffect(() => {
    navigator.serviceWorker?.register("/sw.js", { scope: "/rider" }).catch(() => {});
  }, []);

  const alerting = order !== null && order.id !== goId;

  useEffect(() => {
    if (!started || !alerting) return;
    const ring = () => {
      playChime();
      navigator.vibrate?.(VIBRATE);
    };
    ring();
    const timer = setInterval(ring, RING_EVERY_MS);
    return () => {
      clearInterval(timer);
      navigator.vibrate?.(0);
    };
  }, [started, alerting]);

  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), undo.until - Date.now());
    return () => clearTimeout(timer);
  }, [undo]);

  /** Inside the Tap to start tap: ask once for notifications and send this phone's push address. */
  async function subscribePush() {
    try {
      if (!pushKey || !("PushManager" in window) || (await Notification.requestPermission()) !== "granted") return;
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(pushKey) }));
      await riderSavePush(sub.toJSON());
    } catch {
      // No push on this phone (blocked or unsupported): the open app still rings.
    }
  }

  function go(id: number) {
    setGoId(id);
    try {
      localStorage.setItem(GO_KEY, String(id));
    } catch {
      // Not remembered: a reload rings once more for this order.
    }
  }

  async function delivered(o: RiderOrder) {
    setBusy(true);
    const ok = await riderDelivered(o.id).catch(() => false);
    if (ok) setUndo({ orderId: o.id, number: o.number, until: Date.now() + UNDO_WINDOW_MS });
    refresh();
    setBusy(false);
  }

  async function doUndo() {
    if (!undo) return;
    const u = undo;
    setUndo(null);
    // Undo of Delivered goes straight back to the delivery screen, not the alert.
    if (await riderUndo(u.orderId).catch(() => false)) go(u.orderId);
    refresh();
  }

  return (
    <>
      {!order ? (
        <Free name={name} />
      ) : alerting ? (
        <Alert order={order} onGo={() => go(order.id)} />
      ) : (
        <Delivery order={order} busy={busy} onDelivered={() => delivered(order)} />
      )}

      {undo && <UndoBar number={undo.number} until={undo.until} onUndo={doUndo} />}

      {!started &&
        <TapToStart
          onStart={() => {
            setStarted(true);
            void subscribePush(); // not awaited: the permission prompt shouldn't hold up the screen
          }}
        />
      }
    </>
  );
}

/** Waiting for an order. Not in the designs: the rider's own photo and name with the Free chip from the counter. */
function Free({ name }: { name: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <RiderPhoto name={name} size={160} onGround />
      <h1 className="font-display text-[34px] leading-none font-bold tracking-[-0.5px]">{name}</h1>
      <span className="flex h-[60px] items-center gap-2 rounded-2xl bg-ready px-6 text-[22px] font-semibold text-white">
        <CheckIcon size={24} />
        {t.free}
      </span>
    </main>
  );
}

function Alert({ order, onGo }: { order: RiderOrder; onGo: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center gap-[22px] bg-accent px-6 pt-14 pb-6 text-white">
      <span className="flex size-[148px] items-center justify-center rounded-full bg-white text-accent shadow-[0_0_0_14px_rgba(255,255,255,0.18)]">
        <AlarmIcon size={80} />
      </span>
      <div className="mt-2.5 flex flex-col items-center gap-1">
        <div className="text-xl font-semibold">{t.newOrder}</div>
        <div className="font-display text-[104px] leading-none font-bold tracking-[-4px]">#{order.number}</div>
      </div>
      <Collect order={order} className="items-center bg-white text-ink" label="text-muted" size="text-[60px] tracking-[-2px]" />
      <button
        type="button"
        onClick={onGo}
        className="mt-auto flex h-[104px] items-center justify-center gap-3.5 self-stretch rounded-[22px] bg-ink font-display text-[40px] font-bold"
      >
        {t.go}
        <ArrowIcon size={40} />
      </button>
    </main>
  );
}

function Delivery({ order, busy, onDelivered }: { order: RiderOrder; busy: boolean; onDelivered: () => void }) {
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.address}, Karachi`)}`;
  const big = "flex h-[150px] flex-col items-center justify-center gap-2.5 rounded-[22px] text-2xl font-bold";
  return (
    <main className="flex min-h-dvh flex-col gap-4 px-5 pt-6 pb-5">
      <div className="flex items-baseline justify-between">
        <div className="font-display text-[52px] leading-none font-bold tracking-[-2px]">#{order.number}</div>
        <div className="text-base font-semibold text-muted">{fmt(t.items, { n: order.itemCount })}</div>
      </div>
      <Collect order={order} className="bg-ink text-white" label="text-ink-soft" size="text-[68px] tracking-[-2.5px]" />
      <div className="flex flex-col gap-1 rounded-[18px] border border-line bg-surface px-[18px] py-4">
        <div className="text-[19px] font-bold">{order.customerName}</div>
        <div className="text-base leading-[1.35] text-ink-3">{order.address}</div>
      </div>
      <div className="grid grid-cols-2 gap-3.5">
        {order.phone ? (
          <a href={`tel:${order.phone}`} className={`${big} bg-check text-white`}>
            <PhoneIcon size={56} />
            {t.call}
          </a>
        ) : (
          <span />
        )}
        <a href={mapUrl} target="_blank" rel="noopener noreferrer" className={`${big} border border-line-2 bg-surface text-ink`}>
          <MapIcon size={56} strokeWidth={1.8} />
          {t.map}
        </a>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={onDelivered}
        className="mt-auto flex h-[170px] flex-col items-center justify-center gap-1.5 rounded-[22px] bg-ready font-display text-4xl font-bold text-white"
      >
        <CheckIcon size={72} />
        {t.delivered}
      </button>
    </main>
  );
}

/** "Take from customer Rs 900", or "Paid" when the wallet payment was confirmed. */
function Collect({ order, className, label, size }: { order: RiderOrder; className: string; label: string; size: string }) {
  return (
    <div className={`flex flex-col gap-0.5 self-stretch rounded-[22px] px-[22px] py-[18px] ${className}`}>
      <div className={`text-base font-semibold ${label}`}>{t.takeFromCustomer}</div>
      <div className={`font-display leading-[1.05] font-bold ${size}`}>{order.collect > 0 ? rs(order.collect) : t.paid}</div>
    </div>
  );
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
