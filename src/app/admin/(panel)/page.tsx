import Link from "next/link";
import { blockPhone, cancelOrder } from "@/app/admin/actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { DayPicker } from "@/components/admin/DayPicker";
import { card, PageTitle } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { rs } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { UNFINISHED } from "@/lib/orders";
import { dayReport } from "@/lib/report";
import { dateOnly, dayParam, karachiDate, karachiTime } from "@/lib/time";

export const metadata = { title: "Daily report" };

export default async function ReportPage({ searchParams }: PageProps<"/admin">) {
  const day = dayParam((await searchParams).day);
  const [orders, unfinished] = await Promise.all([
    db.order.findMany({
      where: { day: dateOnly(day) },
      select: { status: true, type: true, paymentMethod: true, total: true, rider: { select: { id: true, name: true } } },
    }),
    // Every day, not just the one shown: a stuck order from last week needs cancelling too.
    db.order.findMany({
      where: { status: { in: UNFINISHED } },
      orderBy: { id: "asc" },
      select: {
        id: true,
        number: true,
        status: true,
        type: true,
        total: true,
        createdAt: true,
        customerName: true,
        customer: { select: { phone: true } },
        rider: { select: { name: true } },
      },
    }),
  ]);
  const r = dayReport(orders);
  const isToday = day === karachiDate();

  return (
    <>
      <PageTitle aside={<DayPicker day={day} path="/admin" />}>{isToday ? "Today" : day}</PageTitle>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Orders" value={String(r.orders)} />
        <Stat label="Sales" value={rs(r.sales)} />
        <Stat label="Cash" value={rs(r.cash)} />
        <Stat label="Wallet" value={rs(r.wallet)} sub={<Link href={`/admin/wallet?day=${day}`} className="underline">See screenshots</Link>} />
      </div>
      {(r.open > 0 || r.cancelled > 0) && (
        <p className="text-[15px] text-muted">
          {r.open > 0 && `${r.open} order${r.open === 1 ? "" : "s"} not finished yet (not counted in sales). `}
          {r.cancelled > 0 && `${r.cancelled} cancelled.`}
        </p>
      )}

      <section className={card}>
        <h2 className="font-display text-xl font-bold">Cash to hand over</h2>
        <table className="w-full text-left text-[15px]">
          <thead className="text-sm text-muted">
            <tr>
              <th className="py-2 font-semibold">Who</th>
              <th className="py-2 font-semibold">Delivered</th>
              <th className="py-2 text-right font-semibold">Cash</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            <tr>
              <td className="py-2.5">Counter (walk-ins)</td>
              <td className="py-2.5 text-muted">–</td>
              <td className="py-2.5 text-right font-semibold">{rs(r.counterCash)}</td>
            </tr>
            {r.riders.map((x) => (
              <tr key={x.id}>
                <td className="py-2.5">{x.name}</td>
                <td className="py-2.5">{x.delivered}</td>
                <td className="py-2.5 text-right font-semibold">{rs(x.cash)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ink">
              <td className="py-2.5 font-bold" colSpan={2}>
                Total cash
              </td>
              <td className="py-2.5 text-right font-bold">{rs(r.cash)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {unfinished.length > 0 && (
        <section className={card}>
          <div>
            <h2 className="font-display text-xl font-bold">Not finished</h2>
            <p className="text-sm text-muted">
              Cancel an order the customer called off, or one stuck with a rider who left. Block a fake order&apos;s number: its orders are
              cancelled and it can&apos;t order online again (unblock in Settings).
            </p>
          </div>
          <ul className="divide-y divide-line">
            {unfinished.map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-2.5 text-[15px]">
                <div className="min-w-0 grow">
                  <div className="font-semibold">
                    #{o.number} · {STATUS[o.status]} · {rs(o.total)}
                  </div>
                  <div className="truncate text-sm text-muted">
                    {karachiDate(o.createdAt) === karachiDate() ? karachiTime(o.createdAt) : `${karachiDate(o.createdAt)} ${karachiTime(o.createdAt)}`}
                    {" · "}
                    {o.type === "WALKIN" ? "Walk-in" : `${o.customerName} · ${o.customer ? formatPhone(o.customer.phone) : ""}`}
                    {o.rider && ` · ${o.rider.name}`}
                  </div>
                </div>
                {o.customer && <ConfirmButton label="Block" confirm="Yes, block" action={blockPhone.bind(null, o.id)} />}
                <ConfirmButton label="Cancel" confirm={`Yes, cancel #${o.number}`} action={cancelOrder.bind(null, o.id)} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

const STATUS: Record<string, string> = {
  CHECK_PAYMENT: "Checking payment",
  NEW: "New",
  COOKING: "Cooking",
  READY: "Ready",
  OUT_FOR_DELIVERY: "Out with rider",
};

function Stat({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-[18px] border border-line bg-surface p-4 shadow-card">
      <div className="text-sm font-semibold text-muted">{label}</div>
      <div className="font-display text-[26px] leading-tight font-bold tracking-[-0.5px]">{value}</div>
      {sub && <div className="text-sm text-muted">{sub}</div>}
    </div>
  );
}
