import { describe, expect, it } from "vitest";
import { dayReport, type ReportOrder } from "@/lib/report";

const ali = { id: 1, name: "Ali" };
const bilal = { id: 2, name: "Bilal" };
const o = (p: Partial<ReportOrder>): ReportOrder => ({ status: "DELIVERED", type: "DELIVERY", paymentMethod: "COD", total: 1000, rider: ali, ...p });

describe("dayReport", () => {
  it("adds up finished orders and splits cash, wallet and who holds the cash", () => {
    const r = dayReport([
      o({}), // Ali, cash 1000
      o({ total: 500, paymentMethod: "WALLET" }), // Ali, paid by wallet: nothing to hand over
      o({ total: 700, rider: bilal }), // Bilal, cash 700
      o({ status: "COMPLETED", type: "WALKIN", total: 300, rider: null }), // counter drawer
      o({ status: "COOKING", total: 900, rider: null }), // still open
      o({ status: "OUT_FOR_DELIVERY", total: 400, rider: bilal }), // still open
      o({ status: "CANCELLED", total: 2000, rider: null }),
    ]);
    expect(r).toMatchObject({ orders: 6, cancelled: 1, open: 2, sales: 2500, cash: 2000, wallet: 500, counterCash: 300 });
    expect(r.riders).toEqual([
      { id: 1, name: "Ali", delivered: 2, cash: 1000 },
      { id: 2, name: "Bilal", delivered: 1, cash: 700 },
    ]);
    // Everything in cash is either in the drawer or with a rider.
    expect(r.counterCash + r.riders.reduce((s, x) => s + x.cash, 0)).toBe(r.cash);
  });

  it("is all zeros for a day with no orders", () => {
    expect(dayReport([])).toEqual({ orders: 0, cancelled: 0, open: 0, sales: 0, cash: 0, wallet: 0, counterCash: 0, riders: [] });
  });
});
