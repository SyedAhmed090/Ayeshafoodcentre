// The owner's daily report, worked out from the day's orders. Pure: no database here, so it is unit tested.

export type ReportOrder = {
  status: string;
  type: "DELIVERY" | "WALKIN";
  paymentMethod: "COD" | "WALLET";
  total: number;
  rider: { id: number; name: string } | null;
};

export type DayReport = {
  /** Every order that wasn't cancelled, finished or not. */
  orders: number;
  cancelled: number;
  /** Not delivered or handed over yet; their money isn't in the totals below. */
  open: number;
  /** Money from finished orders (delivered + walk-ins handed over). */
  sales: number;
  cash: number;
  wallet: number;
  /** Walk-in cash in the counter's drawer. */
  counterCash: number;
  /** Cash each rider should hand over: their delivered cash orders. */
  riders: { id: number; name: string; delivered: number; cash: number }[];
};

const DONE = new Set(["DELIVERED", "COMPLETED"]);

export function dayReport(list: ReportOrder[]): DayReport {
  const r: DayReport = { orders: 0, cancelled: 0, open: 0, sales: 0, cash: 0, wallet: 0, counterCash: 0, riders: [] };
  const riders = new Map<number, DayReport["riders"][number]>();
  for (const o of list) {
    if (o.status === "CANCELLED") {
      r.cancelled++;
      continue;
    }
    r.orders++;
    if (!DONE.has(o.status)) {
      r.open++;
      continue;
    }
    r.sales += o.total;
    if (o.paymentMethod === "WALLET") r.wallet += o.total;
    else r.cash += o.total;
    if (o.type === "WALKIN" && o.paymentMethod === "COD") r.counterCash += o.total;
    if (o.status === "DELIVERED" && o.rider) {
      const row = riders.get(o.rider.id) ?? { id: o.rider.id, name: o.rider.name, delivered: 0, cash: 0 };
      row.delivered++;
      if (o.paymentMethod === "COD") row.cash += o.total;
      riders.set(o.rider.id, row);
    }
  }
  r.riders = [...riders.values()].sort((a, b) => a.name.localeCompare(b.name));
  return r;
}
