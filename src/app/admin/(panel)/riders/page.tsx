import Link from "next/link";
import { btn, card, PageTitle, Thumb } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { mediaUrl } from "@/lib/media";

export const metadata = { title: "Riders" };

export default async function RidersAdmin() {
  const riders = await db.rider.findMany({ orderBy: [{ active: "desc" }, { id: "asc" }] });
  return (
    <>
      <PageTitle
        aside={
          <Link href="/admin/riders/new" className={btn}>
            Add rider
          </Link>
        }
      >
        Riders
      </PageTitle>
      <ul className={`${card} divide-y divide-line py-2`}>
        {riders.map((r) => (
          <li key={r.id}>
            <Link href={`/admin/riders/${r.id}`} className="flex items-center gap-3 py-2.5">
              <Thumb src={mediaUrl(r.photo)} />
              <span className="flex min-w-0 grow flex-col">
                <span className="font-semibold">{r.name}</span>
                <span className="text-[15px] text-muted">{r.phone ?? "No phone"}</span>
              </span>
              {!r.active ? (
                <span className="text-sm text-muted">Not working</span>
              ) : (
                <span className={`rounded-lg px-2 py-0.5 text-sm font-semibold ${r.status === "FREE" ? "bg-ready-tint text-ready-ink" : "bg-busy text-ink-3"}`}>
                  {r.status === "FREE" ? "Free" : "Out on delivery"}
                </span>
              )}
            </Link>
          </li>
        ))}
        {riders.length === 0 && <li className="py-2.5 text-muted">No riders yet.</li>}
      </ul>
    </>
  );
}
