"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { counterPickRider } from "@/app/counter/actions";
import { useCounter } from "@/components/staff/CounterShell";
import { RiderPhoto } from "@/components/staff/RiderPhoto";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { BikeIcon, CheckIcon } from "@/components/icons";
import { fmt } from "@/lib/i18n";
import { useT } from "@/components/staff/StaffText";
import { rs } from "@/lib/money";
import type { getPickDetails } from "@/lib/orders";

type Props = NonNullable<Awaited<ReturnType<typeof getPickDetails>>>;

export function PickRiderView({ order, riders }: Props) {
  const t = useT();
  const router = useRouter();
  const { orders, showUndo, refresh } = useCounter();
  const [busy, setBusy] = useState(false);

  // A rider who just delivered becomes Free here without a reload (every change reaches the counter room).
  useEffect(() => router.refresh(), [orders, router]);

  async function pick(riderId: number) {
    setBusy(true);
    const ok = await counterPickRider(order.id, riderId).catch(() => false);
    if (ok) {
      showUndo({ orderId: order.id, number: order.number, status: "OUT_FOR_DELIVERY" });
      refresh();
      router.push("/counter");
    } else {
      // That rider was just taken, or the order already went: show what's true now.
      router.refresh();
      setBusy(false);
    }
  }

  return (
    <>
      <StaffHeader title={fmt(t.whoTakes, { n: order.number })} />
      <div className="flex min-h-0 grow gap-6 p-6">
        <div className="flex w-[300px] shrink-0 flex-col gap-3.5 rounded-[22px] border border-line bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div className="font-display text-[44px] leading-none font-bold tracking-[-1px]">#{order.number}</div>
            <div className="rounded-[10px] bg-ready-tint px-3 py-1.5 text-[15px] font-bold text-ready-ink">{t.colReady}</div>
          </div>
          <div className="text-lg leading-[1.45] font-medium text-ink-2">
            {order.items.map((i, k) => (
              <div key={k}>
                {i.qty} × {i.name}
              </div>
            ))}
          </div>
          <div className="border-t border-line pt-3.5 text-base leading-[1.45] text-muted">
            {order.customerName}
            <br />
            {order.address}
          </div>
          <div className="mt-auto flex flex-col gap-0.5 rounded-2xl bg-ink px-[18px] py-3.5 text-white">
            <div className="text-sm font-semibold text-ink-soft">{t.riderCollects}</div>
            <div className="font-display text-[44px] leading-[1.05] font-bold tracking-[-1px]">
              {order.collect > 0 ? rs(order.collect) : t.paid}
            </div>
          </div>
        </div>

        <div className="grid min-h-0 grow auto-rows-fr grid-cols-3 gap-6 overflow-y-auto">
          {riders.map((r) =>
            r.status === "FREE" ? (
              <button
                key={r.id}
                type="button"
                disabled={busy}
                onClick={() => pick(r.id)}
                className="flex flex-col items-center justify-center gap-[18px] rounded-[22px] border border-line bg-surface p-4 shadow-card"
              >
                <RiderPhoto name={r.name} photo={r.photo} size={180} />
                <span className="font-display text-[30px] leading-none font-bold tracking-[-0.5px]">{r.name}</span>
                <span className="flex h-[52px] items-center gap-2 rounded-[14px] bg-ready px-[22px] text-xl font-semibold text-white">
                  <CheckIcon size={22} />
                  {t.free}
                </span>
              </button>
            ) : (
              <div
                key={r.id}
                className="flex flex-col items-center justify-center gap-[18px] rounded-[22px] border border-dashed border-busy-line bg-busy p-4 text-ink-3"
              >
                <RiderPhoto name={r.name} photo={r.photo} size={180} busy />
                <span className="font-display text-[30px] leading-none font-bold tracking-[-0.5px]">{r.name}</span>
                <span className="flex h-[52px] items-center gap-2 rounded-[14px] bg-ink-3 px-[22px] text-xl font-semibold whitespace-nowrap text-white">
                  <BikeIcon size={24} />
                  {t.outOnDelivery}
                </span>
              </div>
            ),
          )}
        </div>
      </div>
    </>
  );
}
