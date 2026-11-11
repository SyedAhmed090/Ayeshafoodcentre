import Link from "next/link";
import { DayPicker } from "@/components/admin/DayPicker";
import { card, PageTitle } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { rs } from "@/lib/money";
import { dayReport } from "@/lib/report";
import { dateOnly, dayParam, karachiDate } from "@/lib/time";

export const metadata = { title: "Daily report" };

export default async function ReportPage({ searchParams }: PageProps<"/admin">) {
  const day = dayParam((await searchParams).day);
  const orders = await db.order.findMany({
    where: { day: dateOnly(day) },
    select: { status: true, type: true, paymentMethod: true, total: true, rider: { select: { id: true, name: true } } },
  });
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
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-[18px] border border-line bg-surface p-4 shadow-card">
      <div className="text-sm font-semibold text-muted">{label}</div>
      <div className="font-display text-[26px] leading-tight font-bold tracking-[-0.5px]">{value}</div>
      {sub && <div className="text-sm text-muted">{sub}</div>}
    </div>
  );
}
