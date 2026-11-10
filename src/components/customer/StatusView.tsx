"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { io } from "socket.io-client";
import { useHydrated } from "@/lib/cart";
import { rs } from "@/lib/money";
import type { PublicOrder } from "@/lib/orders";
import { BikeIcon, CheckIcon, CrossIcon, FlameIcon, HomeIcon, PhoneCardIcon, PhoneIcon } from "./icons";

type State = "done" | "now" | "todo" | "failed";
type Step = { key: string; label: string; sub?: React.ReactNode; state: State; icon: React.ReactNode };

const TITLES: Record<PublicOrder["status"], string> = {
  CHECK_PAYMENT: "Checking your payment",
  NEW: "Order received",
  COOKING: "Your food is cooking",
  READY: "Your food is ready",
  OUT_FOR_DELIVERY: "Your food is on the way",
  DELIVERED: "Delivered",
  COMPLETED: "Delivered",
  CANCELLED: "Order cancelled",
};

const tel = (phone: string) => `tel:${phone.replace(/\s/g, "")}`;

export function StatusView({ initial, shopPhone }: { initial: PublicOrder; shopPhone: string }) {
  const [order, setOrder] = useState(initial);

  useEffect(() => {
    const socket = io();
    const refresh = () =>
      fetch(`/api/orders/${initial.token}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((o: PublicOrder | null) => o && setOrder(o))
        .catch(() => {});
    // Join on every (re)connect, and refetch in case an update was missed while offline.
    socket.on("connect", () => {
      socket.emit("join:order", initial.token);
      refresh();
    });
    socket.on("order", (o: PublicOrder) => setOrder(o));
    return () => {
      socket.disconnect();
    };
  }, [initial.token]);

  const steps = buildSteps(order);

  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col gap-[22px] px-5 pt-6 pb-5 md:max-w-lg md:pt-12">
      <div className="flex flex-col gap-1.5">
        <div className="text-[13px] font-semibold text-muted">Ayesha Food Centre · Order #{order.number}</div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.h1
            key={order.status}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="font-display text-[32px] leading-[1.1] font-bold tracking-[-0.8px]"
          >
            {TITLES[order.status]}
          </motion.h1>
        </AnimatePresence>
        {order.status === "CANCELLED" && (
          <p className="text-[15px] text-muted">The shop could not find your payment. Call the shop if you have paid.</p>
        )}
      </div>

      {order.status !== "CANCELLED" && (
        <ol className="flex flex-col">
          {steps.map((s, i) => (
            <li key={s.key} className="flex gap-4">
              <div className="flex flex-col items-center">
                <StepIcon state={s.state}>{s.icon}</StepIcon>
                {i < steps.length - 1 && (
                  <div className="relative h-10 w-0.5 bg-line">
                    <motion.div
                      className="absolute inset-0 origin-top bg-ready"
                      initial={false}
                      animate={{ scaleY: s.state === "done" ? 1 : 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-0.5 pt-[3px]">
                <div
                  className={`text-[17px] ${s.state === "now" ? "font-bold" : "font-semibold"} ${
                    s.state === "todo" ? "text-faint" : s.state === "failed" ? "text-accent-ink" : ""
                  }`}
                >
                  {s.label}
                </div>
                {s.sub && <div className="text-sm text-muted">{s.sub}</div>}
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-col gap-2 rounded-[18px] border border-line p-4">
        {order.items.map((it, i) => (
          <div key={i} className="flex justify-between text-[15px] font-medium">
            <span>
              {it.qty} × {it.name}
            </span>
            <span>{rs(it.price * it.qty)}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm text-muted">
          <span>Delivery</span>
          <span>{rs(order.deliveryFee)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-line pt-2.5">
          <span className="font-display text-[22px] font-bold">{rs(order.total)}</span>
          {order.paid ? (
            <span className="rounded-lg bg-ready-tint px-2.5 py-1 text-[13px] font-bold text-ready-ink">Paid</span>
          ) : order.status !== "CANCELLED" && order.status !== "CHECK_PAYMENT" ? (
            <span className="rounded-lg bg-ground px-2.5 py-1 text-[13px] font-bold text-ink-2">Cash on delivery</span>
          ) : null}
        </div>
      </div>

      <a
        href={tel(shopPhone)}
        className="mt-auto flex h-[60px] items-center justify-center gap-2.5 rounded-2xl border border-line-2 bg-surface text-base font-semibold"
      >
        <PhoneIcon />
        Call the shop
      </a>
    </div>
  );
}

function buildSteps(o: PublicOrder): Step[] {
  const s = o.status;
  const steps: Step[] = [];
  const past = (...states: PublicOrder["status"][]) => states.includes(s);

  if (o.wallet) {
    steps.push(
      o.switchedToCash
        ? { key: "pay", label: "Payment not found", sub: "Please pay cash to the rider", state: "failed", icon: <CrossIcon /> }
        : s === "CHECK_PAYMENT"
          ? { key: "pay", label: "Checking payment", sub: "The shop is checking your screenshot", state: "now", icon: <PhoneCardIcon /> }
          : { key: "pay", label: "Payment received", sub: "The shop checked your screenshot", state: "done", icon: <CheckIcon /> },
    );
  }

  const cooked = past("READY", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED");
  steps.push({
    key: "cook",
    label: "Cooking",
    sub: s === "COOKING" ? <span className="font-semibold text-accent-ink">Happening now</span> : s === "NEW" ? "Starting soon" : s === "READY" ? "Waiting for the rider" : undefined,
    state: cooked ? "done" : past("NEW", "COOKING") ? "now" : "todo",
    icon: cooked ? <CheckIcon /> : <FlameIcon />,
  });

  const delivered = past("DELIVERED", "COMPLETED");
  steps.push({
    key: "way",
    label: "On the way",
    sub: o.rider ? (
      <span className="flex items-center gap-2">
        {o.rider.name}
        {o.rider.phone && s === "OUT_FOR_DELIVERY" && (
          <a
            href={tel(o.rider.phone)}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-ink px-3.5 text-sm font-semibold text-white"
          >
            <PhoneIcon size={16} />
            Call rider
          </a>
        )}
      </span>
    ) : undefined,
    state: delivered ? "done" : s === "OUT_FOR_DELIVERY" ? "now" : "todo",
    icon: delivered ? <CheckIcon /> : <BikeIcon />,
  });

  steps.push({
    key: "done",
    label: "Delivered",
    state: delivered ? "done" : "todo",
    icon: delivered ? <CheckIcon /> : <HomeIcon />,
  });
  return steps;
}

function StepIcon({ state, children }: { state: State; children: React.ReactNode }) {
  // Animate only live changes; the server-rendered first view must be visible before JavaScript loads.
  const hydrated = useHydrated();
  const cls = {
    done: "bg-ready text-white",
    now: "bg-ink text-white shadow-[0_0_0_6px_var(--color-ground)]",
    todo: "border-[1.5px] border-line-2 text-faint",
    failed: "border-[1.5px] border-accent text-accent-ink",
  }[state];
  return (
    <motion.div
      key={state}
      initial={hydrated ? { scale: 0.6, opacity: 0.4 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 26 }}
      className={`box-border flex size-12 shrink-0 items-center justify-center rounded-full ${cls}`}
    >
      {children}
    </motion.div>
  );
}
