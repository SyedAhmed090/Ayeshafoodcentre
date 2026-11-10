import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { emit } from "@/lib/realtime";
import { getSettings } from "@/lib/settings";
import { dateOnly, karachiDate } from "@/lib/time";
import { deleteUpload, saveScreenshot } from "@/lib/uploads";
import { OrderError, validateOrderInput, type CartLine, type PlaceOrderInput } from "@/lib/order-rules";
import type { OrderStatus, PaymentMethod } from "@/generated/prisma/enums";

export { OrderError, type CartLine };
import type { Prisma } from "@/generated/prisma/client";

/** Next number for a Karachi day. The upsert locks the day's row until the transaction ends, so two orders can't share a number. */
async function nextOrderNumber(tx: Prisma.TransactionClient, day: Date): Promise<number> {
  await tx.$executeRaw`INSERT INTO DailyCounter (day, last) VALUES (${day}, 1) ON DUPLICATE KEY UPDATE last = last + 1`;
  const row = await tx.dailyCounter.findUniqueOrThrow({ where: { day } });
  return row.last;
}

export async function placeOrder(input: PlaceOrderInput): Promise<{ token: string }> {
  const { name, phone, address, lines } = validateOrderInput(input);
  const settings = await getSettings();
  if (!settings.shopOpen) throw new OrderError("Sorry, the shop is closed right now.");

  const items = await db.menuItem.findMany({
    where: { id: { in: lines.map((l) => l.id) }, active: true, soldOut: false, category: { active: true } },
    select: { id: true, name: true, price: true },
  });
  if (items.length !== lines.length) {
    throw new OrderError("Some items are sold out or changed. Please check your cart.");
  }
  const byId = new Map(items.map((i) => [i.id, i]));
  const orderItems = lines.map((l) => {
    const item = byId.get(l.id)!;
    return { menuItemId: item.id, name: item.name, price: item.price, qty: l.qty };
  });
  const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const deliveryFee = settings.deliveryFee;

  const shot = input.payment === "WALLET" && input.screenshot ? await saveScreenshot(input.screenshot) : null;
  const token = randomBytes(18).toString("base64url");
  const day = dateOnly(karachiDate());

  try {
    const order = await db.$transaction(async (tx) => {
      const customer = await tx.customer.upsert({
        where: { phone },
        update: { name, lastAddress: address },
        create: { name, phone, lastAddress: address },
      });
      return tx.order.create({
        data: {
          day,
          number: await nextOrderNumber(tx, day),
          token,
          type: "DELIVERY",
          paymentMethod: input.payment,
          status: input.payment === "WALLET" ? "CHECK_PAYMENT" : "NEW",
          customerId: customer.id,
          address,
          subtotal,
          deliveryFee,
          total: subtotal + deliveryFee,
          items: { create: orderItems },
          screenshot: shot ? { create: shot } : undefined,
        },
        select: { id: true },
      });
    });
    emit("counter", "order:changed", { id: order.id });
  } catch (e) {
    if (shot) await deleteUpload(shot.path);
    throw e;
  }
  return { token };
}

const publicSelect = {
  token: true,
  number: true,
  status: true,
  paymentMethod: true,
  subtotal: true,
  deliveryFee: true,
  total: true,
  items: { select: { name: true, qty: true, price: true }, orderBy: { id: "asc" } },
  rider: { select: { name: true, phone: true } },
  screenshot: { select: { id: true } },
} as const;

/** What the customer's status page may see: no address, no other customers, no internal ids. */
export type PublicOrder = {
  token: string;
  number: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  /** Paid by wallet and the shop confirmed it. */
  paid: boolean;
  /** Was a wallet order the shop switched to cash because the money never came. */
  switchedToCash: boolean;
  wallet: boolean;
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: { name: string; qty: number; price: number }[];
  rider: { name: string; phone: string | null } | null;
};

export async function getPublicOrder(token: string): Promise<PublicOrder | null> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const o = await db.order.findUnique({ where: { token }, select: publicSelect });
  if (!o) return null;
  const hadScreenshot = o.screenshot !== null;
  return {
    token: o.token,
    number: o.number,
    status: o.status,
    paymentMethod: o.paymentMethod,
    paid: o.paymentMethod === "WALLET" && o.status !== "CHECK_PAYMENT" && o.status !== "CANCELLED",
    switchedToCash: hadScreenshot && o.paymentMethod === "COD",
    wallet: hadScreenshot,
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    total: o.total,
    items: o.items,
    rider: o.status === "OUT_FOR_DELIVERY" || o.status === "DELIVERED" ? o.rider : null,
  };
}

/** Tell the customer's status page and the counter that an order changed. */
export async function announce(orderId: number) {
  const o = await db.order.findUnique({ where: { id: orderId }, select: { token: true } });
  if (!o) return;
  emit(`order:${o.token}`, "order", await getPublicOrder(o.token));
  emit("counter", "order:changed", { id: orderId });
}

const stampFor: Partial<Record<OrderStatus, keyof Prisma.OrderUpdateInput>> = {
  COOKING: "cookingAt",
  READY: "readyAt",
  OUT_FOR_DELIVERY: "outAt",
  DELIVERED: "deliveredAt",
  COMPLETED: "completedAt",
  CANCELLED: "cancelledAt",
};

/**
 * Set a status and its timestamp, then announce it. No transition rules yet:
 * Phase 2 puts the counter's validated moves (and undo) on top of this.
 */
export async function applyStatus(orderId: number, status: OrderStatus, data: Prisma.OrderUpdateInput = {}) {
  const stamp = stampFor[status];
  await db.order.update({
    where: { id: orderId },
    data: { ...data, status, ...(stamp ? { [stamp]: new Date() } : {}) },
  });
  await announce(orderId);
}
