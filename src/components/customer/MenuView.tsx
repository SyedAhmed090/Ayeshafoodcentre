"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { changeQty, useCart } from "@/lib/cart";
import { rs } from "@/lib/money";
import type { CategoryView, MenuItemView } from "@/lib/menu";
import { PhoneIcon, PlusIcon } from "@/components/icons";
import { Photo } from "@/components/Photo";

type Props = { menu: CategoryView[]; shopOpen: boolean; shopPhone: string };

export function MenuView({ menu, shopOpen, shopPhone }: Props) {
  const cart = useCart();
  const all = menu.flatMap((c) => c.items);
  const deal = all.find((i) => i.featured);
  // The deal has its own card, so a category holding only the deal gets no chip.
  const cats = menu.filter((c) => c.items.some((i) => !i.featured));
  const [catId, setCatId] = useState(cats[0]?.id);
  const shown = cats.find((c) => c.id === catId)?.items.filter((i) => !i.featured) ?? [];

  const byId = new Map(all.map((i) => [String(i.id), i]));
  const lines = Object.entries(cart).filter(([id]) => byId.get(id) && !byId.get(id)!.soldOut);
  const count = lines.reduce((n, [, q]) => n + q, 0);
  const total = lines.reduce((sum, [id, q]) => sum + byId.get(id)!.price * q, 0);

  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col gap-4 p-5 pb-28 md:max-w-5xl md:px-8">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-display text-[22px] font-bold tracking-[-0.3px]">Ayesha Food Centre</h1>
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-muted">
            <span className={`size-2 rounded-full ${shopOpen ? "bg-ready" : "bg-accent"}`} />
            {shopOpen ? "Open now · Home delivery" : "Closed now"}
          </div>
        </div>
        <a
          href={`tel:${shopPhone.replace(/\s/g, "")}`}
          aria-label="Call the shop"
          className="flex size-11 items-center justify-center rounded-full border border-line bg-surface"
        >
          <PhoneIcon />
        </a>
      </header>

      {deal && <DealCard item={deal} canAdd={shopOpen && !deal.soldOut} />}

      <nav aria-label="Menu categories" className="-mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0">
        {cats.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={c.id === catId}
            onClick={() => setCatId(c.id)}
            className={`h-11 shrink-0 rounded-xl px-[18px] text-[15px] font-semibold transition-colors ${
              c.id === catId ? "bg-ink text-white" : "bg-ground text-ink"
            }`}
          >
            {c.name}
          </button>
        ))}
      </nav>

      <motion.ul layout className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {shown.map((item) => (
            <motion.li
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
            >
              <ItemCard item={item} canAdd={shopOpen && !item.soldOut} />
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>

      <AnimatePresence>
        {count > 0 && (
          <motion.div
            className="fixed inset-x-0 bottom-0 mx-auto max-w-[430px] p-5 md:max-w-md"
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            <Link
              href="/checkout"
              className="flex h-[60px] items-center justify-between rounded-2xl bg-accent px-5 text-base font-semibold text-white shadow-card"
            >
              <motion.span key={count} initial={{ scale: 1.25 }} animate={{ scale: 1 }}>
                {count} {count === 1 ? "item" : "items"}
              </motion.span>
              <span>View cart · {rs(total)}</span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DealCard({ item, canAdd }: { item: MenuItemView; canAdd: boolean }) {
  return (
    <motion.button
      type="button"
      disabled={!canAdd}
      onClick={() => changeQty(item.id, 1)}
      whileTap={{ scale: 0.98 }}
      aria-label={`Add ${item.name} to cart`}
      className="flex h-[164px] shrink-0 items-center justify-between gap-3 rounded-[22px] bg-ink p-[18px] text-left text-white disabled:opacity-60"
    >
      <span className="flex flex-col gap-1">
        <span className="self-start rounded-lg bg-accent px-[9px] py-[3px] text-[11px] font-bold tracking-[1px]">
          {item.soldOut ? "SOLD OUT" : "TODAY'S DEAL"}
        </span>
        <span className="font-display text-[26px] leading-[1.1] font-bold tracking-[-0.4px]">{item.name}</span>
        {item.description && <span className="text-[13px] text-ink-soft">{item.description}</span>}
        <span className="font-display text-xl font-bold">{rs(item.price)}</span>
      </span>
      <Photo photo={item.photo} className="size-[116px] shrink-0 rounded-full bg-ink-raised text-xs text-ink-soft">
        Deal photo
      </Photo>
    </motion.button>
  );
}

function ItemCard({ item, canAdd }: { item: MenuItemView; canAdd: boolean }) {
  return (
    <div className={`flex flex-col gap-2 rounded-[18px] border border-line p-2.5 ${item.soldOut ? "opacity-50" : ""}`}>
      <Photo photo={item.photo} className="h-[110px] w-full rounded-xl bg-ground text-xs text-muted">
        Food photo
      </Photo>
      <div className="text-[15px] font-semibold">{item.name}</div>
      <div className="flex items-center justify-between">
        <div className="font-display text-[17px] font-bold">{rs(item.price)}</div>
        {item.soldOut ? (
          <span className="flex h-11 items-center text-[13px] font-semibold text-muted">Sold out</span>
        ) : (
          <motion.button
            type="button"
            disabled={!canAdd}
            whileTap={{ scale: 0.85 }}
            onClick={() => changeQty(item.id, 1)}
            aria-label={`Add ${item.name} to cart`}
            className="flex size-11 items-center justify-center rounded-xl bg-accent text-white disabled:opacity-40"
          >
            <PlusIcon />
          </motion.button>
        )}
      </div>
    </div>
  );
}
