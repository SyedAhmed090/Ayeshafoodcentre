"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { changeQty, clearCart, loadDetails, saveDetails, saveLastOrder, useCart, useHydrated, type Details } from "@/lib/cart";
import { rs } from "@/lib/money";
import type { MenuItemView } from "@/lib/menu";
import { BackIcon, MinusIcon, PlusIcon, UploadIcon } from "@/components/icons";

type Props = {
  items: MenuItemView[];
  deliveryFee: number;
  merchantNumber: string;
  shopOpen: boolean;
  /** "12:00 pm" when closed only by the opening hours. */
  opensAt: string | null;
  minOrder: number;
  deliveryArea: string | null;
};
type Payment = "COD" | "WALLET";

const inputCls = "h-[50px] rounded-xl border border-line-2 px-3.5 text-base outline-none focus:border-ink";
const labelCls = "text-[13px] font-semibold text-ink-2";

export function CheckoutView({ items, deliveryFee, merchantNumber, shopOpen, opensAt, minOrder, deliveryArea }: Props) {
  const router = useRouter();
  const cart = useCart();
  const hydrated = useHydrated();
  // Remembered from this device's last order.
  const [details, setDetails] = useState<Details>(loadDetails);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [shot, setShot] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Same key on every try of this checkout: if an answer got lost, the retry gets the order already placed.
  const [key] = useState(() => Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, "0")).join(""));
  const fileRef = useRef<HTMLInputElement>(null);

  const byId = new Map(items.map((i) => [String(i.id), i]));
  const lines = Object.entries(cart)
    .filter(([id]) => byId.has(id))
    .map(([id, qty]) => ({ item: byId.get(id)!, qty }));
  const food = lines.reduce((sum, l) => sum + l.item.price * l.qty, 0);
  const total = food + deliveryFee;
  const short = minOrder - food;
  // The one reason ordering can't go ahead right now, shown above the button.
  const blocker = !shopOpen
    ? opensAt
      ? `Sorry, the shop is closed. We take orders from ${opensAt}.`
      : "Sorry, the shop is closed right now."
    : short > 0
      ? `Add ${rs(short)} more food: the smallest order we deliver is ${rs(minOrder)}.`
      : null;

  // The cart lives in this device's storage, so there is nothing to show until hydration.
  if (!hydrated) return null;
  if (lines.length === 0 && !busy) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col items-center justify-center gap-4 p-5 text-center">
        <p className="font-display text-2xl font-bold">Your cart is empty</p>
        <Link href="/" className="flex h-[60px] items-center rounded-2xl bg-accent px-8 text-[17px] font-semibold text-white">
          See the menu
        </Link>
      </div>
    );
  }

  const set = (k: keyof Details) => (e: React.ChangeEvent<HTMLInputElement>) => setDetails({ ...details, [k]: e.target.value });

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(merchantNumber.replace(/\s/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the number is on screen to type in.
    }
  }

  async function placeOrder() {
    setError(null);
    if (!payment) return setError("Please choose how you will pay.");
    if (payment === "WALLET" && !shot) return setError("Please upload the payment screenshot.");
    const body = new FormData();
    body.append("name", details.name);
    body.append("phone", details.phone);
    body.append("address", details.address);
    body.append("payment", payment);
    body.append("key", key);
    body.append("lines", JSON.stringify(lines.map((l) => ({ id: l.item.id, qty: l.qty }))));
    if (payment === "WALLET" && shot) body.append("screenshot", shot);
    setBusy(true);
    const res = await fetch("/api/orders", { method: "POST", body }).catch(() => null);
    const data = res ? ((await res.json().catch(() => ({}))) as { token?: string; error?: string }) : {};
    if (!res || !data.token) {
      setBusy(false);
      return setError(res ? (data.error ?? "Could not place the order. Please try again.") : "No connection. Please try again.");
    }
    saveDetails(details);
    saveLastOrder(Object.fromEntries(lines.map((l) => [l.item.id, l.qty])));
    clearCart();
    router.push(`/order/${data.token}`);
  }

  return (
    <div className="mx-auto max-w-[430px] p-5 md:max-w-4xl md:px-8">
      <div className="flex items-center gap-3">
        <Link href="/" aria-label="Back to menu" className="flex size-11 items-center justify-center rounded-full border border-line">
          <BackIcon />
        </Link>
        <h1 className="font-display text-2xl font-bold tracking-[-0.4px]">Your order</h1>
      </div>

      <div className="mt-[18px] grid gap-[18px] md:grid-cols-2 md:gap-10">
        <div className="flex flex-col gap-[18px]">
          <ul className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {lines.map(({ item, qty }) => (
                <motion.li
                  key={item.id}
                  layout
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-[14px] bg-ground text-[11px] text-muted">
                    Photo
                  </div>
                  <div className="flex grow flex-col gap-0.5">
                    <div className="text-[15px] leading-[1.2] font-semibold">{item.name}</div>
                    <div className="font-display text-[15px] font-bold">{rs(item.price * qty)}</div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-[14px] bg-ground p-0.5">
                    <button
                      type="button"
                      onClick={() => changeQty(item.id, -1)}
                      aria-label={`One less ${item.name}`}
                      className="flex size-11 items-center justify-center rounded-xl bg-surface"
                    >
                      <MinusIcon />
                    </button>
                    <motion.div key={qty} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="w-5 text-center text-base font-bold">
                      {qty}
                    </motion.div>
                    <button
                      type="button"
                      onClick={() => changeQty(item.id, 1)}
                      aria-label={`One more ${item.name}`}
                      className="flex size-11 items-center justify-center rounded-xl bg-ink text-white"
                    >
                      <PlusIcon size={18} />
                    </button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="co-name" className={labelCls}>
                Your name
              </label>
              <input id="co-name" autoComplete="name" placeholder="Name" value={details.name} onChange={set("name")} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="co-phone" className={labelCls}>
                Phone number
              </label>
              <input
                id="co-phone"
                type="tel"
                autoComplete="tel"
                placeholder="03XX XXXXXXX"
                value={details.phone}
                onChange={set("phone")}
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="co-addr" className={labelCls}>
                Delivery address
              </label>
              <input
                id="co-addr"
                autoComplete="street-address"
                placeholder="House, street, sector"
                value={details.address}
                onChange={set("address")}
                className={inputCls}
              />
              {deliveryArea && <p className="text-[13px] text-muted">We deliver to: {deliveryArea}</p>}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[18px]">
          <div className="flex flex-col gap-2">
            <div className={labelCls} id="pay-label">
              How will you pay?
            </div>
            <div role="group" aria-labelledby="pay-label" className="grid grid-cols-2 gap-2.5">
              {(["COD", "WALLET"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={payment === p}
                  onClick={() => setPayment(p)}
                  className={`h-[68px] rounded-[14px] text-[15px] leading-tight ${
                    payment === p ? "border-2 border-ink bg-ground font-bold" : "border border-line-2 bg-surface font-semibold"
                  }`}
                >
                  {p === "COD" ? "Cash on delivery" : "JazzCash / Easypaisa"}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence initial={false}>
            {payment === "WALLET" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-3 rounded-[18px] bg-ground p-4">
                  <div className="flex items-center gap-2.5">
                    <Step n={1} />
                    <div className="text-[15px] font-semibold">
                      Send <span className="font-bold text-accent-ink">{rs(total)}</span> to this number
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2.5 rounded-xl bg-surface py-1.5 pr-1.5 pl-3.5">
                    <div className="font-display text-[15px] font-bold">{merchantNumber}</div>
                    <button type="button" onClick={copyNumber} className="h-11 rounded-[10px] bg-ink px-4 text-sm font-semibold text-white">
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Step n={2} />
                    <div className="text-[15px] font-semibold">Upload the payment screenshot</div>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    aria-label="Payment screenshot"
                    onChange={(e) => setShot(e.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className={`flex h-[72px] items-center justify-center gap-2.5 rounded-xl border-[1.5px] bg-surface text-[15px] font-semibold ${
                      shot ? "border-solid border-ready text-ready-ink" : "border-dashed border-line-3"
                    }`}
                  >
                    <UploadIcon />
                    {shot ? "Screenshot added · Change" : "Choose screenshot"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col gap-2.5 border-t border-line pt-3.5">
            <div className="flex justify-between text-sm text-muted">
              <span>Food</span>
              <span>{rs(food)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted">
              <span>Delivery</span>
              <span>{rs(deliveryFee)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-base font-semibold">Total</span>
              <span className="font-display text-[28px] font-bold tracking-[-0.5px]">{rs(total)}</span>
            </div>
            <AnimatePresence>
              {(error || blocker) && (
                <motion.p
                  role="alert"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[15px] font-semibold text-accent-ink"
                >
                  {blocker ?? error}
                </motion.p>
              )}
            </AnimatePresence>
            <button
              type="button"
              onClick={placeOrder}
              disabled={busy || !!blocker}
              className="h-[60px] rounded-2xl bg-accent text-[17px] font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Placing order…" : "Place order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({ n }: { n: number }) {
  return <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">{n}</div>;
}
