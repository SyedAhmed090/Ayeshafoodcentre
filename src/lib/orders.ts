import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { deferPush } from "@/lib/push";
import { emit } from "@/lib/realtime";
import { getSettings } from "@/lib/settings";
import { dateOnly, karachiDate, shopStatus } from "@/lib/time";
import { rs } from "@/lib/money";
import { deleteUpload, saveScreenshot } from "@/lib/uploads";
import {
  MOVES,
  OrderError,
  undoTarget,
  validateOrderInput,
  type CartLine,
  type CounterAction,
  type PlaceOrderInput,
} from "@/lib/order-rules";
import type { OrderStatus, PaymentMethod } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

export { OrderError, type CartLine };

/** Thrown inside a transaction to roll it back when an order or rider had already changed. */
class RiderBusy extends Error {}

/** Next number for a Karachi day. The upsert locks the day's row until the transaction ends, so two orders can't share a number. */
async function nextOrderNumber(tx: Prisma.TransactionClient, day: Date): Promise<number> {
  await tx.$executeRaw`INSERT INTO DailyCounter (day, last) VALUES (${day}, 1) ON DUPLICATE KEY UPDATE last = last + 1`;
  const row = await tx.dailyCounter.findUniqueOrThrow({ where: { day } });
  return row.last;
}

export async function placeOrder(input: PlaceOrderInput): Promise<{ token: string }> {
  const { name, phone, address, lines, clientKey } = validateOrderInput(input);
  const placed = await orderByKey(clientKey);
  if (placed) return placed;
  const settings = await getSettings();
  const { open, opensAt } = shopStatus(settings);
  if (!open) throw new OrderError(opensAt ? `Sorry, the shop is closed. We take orders from ${opensAt}.` : "Sorry, the shop is closed right now.");

  const customer = await db.customer.findUnique({ where: { phone }, select: { blocked: true } });
  if (customer?.blocked) throw new OrderError("Please call the shop to place your order.");
  // shortcut: count-then-insert, so two orders sent at the same moment can make it 4; fine for stopping a prankster.
  const openOrders = await db.order.count({ where: { customer: { phone }, status: { in: UNFINISHED } } });
  if (openOrders >= MAX_OPEN_PER_PHONE) throw new OrderError("You already have orders on the way. Please call the shop to order more.");

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
  if (subtotal < settings.minOrder) throw new OrderError(`The smallest order we deliver is ${rs(settings.minOrder)} of food.`);
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
          customerName: name,
          address,
          clientKey,
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
    // The same checkout sent twice at once: the first one won, answer with its order.
    const first = (e as { code?: string }).code === "P2002" ? await orderByKey(clientKey) : null;
    if (first) return first;
    throw e;
  }
  return { token };
}

/** The order an earlier try of this checkout already placed, if any. */
async function orderByKey(clientKey: string | null): Promise<{ token: string } | null> {
  return clientKey ? db.order.findUnique({ where: { clientKey }, select: { token: true } }) : null;
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
  screenshot: { select: { result: true } },
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
  /** Cancelled at the payment check because the money never came. */
  paymentNotFound: boolean;
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
    paymentNotFound: o.status === "CANCELLED" && o.paymentMethod === "WALLET" && o.screenshot?.result === "NOT_RECEIVED",
    wallet: hadScreenshot,
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    total: o.total,
    items: o.items,
    rider: o.status === "OUT_FOR_DELIVERY" || o.status === "DELIVERED" ? o.rider : null,
  };
}

/** Tell the customer's status page, the counter and (if given) a rider's phone that an order changed. */
export async function announce(orderId: number, riderId: number | null = null) {
  const o = await db.order.findUnique({ where: { id: orderId }, select: { token: true } });
  if (!o) return;
  emit(`order:${o.token}`, "order", await getPublicOrder(o.token));
  emit("counter", "order:changed", { id: orderId });
  if (riderId) emit(`rider:${riderId}`, "rider:changed", {});
}

// ── Counter ─────────────────────────────────────────────────────────

export type BoardOrder = {
  id: number;
  number: number;
  status: OrderStatus;
  type: "DELIVERY" | "WALKIN";
  paymentMethod: PaymentMethod;
  total: number;
  items: { qty: number; name: string }[];
  /** "10 Nov" for an order from an earlier day (numbers restart daily, so it can share a number with today's), else null. */
  from: string | null;
};

/** Everything on the counter board: orders in Check, New, Cooking and Ready, newest first (as designed). */
export async function getBoard(): Promise<BoardOrder[]> {
  const today = dateOnly(karachiDate()).getTime();
  const rows = await db.order.findMany({
    where: { status: { in: ["CHECK_PAYMENT", "NEW", "COOKING", "READY"] } },
    orderBy: { id: "desc" },
    select: {
      id: true,
      number: true,
      status: true,
      type: true,
      paymentMethod: true,
      total: true,
      day: true,
      items: { select: { qty: true, name: true }, orderBy: { id: "asc" } },
    },
  });
  return rows.map(({ day, ...o }) => ({
    ...o,
    from: day.getTime() < today ? day.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }) : null,
  }));
}

/**
 * One counter button press. The update only matches while the order is still in the
 * expected status, so a double tap or a second device can't move it twice.
 * Returns false if the order had already moved.
 */
export async function moveOrder(orderId: number, action: CounterAction, deviceId: number): Promise<boolean> {
  const m = MOVES[action];
  const now = new Date();
  const data: Prisma.OrderUpdateManyMutationInput = { status: m.to };
  if (m.to === "COOKING") data.cookingAt = now;
  if (m.to === "READY") data.readyAt = now;
  if (m.to === "COMPLETED") data.completedAt = now;
  if (m.to === "CANCELLED") data.cancelledAt = now;
  if (m.from === "CHECK_PAYMENT") data.paymentCheckedAt = now;
  if (action === "switchToCash") data.paymentMethod = "COD";

  const moved = await db.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: m.from, ...(m.walkinOnly ? { type: "WALKIN" } : {}) },
      data,
    });
    if (count === 0) return false;
    if (m.from === "CHECK_PAYMENT") {
      await tx.paymentScreenshot.update({
        where: { orderId },
        data: { result: action === "moneyCame" ? "RECEIVED" : "NOT_RECEIVED", checkedById: deviceId, checkedAt: now },
      });
    }
    return true;
  });
  if (moved) await announce(orderId);
  return moved;
}

/** Undo the order's last change if it is still within the undo window. Returns false if it can't be undone. */
export async function undoOrder(orderId: number, expectedStatus: OrderStatus): Promise<boolean> {
  const o = await db.order.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      type: true,
      riderId: true,
      createdAt: true,
      paymentCheckedAt: true,
      cookingAt: true,
      readyAt: true,
      outAt: true,
      deliveredAt: true,
      completedAt: true,
      cancelledAt: true,
      screenshot: { select: { id: true } },
    },
  });
  if (!o || o.status !== expectedStatus) return false;
  const target = undoTarget({ ...o, hasScreenshot: o.screenshot !== null }, new Date());
  if (!target) return false;

  const data: Prisma.OrderUpdateManyMutationInput = { status: target.to };
  if (o.status === "COOKING") data.cookingAt = null;
  if (o.status === "READY") data.readyAt = null;
  if (o.status === "COMPLETED") data.completedAt = null;
  if (o.status === "DELIVERED") data.deliveredAt = null;
  if (o.status === "OUT_FOR_DELIVERY") Object.assign(data, { outAt: null, riderId: null });
  if (target.to === "CANCELLED") data.cancelledAt = new Date();
  if (target.to === "CHECK_PAYMENT") Object.assign(data, { paymentCheckedAt: null, cancelledAt: null, paymentMethod: "WALLET" });

  const undone = await db.$transaction(async (tx) => {
    // A rider already sent out again can't take back the delivery: they'd be on two orders.
    if (o.riderId && o.status === "DELIVERED") {
      const r = await tx.rider.updateMany({ where: { id: o.riderId, status: "FREE" }, data: { status: "OUT" } });
      if (r.count === 0) return false;
    }
    const { count } = await tx.order.updateMany({ where: { id: orderId, status: o.status }, data });
    if (count === 0) throw new RiderBusy(); // rolls back the rider change above
    if (target.to === "CHECK_PAYMENT") {
      await tx.paymentScreenshot.update({ where: { orderId }, data: { result: null, checkedById: null, checkedAt: null } });
    }
    // The rider who was assigned is free again.
    if (o.riderId && o.status === "OUT_FOR_DELIVERY") await tx.rider.update({ where: { id: o.riderId }, data: { status: "FREE" } });
    return true;
  }).catch((e) => {
    if (e instanceof RiderBusy) return false;
    throw e;
  });
  if (undone) await announce(orderId, o.riderId);
  return undone;
}

/** A walk-in order: paid in cash at the counter, so it starts in New. */
export async function createWalkin(lines: CartLine[]): Promise<{ id: number; number: number }> {
  if (
    lines.length === 0 ||
    lines.length > 30 ||
    new Set(lines.map((l) => l.id)).size !== lines.length ||
    lines.some((l) => !Number.isInteger(l.id) || !Number.isInteger(l.qty) || l.qty < 1 || l.qty > 50)
  ) {
    throw new OrderError("Bad walk-in order");
  }
  const items = await db.menuItem.findMany({
    where: { id: { in: lines.map((l) => l.id) }, active: true, soldOut: false, category: { active: true } },
    select: { id: true, name: true, price: true },
  });
  if (items.length !== lines.length) throw new OrderError("An item is sold out");
  const byId = new Map(items.map((i) => [i.id, i]));
  const orderItems = lines.map((l) => {
    const i = byId.get(l.id)!;
    return { menuItemId: i.id, name: i.name, price: i.price, qty: l.qty };
  });
  const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const day = dateOnly(karachiDate());
  const order = await db.$transaction(async (tx) =>
    tx.order.create({
      data: {
        day,
        number: await nextOrderNumber(tx, day),
        token: randomBytes(18).toString("base64url"),
        type: "WALKIN",
        paymentMethod: "COD",
        status: "NEW",
        subtotal,
        deliveryFee: 0,
        total: subtotal,
        items: { create: orderItems },
      },
      select: { id: true, number: true },
    }),
  );
  emit("counter", "order:changed", { id: order.id });
  return order;
}

/** What the payment check screen needs, including whether the same screenshot was used on another order. */
export async function getCheckDetails(orderId: number) {
  const o = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      number: true,
      status: true,
      total: true,
      customer: { select: { phone: true } },
      screenshot: { select: { id: true, sha256: true } },
    },
  });
  if (!o || !o.screenshot) return null;
  const reused = await db.paymentScreenshot.count({ where: { sha256: o.screenshot.sha256, orderId: { not: o.id } } });
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    total: o.total,
    customerPhone: o.customer?.phone ?? null,
    screenshotId: o.screenshot.id,
    reused: reused > 0,
  };
}

// ── Owner ───────────────────────────────────────────────────────────

/** Statuses an order can be stuck in: placed but never delivered or handed over. */
export const UNFINISHED: OrderStatus[] = ["CHECK_PAYMENT", "NEW", "COOKING", "READY", "OUT_FOR_DELIVERY"];

/** More unfinished orders than this from one phone is a prankster or a mistake: they call the shop instead. */
const MAX_OPEN_PER_PHONE = 3;

/** Block the phone behind an order (fake orders) and cancel every unfinished order from it. Returns how many were cancelled. */
export async function blockOrderPhone(orderId: number): Promise<number> {
  const o = await db.order.findUnique({ where: { id: orderId }, select: { customerId: true } });
  if (!o?.customerId) return 0;
  await db.customer.update({ where: { id: o.customerId }, data: { blocked: true } });
  const open = await db.order.findMany({ where: { customerId: o.customerId, status: { in: UNFINISHED } }, select: { id: true } });
  let cancelled = 0;
  for (const { id } of open) if (await cancelUnfinished(id)) cancelled++;
  return cancelled;
}

/**
 * The owner cancels an unfinished order: a customer who called to cancel, a fake order, or one
 * stuck with a rider who left. A rider out with it is free again. False if it had already finished.
 */
export async function cancelUnfinished(orderId: number): Promise<boolean> {
  const o = await db.order.findUnique({ where: { id: orderId }, select: { status: true, riderId: true } });
  if (!o || !UNFINISHED.includes(o.status)) return false;
  const done = await db.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({ where: { id: orderId, status: o.status }, data: { status: "CANCELLED", cancelledAt: new Date() } });
    if (count === 0) return false;
    if (o.status === "OUT_FOR_DELIVERY" && o.riderId) await tx.rider.update({ where: { id: o.riderId }, data: { status: "FREE" } });
    return true;
  });
  if (done) await announce(orderId, o.riderId);
  return done;
}

// ── Riders ──────────────────────────────────────────────────────────

/** What the rider takes from the customer: nothing if the wallet payment was confirmed. */
const toCollect = (o: { paymentMethod: PaymentMethod; total: number }) => (o.paymentMethod === "COD" ? o.total : 0);

/** The pick-a-rider screen: the Ready delivery order and every active rider. Null if the order isn't waiting for a rider. */
export async function getPickDetails(orderId: number) {
  const o = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      number: true,
      status: true,
      type: true,
      paymentMethod: true,
      total: true,
      address: true,
      customerName: true,
      items: { select: { qty: true, name: true }, orderBy: { id: "asc" } },
    },
  });
  if (!o || o.status !== "READY" || o.type !== "DELIVERY") return null;
  const riders = await db.rider.findMany({
    where: { active: true },
    orderBy: { id: "asc" },
    select: { id: true, name: true, photo: true, status: true },
  });
  return {
    order: { id: o.id, number: o.number, items: o.items, customerName: o.customerName ?? "", address: o.address ?? "", collect: toCollect(o) },
    riders,
  };
}

/**
 * Counter taps a free rider: READY → OUT_FOR_DELIVERY and the rider goes OUT, together or not at all.
 * Returns false if the order or the rider had already changed (double tap, another device).
 */
export async function assignRider(orderId: number, riderId: number): Promise<boolean> {
  const assigned = await db
    .$transaction(async (tx) => {
      // The rider row first: being FREE is what keeps a rider to one order at a time.
      const r = await tx.rider.updateMany({ where: { id: riderId, active: true, status: "FREE" }, data: { status: "OUT" } });
      if (r.count === 0) throw new RiderBusy();
      const o = await tx.order.updateMany({
        where: { id: orderId, status: "READY", type: "DELIVERY" },
        data: { status: "OUT_FOR_DELIVERY", riderId, outAt: new Date() },
      });
      if (o.count === 0) throw new RiderBusy();
      return true;
    })
    .catch((e) => {
      if (e instanceof RiderBusy) return false;
      throw e;
    });
  if (assigned) {
    await announce(orderId, riderId);
    const o = await db.order.findUnique({ where: { id: orderId }, select: { number: true } });
    if (o) deferPush(riderId, o.number);
  }
  return assigned;
}

/** The rider taps Delivered: OUT_FOR_DELIVERY → DELIVERED for their own order, and they are FREE again. */
export async function markDelivered(orderId: number, riderId: number): Promise<boolean> {
  const done = await db.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { id: orderId, riderId, status: "OUT_FOR_DELIVERY" },
      data: { status: "DELIVERED", deliveredAt: new Date() },
    });
    if (count === 0) return false;
    await tx.rider.update({ where: { id: riderId }, data: { status: "FREE" } });
    return true;
  });
  if (done) await announce(orderId, riderId);
  return done;
}

export type RiderOrder = {
  id: number;
  number: number;
  collect: number;
  itemCount: number;
  customerName: string;
  phone: string | null;
  address: string;
};

/** The one order this rider is out with, or null. Only the rider's own phone may load this. */
export async function getRiderOrder(riderId: number): Promise<RiderOrder | null> {
  const o = await db.order.findFirst({
    where: { riderId, status: "OUT_FOR_DELIVERY" },
    orderBy: { outAt: "desc" },
    select: {
      id: true,
      number: true,
      paymentMethod: true,
      total: true,
      address: true,
      customerName: true,
      customer: { select: { phone: true } },
      items: { select: { qty: true } },
    },
  });
  if (!o) return null;
  return {
    id: o.id,
    number: o.number,
    collect: toCollect(o),
    itemCount: o.items.reduce((n, i) => n + i.qty, 0),
    customerName: o.customerName ?? "",
    phone: o.customer?.phone ?? null,
    address: o.address ?? "",
  };
}
