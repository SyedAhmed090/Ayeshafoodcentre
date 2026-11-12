"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { counterMove } from "@/app/counter/actions";
import { useCounter } from "@/components/staff/CounterShell";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { BikeIcon, CheckIcon, CrossIcon, PhoneCardIcon, PhoneIcon } from "@/components/icons";
import { fmt } from "@/lib/i18n";
import { useT } from "@/components/staff/StaffText";
import { rs } from "@/lib/money";
import type { CounterAction } from "@/lib/order-rules";
import type { getCheckDetails } from "@/lib/orders";

type Order = NonNullable<Awaited<ReturnType<typeof getCheckDetails>>>;

const bigBtn = "flex flex-col items-center justify-center gap-3.5 rounded-[22px] font-display text-[34px] font-bold tracking-[-0.5px]";

export function CheckView({ order }: { order: Order }) {
  const t = useT();
  const router = useRouter();
  const { showUndo, refresh } = useCounter();
  const [noMoney, setNoMoney] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [busy, setBusy] = useState(false);
  const src = `/api/counter/screenshot/${order.screenshotId}`;

  async function move(action: CounterAction) {
    setBusy(true);
    const moved = await counterMove(order.id, action).catch(() => false);
    if (moved) showUndo({ orderId: order.id, number: order.number, status: action === "cancel" ? "CANCELLED" : "NEW" });
    refresh();
    router.push("/counter");
  }

  return (
    <>
      <StaffHeader title={fmt(t.orderNo, { n: order.number })}>
        <div className="flex h-10 items-center gap-2 rounded-xl bg-check-tint px-3.5 text-[17px] font-bold text-check-ink">
          <PhoneCardIcon size={20} strokeWidth={2.2} />
          {t.checkPayment}
        </div>
        {noMoney && order.customerPhone && (
          <a
            href={`tel:${order.customerPhone}`}
            className="ml-auto flex h-14 items-center gap-2.5 rounded-2xl bg-ink px-6 text-[19px] font-semibold text-white"
          >
            <PhoneIcon size={22} />
            {t.callCustomer}
          </a>
        )}
      </StaffHeader>

      <div className="flex min-h-0 grow gap-6 p-6">
        <button
          type="button"
          onClick={() => setZoom(true)}
          aria-label={t.tapToZoom}
          className="flex w-[360px] shrink-0 flex-col gap-3 rounded-[22px] border border-line bg-surface p-[18px] text-left shadow-card"
        >
          <span className="text-base font-semibold text-muted">{t.customersScreenshot}</span>
          {/* eslint-disable-next-line @next/next/no-img-element -- private, login-only image; next/image would cache it publicly */}
          <img src={src} alt="" className="min-h-0 w-full grow rounded-[14px] bg-ground object-contain" />
        </button>

        <div className="flex min-w-0 grow flex-col gap-6">
          {order.reused && (
            <div className="flex h-16 shrink-0 items-center gap-3 rounded-[18px] bg-accent px-6 text-[22px] font-bold text-white">
              <CrossIcon size={28} />
              {t.sameScreenshot}
            </div>
          )}
          <div className="flex flex-col gap-1.5 rounded-[22px] border border-line bg-surface px-[30px] py-6 shadow-card">
            <div className="text-lg font-semibold text-muted">{t.moneyToFind}</div>
            <div className="font-display text-[124px] leading-none font-bold tracking-[-4px]">{rs(order.total)}</div>
            <div className="flex items-center gap-2.5 text-[19px] font-semibold text-check-ink">
              <PhoneCardIcon size={26} strokeWidth={2.2} />
              {t.openMerchantApp}
            </div>
          </div>

          {!noMoney ? (
            <div className="grid min-h-0 grow grid-cols-2 gap-6">
              <button type="button" disabled={busy} onClick={() => move("moneyCame")} className={`${bigBtn} bg-ready text-white`}>
                <CheckIcon size={120} strokeWidth={2.4} />
                {t.moneyCame}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setNoMoney(true)}
                className={`${bigBtn} border-2 border-accent bg-surface text-accent-ink`}
              >
                <CrossIcon size={120} strokeWidth={2.4} />
                {t.noMoney}
              </button>
            </div>
          ) : (
            <div className="grid min-h-0 grow grid-cols-2 gap-6">
              <button type="button" disabled={busy} onClick={() => move("switchToCash")} className={`${bigBtn} bg-ink text-white`}>
                <BikeIcon size={120} strokeWidth={1.8} />
                {t.switchToCash}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => move("cancel")}
                className={`${bigBtn} border-2 border-accent bg-surface text-accent-ink`}
              >
                <CrossIcon size={120} strokeWidth={2.4} />
                {t.cancelOrder}
              </button>
            </div>
          )}
        </div>
      </div>

      {zoom && (
        <button
          type="button"
          onClick={() => setZoom(false)}
          aria-label={t.close}
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink/90 p-6"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- same private image, full size */}
          <img src={src} alt="" className="max-h-full max-w-full object-contain" />
        </button>
      )}
    </>
  );
}
