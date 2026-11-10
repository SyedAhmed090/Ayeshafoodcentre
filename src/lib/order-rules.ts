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
  return { name, phone, address, lines };
}
