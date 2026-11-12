// The database rules that keep orders straight: run against the local database from .env (skipped without one).
// Creates its own category, item, riders and orders, and deletes them afterwards.
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const hasDb = !!process.env.DATABASE_URL;
// Test phones are 0300999xxxx; each order gets its own unless a test passes one (3 open orders per phone is the limit).
const PHONE_PREFIX = "0300999";
let phoneSeq = 0;
const newPhone = () => PHONE_PREFIX + String(1000 + (phoneSeq++ % 9000));

describe.skipIf(!hasDb)("orders in the database", async () => {
  const { db } = await import("@/lib/db");
  const o = await import("@/lib/orders");
  const ids = { category: 0, item: 0, riders: [] as number[], orders: [] as number[] };
  let before: { shopOpen: boolean; openMinute: number | null; closeMinute: number | null; minOrder: number };

  const order = async (name = "Test Ali", clientKey: string | null = null, phone = newPhone()) => {
    const { token } = await o.placeOrder({ name, phone, address: "House 1, Block A", payment: "COD", lines: [{ id: ids.item, qty: 1 }], screenshot: null, clientKey });
    const row = await db.order.findUniqueOrThrow({ where: { token }, select: { id: true } });
    if (!ids.orders.includes(row.id)) ids.orders.push(row.id);
    return { id: row.id, token };
  };
  const ready = async () => {
    const { id } = await order();
    await db.order.update({ where: { id }, data: { status: "READY" } });
    return id;
  };
  const riderStatus = async (id: number) => (await db.rider.findUniqueOrThrow({ where: { id } })).status;

  beforeAll(async () => {
    before = await db.settings.findUniqueOrThrow({ where: { id: 1 }, select: { shopOpen: true, openMinute: true, closeMinute: true, minOrder: true } });
    await db.settings.update({ where: { id: 1 }, data: { shopOpen: true, openMinute: null, closeMinute: null, minOrder: 0 } });
    await db.customer.deleteMany({ where: { phone: { startsWith: PHONE_PREFIX } } });
    ids.category = (await db.category.create({ data: { name: "Test" } })).id;
    ids.item = (await db.menuItem.create({ data: { categoryId: ids.category, name: "Test burger", price: 500 } })).id;
    for (const name of ["Test rider A", "Test rider B"]) ids.riders.push((await db.rider.create({ data: { name, pinHash: "x" } })).id);
  });

  afterAll(async () => {
    await db.order.deleteMany({ where: { id: { in: ids.orders } } });
    await db.order.deleteMany({ where: { customer: { phone: { startsWith: PHONE_PREFIX } } } });
    await db.customer.deleteMany({ where: { phone: { startsWith: PHONE_PREFIX } } });
    await db.rider.deleteMany({ where: { id: { in: ids.riders } } });
    await db.menuItem.deleteMany({ where: { id: ids.item } });
    await db.category.deleteMany({ where: { id: ids.category } });
    await db.settings.update({ where: { id: 1 }, data: before });
  });

  it("a retried checkout places the order once", async () => {
    const key = "a".repeat(30) + Date.now().toString(16).padStart(6, "0").slice(-6);
    const phone = newPhone();
    const [a, b] = await Promise.all([order("Test Ali", key, phone), order("Test Ali", key, phone)]);
    const c = await order("Test Ali", key, phone);
    expect(b.token).toBe(a.token);
    expect(c.token).toBe(a.token);
  });

  it("keeps the name on the order when the same phone orders again", async () => {
    const phone = newPhone();
    const first = await order("Test Ali", null, phone);
    await order("Test Bilal", null, phone);
    expect((await db.order.findUniqueOrThrow({ where: { id: first.id } })).customerName).toBe("Test Ali");
  });

  it("a double tap moves an order once", async () => {
    const { id } = await order();
    const results = await Promise.all([o.moveOrder(id, "startCooking", 0), o.moveOrder(id, "startCooking", 0)]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("one rider can't get two orders", async () => {
    const [x, y] = [await ready(), await ready()];
    const results = await Promise.all([o.assignRider(x, ids.riders[0]), o.assignRider(y, ids.riders[0])]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await riderStatus(ids.riders[0])).toBe("OUT");
    // Undo of the pick frees the rider again.
    const sent = results[0] ? x : y;
    expect(await o.undoOrder(sent, "OUT_FOR_DELIVERY")).toBe(true);
    expect(await riderStatus(ids.riders[0])).toBe("FREE");
  });

  it("the owner can cancel an order stuck with a rider, and the rider is free again", async () => {
    const id = await ready();
    expect(await o.assignRider(id, ids.riders[1])).toBe(true);
    expect(await o.cancelUnfinished(id)).toBe(true);
    expect(await riderStatus(ids.riders[1])).toBe("FREE");
    expect(await o.cancelUnfinished(id)).toBe(false);
  });

  it("a cash order can be cancelled; a finished one can't", async () => {
    const { id } = await order();
    expect(await o.cancelUnfinished(id)).toBe(true);
    const done = await ready();
    await db.order.update({ where: { id: done }, data: { status: "DELIVERED" } });
    expect(await o.cancelUnfinished(done)).toBe(false);
  });

  it("one phone can have 3 unfinished orders, not 4", async () => {
    const phone = newPhone();
    for (let i = 0; i < 3; i++) await order("Test Ali", null, phone);
    await expect(order("Test Ali", null, phone)).rejects.toThrow("orders on the way");
  });

  it("blocking a phone cancels its orders and stops new ones", async () => {
    const phone = newPhone();
    const a = await order("Test Prank", null, phone);
    const b = await order("Test Prank", null, phone);
    expect(await o.blockOrderPhone(a.id)).toBe(2);
    expect((await db.order.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("CANCELLED");
    await expect(order("Test Prank", null, phone)).rejects.toThrow("call the shop");
  });

  it("refuses food under the minimum order", async () => {
    await db.settings.update({ where: { id: 1 }, data: { minOrder: 600 } });
    try {
      await expect(order()).rejects.toThrow("smallest order");
    } finally {
      await db.settings.update({ where: { id: 1 }, data: { minOrder: 0 } });
    }
  });
});
