"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { counterUndo } from "@/app/counter/actions";
import { playChime } from "@/lib/chime";
import type { BoardOrder } from "@/lib/orders";
import { UNDO_WINDOW_MS } from "@/lib/order-rules";
import { UndoBar } from "@/components/staff/UndoBar";
import { TapToStart } from "@/components/staff/TapToStart";

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

      {undo && <UndoBar number={undo.number} until={undo.until} onUndo={doUndo} />}

      {!started && <TapToStart onStart={() => setStarted(true)} />}
    </CounterCtx.Provider>
  );
}
