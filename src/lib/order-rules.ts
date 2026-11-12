// Pure order checks, shared by the API and tests. No database or server-only imports here.
import { normalizePhone } from "@/lib/phone";

/** An error whose message is safe to show the customer. */
export class OrderError extends Error {}

export type CartLine = { id: number; qty: number };

export type PlaceOrderInput = {
  name: string;
  phone: string;
  address: string;
  payment: "COD" | "WALLET";
  lines: CartLine[];
  screenshot: Buffer | null;
  /** Random key the checkout makes once, so a retry can't place the order twice. */
  clientKey?: string | null;
};

const MAX_LINES = 30;
const MAX_QTY = 20;

/** Checks the customer's input. Prices are never taken from the browser. */
export function validateOrderInput(input: PlaceOrderInput) {
  const name = input.name.trim();
  const address = input.address.trim();
  const phone = normalizePhone(input.phone);
  if (name.length < 2 || name.length > 60) throw new OrderError("Please enter your name.");
  if (!phone) throw new OrderError("Please enter a mobile number like 0300 1234567.");
  if (address.length < 5 || address.length > 200) throw new OrderError("Please enter your full delivery address.");
  if (input.payment !== "COD" && input.payment !== "WALLET") throw new OrderError("Please choose how you will pay.");
  if (input.payment === "WALLET" && !input.screenshot) throw new OrderError("Please upload the payment screenshot.");
  const all = input.lines;
  if (
    all.length > MAX_LINES ||
    new Set(all.map((l) => l.id)).size !== all.length ||
    all.some((l) => !Number.isInteger(l.id) || !Number.isInteger(l.qty) || l.qty < 0 || l.qty > MAX_QTY)
  ) {
    throw new OrderError("Something is wrong with your cart. Please check it again.");
  }
  const lines = all.filter((l) => l.qty > 0);
  if (lines.length === 0) throw new OrderError("Your cart is empty.");
  // A bad key is dropped, not refused: the order still goes through, just without retry protection.
  const clientKey = input.clientKey && /^[0-9a-f]{36}$/.test(input.clientKey) ? input.clientKey : null;
  return { name, phone, address, lines, clientKey };
}

// ── Status moves (docs/BRIEF.md "Order states and who moves them") ──

type Status =
  | "CHECK_PAYMENT"
  | "NEW"
  | "COOKING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

export type CounterAction = "moneyCame" | "switchToCash" | "cancel" | "startCooking" | "foodReady" | "given";

/** Each counter button moves an order exactly one step, from exactly one status. */
export const MOVES: Record<CounterAction, { from: Status; to: Status; walkinOnly?: boolean }> = {
  moneyCame: { from: "CHECK_PAYMENT", to: "NEW" },
  switchToCash: { from: "CHECK_PAYMENT", to: "NEW" },
  cancel: { from: "CHECK_PAYMENT", to: "CANCELLED" },
  startCooking: { from: "NEW", to: "COOKING" },
  foodReady: { from: "COOKING", to: "READY" },
  given: { from: "READY", to: "COMPLETED", walkinOnly: true },
};

export const UNDO_WINDOW_MS = 10_000;
/** Extra time for a slow connection between the tap and the server. */
const UNDO_GRACE_MS = 3_000;

export type UndoFacts = {
  status: Status;
  type: "DELIVERY" | "WALKIN";
  hasScreenshot: boolean;
  createdAt: Date;
  paymentCheckedAt: Date | null;
  cookingAt: Date | null;
  readyAt: Date | null;
  outAt: Date | null;
  deliveredAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
};

/**
 * Where undo takes an order, or null if its last change can't be undone (or is too old).
 * The previous status always follows from the current one, so no history table is needed.
 */
export function undoTarget(o: UndoFacts, now: Date): { to: Status; at: Date } | null {
  const pick = (): { to: Status; at: Date | null } | null => {
    switch (o.status) {
      case "COOKING":
        return { to: "NEW", at: o.cookingAt };
      case "READY":
        return { to: "COOKING", at: o.readyAt };
      case "COMPLETED":
        return { to: "READY", at: o.completedAt };
      case "OUT_FOR_DELIVERY":
        return { to: "READY", at: o.outAt };
      case "DELIVERED":
        return { to: "OUT_FOR_DELIVERY", at: o.deliveredAt };
      case "CANCELLED":
        return o.hasScreenshot ? { to: "CHECK_PAYMENT", at: o.cancelledAt } : null;
      case "NEW":
        // A walk-in just made by mistake is cancelled; a checked wallet order goes back to Check.
        if (o.type === "WALKIN") return { to: "CANCELLED", at: o.createdAt };
        return o.hasScreenshot ? { to: "CHECK_PAYMENT", at: o.paymentCheckedAt } : null;
      default:
        return null;
    }
  };
  const t = pick();
  if (!t || !t.at) return null;
  if (now.getTime() - t.at.getTime() > UNDO_WINDOW_MS + UNDO_GRACE_MS) return null;
  return { to: t.to, at: t.at };
}
