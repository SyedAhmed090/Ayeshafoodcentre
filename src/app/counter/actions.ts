"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { clearFails, isLocked, recordFail } from "@/lib/rate-limit";
import { clientKey, counterDevice, signInDevice } from "@/lib/staff-auth";
import { assignRider, createWalkin, moveOrder, undoOrder, type CartLine } from "@/lib/orders";
import type { CounterAction } from "@/lib/order-rules";
import type { OrderStatus } from "@/generated/prisma/enums";

const ACTIONS: CounterAction[] = ["moneyCame", "switchToCash", "cancel", "startCooking", "foodReady", "given"];
// The forwarded address can be faked, so every counter PIN try also counts toward one shared limit.
const ALL = "counter-pin:all";
const PER_CLIENT_MAX = 5;
const ALL_MAX = 20;

export async function counterLogin(pin: string): Promise<{ error: "wrong" | "locked" } | void> {
  const key = await clientKey("counter-pin");
  if (isLocked(key, PER_CLIENT_MAX) || isLocked(ALL, ALL_MAX)) return { error: "locked" };
  const ok = /^\d{4}$/.test(pin) && (await bcrypt.compare(pin, (await getSettings()).counterPinHash));
  if (!ok) {
    recordFail(key, PER_CLIENT_MAX);
    recordFail(ALL, ALL_MAX);
    return { error: "wrong" };
  }
  clearFails(key);
  await signInDevice("COUNTER");
  redirect("/counter");
}

/** One board or check-screen button. `false` = the order had already moved (another tap or device). */
export async function counterMove(orderId: number, action: CounterAction): Promise<boolean> {
  const device = await counterDevice();
  if (!device) throw new Error("Not the counter");
  if (!Number.isInteger(orderId) || !ACTIONS.includes(action)) throw new Error("Bad move");
  return moveOrder(orderId, action, device.id);
}

export async function counterUndo(orderId: number, status: OrderStatus): Promise<boolean> {
  if (!(await counterDevice())) throw new Error("Not the counter");
  if (!Number.isInteger(orderId)) throw new Error("Bad undo");
  return undoOrder(orderId, status);
}

export async function counterWalkin(lines: CartLine[]): Promise<{ id: number; number: number }> {
  if (!(await counterDevice())) throw new Error("Not the counter");
  if (!Array.isArray(lines)) throw new Error("Bad walk-in");
  return createWalkin(lines.map((l) => ({ id: Number(l?.id), qty: Number(l?.qty) })));
}

/** Tap a free rider on the pick-a-rider screen. `false` = the order or rider had already changed. */
export async function counterPickRider(orderId: number, riderId: number): Promise<boolean> {
  if (!(await counterDevice())) throw new Error("Not the counter");
  if (!Number.isInteger(orderId) || !Number.isInteger(riderId)) throw new Error("Bad pick");
  return assignRider(orderId, riderId);
}
