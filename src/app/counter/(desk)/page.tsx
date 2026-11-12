"use client";

import Link from "next/link";
import { useState } from "react";
import { LayoutGroup, motion } from "framer-motion";
import { counterMove } from "@/app/counter/actions";
import { useCounter } from "@/components/staff/CounterShell";
import { BellIcon, BikeIcon, CheckIcon, FlameIcon, PhoneCardIcon, PlusIcon } from "@/components/icons";
import { fmt } from "@/lib/i18n";
import { useT } from "@/components/staff/StaffText";
import { rs } from "@/lib/money";
import type { BoardOrder } from "@/lib/orders";
import type { CounterAction } from "@/lib/order-rules";

const COLUMNS = [
  { status: "CHECK_PAYMENT", label: "colCheck", icon: <PhoneCardIcon size={24} strokeWidth={2.2} />, head: "bg-check-tint text-check-ink" },
  { status: "NEW", label: "colNew", icon: <BellIcon />, head: "bg-new-tint text-new-ink" },
  { status: "COOKING", label: "colCooking", icon: <FlameIcon size={24} strokeWidth={2.2} />, head: "bg-cooking-tint text-cooking-ink" },
  { status: "READY", label: "colReady", icon: <CheckIcon size={24} />, head: "bg-ready-tint text-ready-ink" },
] as const;

const btn = "flex h-[60px] items-center justify-center gap-2.5 rounded-[14px] text-[19px] font-semibold";

export default function Board() {
  const t = useT();
  const { orders } = useCounter();
  return (
    <>
      <div className="flex h-[88px] shrink-0 items-center justify-between border-b border-line bg-surface px-6">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">{t.shopName}</h1>
          <div className="text-sm font-medium text-muted">{t.frontDesk}</div>
        </div>
        <Link href="/counter/walkin" className="flex h-[60px] items-center gap-2.5 rounded-2xl bg-ink px-[26px] text-[19px] font-semibold text-white">
          <PlusIcon size={22} />
          {t.walkinOrder}
        </Link>
      </div>

      <LayoutGroup>
        <div className="grid min-h-0 grow grid-cols-4 gap-[18px] px-6 py-5">
          {COLUMNS.map((col) => {
            const list = orders.filter((o) => o.status === col.status);
            return (
              <section key={col.status} aria-label={t[col.label]} className="flex min-h-0 flex-col gap-3.5">
                <div className={`flex h-14 shrink-0 items-center gap-2.5 rounded-[14px] px-4 text-xl font-bold ${col.head}`}>
                  {col.icon}
                  <span className="grow">{t[col.label]}</span>
                  <span>{list.length}</span>
                </div>
                <div className="-mx-2 -mt-1 flex min-h-0 flex-col gap-3.5 overflow-y-auto px-2 pt-1 pb-24">
                  {list.map((o) => (
                    <OrderCard key={o.id} order={o} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </LayoutGroup>
    </>
  );
}

function OrderCard({ order: o }: { order: BoardOrder }) {
  const t = useT();
  const { unseen, markSeen, showUndo, refresh } = useCounter();
  const [busy, setBusy] = useState(false);
  const isNew = unseen.has(o.id);

  async function move(action: CounterAction, to: BoardOrder["status"]) {
    markSeen(o.id);
    setBusy(true);
    const moved = await counterMove(o.id, action).catch(() => false);
    if (moved) showUndo({ orderId: o.id, number: o.number, status: to });
    refresh();
    setBusy(false);
  }

  const payLabel =
    o.type === "WALKIN" ? (
      <span className="text-muted">{t.walkin}</span>
    ) : o.paymentMethod === "WALLET" ? (
      t.paid
    ) : (
      fmt(t.cash, { n: o.total.toLocaleString("en-PK") })
    );

  return (
    <motion.div
      layout
      layoutId={`order-${o.id}`}
      transition={{ type: "spring", stiffness: 500, damping: 40 }}
      // Any tap on a new card stops the chime for it.
      onPointerDown={() => markSeen(o.id)}
      className={`flex shrink-0 flex-col gap-3 rounded-[18px] border border-line bg-surface p-[18px] shadow-card ${
        isNew ? "afc-new" : ""
      }`}
    >
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2.5">
          <div className="font-display text-[40px] leading-none font-bold tracking-[-1px]">#{o.number}</div>
          {o.from && <span className="rounded-lg bg-new-tint px-2 py-1 text-[15px] font-semibold text-new-ink">{fmt(t.fromDay, { d: o.from })}</span>}
        </div>
        {o.status === "CHECK_PAYMENT" ? (
          <div className="font-display text-[22px] font-bold">{rs(o.total)}</div>
        ) : (
          <div className="text-[17px] font-semibold">{payLabel}</div>
        )}
      </div>
      <div className="text-[17px] leading-[1.45] font-medium text-ink-2">
        {o.items.map((i, k) => (
          <div key={k}>
            {i.qty} × {i.name}
          </div>
        ))}
      </div>

      {o.status === "CHECK_PAYMENT" && (
        <Link href={`/counter/check/${o.id}`} onClick={() => markSeen(o.id)} className={`${btn} bg-check text-white`}>
          {t.seePayment}
        </Link>
      )}
      {o.status === "NEW" && (
        <button type="button" disabled={busy} onClick={() => move("startCooking", "COOKING")} className={`${btn} bg-accent text-white`}>
          {t.startCooking}
        </button>
      )}
      {o.status === "COOKING" && (
        <button type="button" disabled={busy} onClick={() => move("foodReady", "READY")} className={`${btn} bg-cooking text-cooking-on`}>
          {t.foodReady}
        </button>
      )}
      {o.status === "READY" && o.type === "DELIVERY" && (
        <Link href={`/counter/rider/${o.id}`} className={`${btn} bg-ready text-white`}>
          <BikeIcon size={24} />
          {t.pickRider}
        </Link>
      )}
      {o.status === "READY" && o.type === "WALKIN" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => move("given", "COMPLETED")}
          className={`${btn} border-[1.5px] border-ready bg-surface text-ready-ink`}
        >
          {t.givenToCustomer}
        </button>
      )}
    </motion.div>
  );
}
