"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { counterWalkin } from "@/app/counter/actions";
import { useCounter } from "@/components/staff/CounterShell";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { CheckIcon, MinusIcon, PlusIcon } from "@/components/icons";
import { useT } from "@/components/staff/StaffText";
import { rs } from "@/lib/money";
import type { CategoryView, MenuItemView } from "@/lib/menu";
import { Photo } from "@/components/Photo";

/** Built only by tapping food photos and +/− (no typing), then "Cash taken" puts it on the board in New. */
export function WalkinView({ menu }: { menu: CategoryView[] }) {
  const t = useT();
  const router = useRouter();
  const { markSeen, showUndo, refresh } = useCounter();
  const [catId, setCatId] = useState(menu[0]?.id);
  const [lines, setLines] = useState<{ item: MenuItemView; qty: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const shown = menu.find((c) => c.id === catId)?.items ?? [];
  const total = lines.reduce((sum, l) => sum + l.item.price * l.qty, 0);

  function change(item: MenuItemView, delta: number) {
    setLines((prev) => {
      const has = prev.some((l) => l.item.id === item.id);
      const next = has ? prev.map((l) => (l.item.id === item.id ? { ...l, qty: l.qty + delta } : l)) : [...prev, { item, qty: delta }];
      return next.filter((l) => l.qty > 0);
    });
  }

  async function cashTaken() {
    setBusy(true);
    try {
      const order = await counterWalkin(lines.map((l) => ({ id: l.item.id, qty: l.qty })));
      markSeen(order.id); // made here, so no chime for it
      showUndo({ orderId: order.id, number: order.number, status: "NEW" });
      refresh();
      router.push("/counter");
    } catch {
      setBusy(false); // an item went sold out meanwhile: the counter can adjust and try again
      router.refresh();
    }
  }

  return (
    <>
      <StaffHeader title={t.walkinOrder} />
      <div className="flex min-h-0 grow gap-6 p-6">
        <div className="flex min-w-0 grow flex-col gap-4">
          <div className="flex shrink-0 gap-3">
            {menu.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={c.id === catId}
                onClick={() => setCatId(c.id)}
                className={`h-[60px] min-w-0 flex-1 rounded-[14px] text-[19px] font-semibold ${
                  c.id === catId ? "bg-ink text-white" : "border border-line bg-surface"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="grid min-h-0 grow auto-rows-[minmax(220px,1fr)] grid-cols-4 gap-3 overflow-y-auto">
            {shown.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={item.soldOut}
                onClick={() => change(item, 1)}
                className="flex flex-col gap-2 rounded-[18px] border border-line bg-surface p-2.5 text-left shadow-card active:scale-[0.97] disabled:opacity-40"
              >
                <Photo photo={item.photo} className="min-h-[140px] w-full grow rounded-xl bg-ground text-[13px] text-muted">
                  Food photo
                </Photo>
                <span className="text-[17px] leading-[1.15] font-semibold">{item.name}</span>
                <span className="font-display text-[22px] font-bold">{item.price.toLocaleString("en-PK")}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex w-[360px] shrink-0 flex-col gap-4 rounded-[22px] border border-line bg-surface p-[18px] shadow-card">
          <div className="text-base font-semibold text-muted">{t.thisOrder}</div>
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
            {lines.map(({ item, qty }) => (
              <div key={item.id} className="flex items-center gap-2.5">
                <Photo photo={item.photo} className="size-14 shrink-0 rounded-[14px] bg-ground text-[11px] text-muted">
                  Photo
                </Photo>
                <div className="grow text-base leading-[1.2] font-semibold">{item.name}</div>
                <div className="flex items-center gap-1.5 rounded-2xl bg-ground p-[3px]">
                  <button
                    type="button"
                    onClick={() => change(item, -1)}
                    aria-label={`One less ${item.name}`}
                    className="flex size-[50px] items-center justify-center rounded-[13px] bg-surface"
                  >
                    <MinusIcon size={22} strokeWidth={2.8} />
                  </button>
                  <div className="w-[26px] text-center font-display text-2xl font-bold">{qty}</div>
                  <button
                    type="button"
                    onClick={() => change(item, 1)}
                    aria-label={`One more ${item.name}`}
                    className="flex size-[50px] items-center justify-center rounded-[13px] bg-ink text-white"
                  >
                    <PlusIcon size={22} strokeWidth={2.8} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-auto flex flex-col gap-2.5 border-t border-line pt-4">
            <div className="text-base font-semibold text-muted">{t.takeThisMuch}</div>
            <div className="font-display text-[68px] leading-none font-bold tracking-[-2px]">{rs(total)}</div>
            <button
              type="button"
              disabled={busy || lines.length === 0}
              onClick={cashTaken}
              className="mt-1.5 flex h-[76px] items-center justify-center gap-3 rounded-2xl bg-ready text-[22px] font-semibold text-white disabled:opacity-40"
            >
              <CheckIcon size={28} />
              {t.cashTaken}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
