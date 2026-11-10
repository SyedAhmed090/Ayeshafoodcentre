"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { counterUndo } from "@/app/counter/actions";
import { playChime, unlockAudio } from "@/lib/chime";
import { en as t } from "@/lib/i18n/en";
import type { BoardOrder } from "@/lib/orders";
import { UNDO_WINDOW_MS } from "@/lib/order-rules";
import { BellIcon, UndoIcon } from "@/components/icons";

// Lives in the counter layout, so the board stays live, the chime keeps ringing and undo stays
// on screen while the counter person is on the walk-in or payment screens.

type Undo = { orderId: number; number: number; status: BoardOrder["status"]; until: number };
type Ctx = {
  orders: BoardOrder[];
  refresh: () => void;
  unseen: Set<number>;
  markSeen: (id: number) => void;
  showUndo: (u: Omit<Undo, "until">) => void;
};

const CounterCtx = createContext<Ctx | null>(null);
export const useCounter = () => useContext(CounterCtx)!;

const SEEN_KEY = "afc:seen";
const CHIME_EVERY_MS = 2500;

function loadSeen(): Set<number> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as number[]);
  } catch {
    return new Set();
  }
}

export function CounterShell({ initial, children }: { initial: BoardOrder[]; children: React.ReactNode }) {
  const [orders, setOrders] = useState(initial);
  const [seen, setSeen] = useState<Set<number>>(loadSeen);
  const [started, setStarted] = useState(false);
  const [undo, setUndo] = useState<Undo | null>(null);
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/counter/board", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((o: BoardOrder[] | null) => o && setOrders(o))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const socket = io();
    socket.on("connect", () => {
      socket.emit("join:counter");
      refresh(); // catch up on anything missed while offline
    });
    socket.on("order:changed", refresh);
    return () => {
      socket.disconnect();
    };
  }, [refresh]);

  // New orders are the ones waiting in Check or New that this tablet hasn't been tapped on yet.
  const unseen = new Set(orders.filter((o) => (o.status === "CHECK_PAYMENT" || o.status === "NEW") && !seen.has(o.id)).map((o) => o.id));
  const ringing = started && unseen.size > 0;

  useEffect(() => {
    if (!ringing) return;
    playChime();
    const timer = setInterval(playChime, CHIME_EVERY_MS);
    return () => clearInterval(timer);
  }, [ringing]);

  const markSeen = useCallback((id: number) => {
    setSeen((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev).add(id);
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify([...next].slice(-300)));
      } catch {
        // Not remembered across reloads; the chime may repeat once after a reload.
      }
      return next;
    });
  }, []);

  const showUndo = useCallback((u: Omit<Undo, "until">) => setUndo({ ...u, until: Date.now() + UNDO_WINDOW_MS }), []);

  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), undo.until - Date.now());
    return () => clearTimeout(timer);
  }, [undo]);

  async function start() {
    await unlockAudio();
    playChime();
    setStarted(true);
    const lock = async () => {
      try {
        wakeLock.current = await navigator.wakeLock?.request("screen");
      } catch {
        // No wake lock (old browser or battery saver): the tablet's own sleep setting applies.
      }
    };
    await lock();
    // The browser drops the wake lock whenever the page is hidden; take it again on return.
    document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && lock());
  }

  async function doUndo() {
    if (!undo) return;
    const u = undo;
    setUndo(null);
    await counterUndo(u.orderId, u.status).catch(() => false);
    refresh();
  }

  return (
    <CounterCtx.Provider value={{ orders, refresh, unseen, markSeen, showUndo }}>
      {children}

      {undo && (
        <div className="fixed inset-x-0 bottom-6 flex justify-center">
          <button
            key={undo.until}
            type="button"
            onClick={doUndo}
            className="relative flex h-[72px] items-center gap-3 overflow-hidden rounded-2xl bg-ink px-8 text-[22px] font-semibold text-white shadow-card"
          >
            <UndoIcon size={28} />
            {t.undo} #{undo.number}
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-1.5 origin-left bg-cooking"
              style={{ animation: `afc-shrink ${UNDO_WINDOW_MS}ms linear forwards` }}
            />
          </button>
        </div>
      )}

      {!started && (
        <button
          type="button"
          onClick={start}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-ground text-ink"
        >
          <span className="flex size-40 items-center justify-center rounded-full bg-accent text-white shadow-[0_0_0_16px_var(--color-new-tint)]">
            <BellIcon size={80} strokeWidth={1.8} />
          </span>
          <span className="font-display text-[44px] font-bold tracking-[-1px]">{t.tapToStart}</span>
        </button>
      )}
    </CounterCtx.Provider>
  );
}
