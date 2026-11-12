"use client";

import { useSyncExternalStore } from "react";

// The cart and the customer's details live on this device only (no accounts).
// Every storage call is wrapped: private windows and blocked storage throw.

const CART_KEY = "afc:cart";
const DETAILS_KEY = "afc:details";
const LAST_KEY = "afc:last";

export type Cart = Record<string, number>; // menu item id → quantity
export type Details = { name: string; phone: string; address: string };

const listeners = new Set<() => void>();
let cache: Cart | null = null;
const EMPTY: Cart = {};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Cart still works for this visit, it just won't be remembered.
  }
}

function getCart(): Cart {
  return (cache ??= read<Cart>(CART_KEY, {}));
}

function setCart(next: Cart) {
  cache = next;
  write(CART_KEY, next);
  listeners.forEach((l) => l());
}

export function useCart(): Cart {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getCart,
    () => EMPTY,
  );
}

export function changeQty(id: number, delta: number) {
  const cart = { ...getCart() };
  const qty = Math.min(20, Math.max(0, (cart[id] ?? 0) + delta));
  if (qty === 0) delete cart[id];
  else cart[id] = qty;
  setCart(cart);
}

export function clearCart() {
  setCart({});
}

/** Fill the cart with these quantities (Order again). */
export function fillCart(next: Cart) {
  setCart({ ...next });
}

/** The cart of this phone's last placed order, for "Order again". */
export function loadLastOrder(): Cart {
  return read<Cart>(LAST_KEY, {});
}

export function saveLastOrder(c: Cart) {
  write(LAST_KEY, c);
}

export function loadDetails(): Details {
  return read<Details>(DETAILS_KEY, { name: "", phone: "", address: "" });
}

export function saveDetails(d: Details) {
  write(DETAILS_KEY, d);
}

const noop = () => () => {};

/** False during server render and hydration, true after. For screens that depend on this device's storage. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
