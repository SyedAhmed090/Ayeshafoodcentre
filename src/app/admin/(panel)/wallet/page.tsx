import { DayPicker } from "@/components/admin/DayPicker";
import { card, PageTitle } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { rs } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { dateOnly, dayParam, karachiTime } from "@/lib/time";

export const metadata = { title: "Wallet orders" };

const RESULT = {
  RECEIVED: { text: "Money came", cls: "bg-ready-tint text-ready-ink" },
  NOT_RECEIVED: { text: "No money", cls: "bg-new-tint text-new-ink" },
  NONE: { text: "Not checked yet", cls: "bg-check-tint text-check-ink" },
};

/** Every order paid by wallet screenshot that day, to tick off against the merchant app's statement. */
export default async function WalletPage({ searchParams }: PageProps<"/admin/wallet">) {
  const day = dayParam((await searchParams).day);
  const orders = await db.order.findMany({
    where: { day: dateOnly(day), screenshot: { isNot: null } },
    orderBy: { number: "asc" },
    select: {
      id: true,
      number: true,
      total: true,
      status: true,
      paymentMethod: true,
      createdAt: true,
      customer: { select: { phone: true } },
      screenshot: { select: { id: true, sha256: true, result: true, checkedAt: true } },
    },
  });
  // A screenshot whose file was also sent with any other order, on any day.
  const dupes = new Set(
    (
      await db.paymentScreenshot.groupBy({
        by: ["sha256"],
        where: { sha256: { in: orders.map((o) => o.screenshot!.sha256) } },
        _count: { _all: true },
        having: { sha256: { _count: { gt: 1 } } },
      })
    ).map((g) => g.sha256),
  );
  const received = orders.filter((o) => o.screenshot!.result === "RECEIVED").reduce((s, o) => s + o.total, 0);

  return (
    <>
      <PageTitle aside={<DayPicker day={day} path="/admin/wallet" />}>Wallet orders</PageTitle>
      <p className="text-[15px] text-muted">
        {orders.length} with a screenshot · {rs(received)} marked as received. Tap a screenshot to open it full size.
      </p>
      {orders.length === 0 && <div className={card}>No wallet orders on this day.</div>}
      <div className="grid gap-3 md:grid-cols-2">
        {orders.map((o) => {
          const shot = o.screenshot!;
          const res = RESULT[shot.result ?? "NONE"];
          return (
            <div key={o.id} className="flex gap-4 rounded-[18px] border border-line bg-surface p-4 shadow-card">
              <a href={`/api/counter/screenshot/${shot.id}`} target="_blank" rel="noopener noreferrer" className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- private, login-only image */}
                <img src={`/api/counter/screenshot/${shot.id}`} alt={`Screenshot for order #${o.number}`} className="h-36 w-24 rounded-xl bg-ground object-cover" />
              </a>
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-2xl font-bold">#{o.number}</span>
                  <span className="text-sm text-muted">{karachiTime(o.createdAt)}</span>
                </div>
                <div className="font-display text-xl font-bold">{rs(o.total)}</div>
                {o.customer && <div className="text-sm text-muted">{formatPhone(o.customer.phone)}</div>}
                <span className={`self-start rounded-lg px-2 py-0.5 text-sm font-semibold ${res.cls}`}>
                  {res.text}
                  {shot.checkedAt && ` · ${karachiTime(shot.checkedAt)}`}
                </span>
                {shot.result === "NOT_RECEIVED" && (
                  <span className="text-sm text-muted">{o.status === "CANCELLED" ? "Cancelled" : "Switched to cash"}</span>
                )}
                {dupes.has(shot.sha256) && <span className="text-sm font-bold text-accent-ink">Same screenshot used on another order</span>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
