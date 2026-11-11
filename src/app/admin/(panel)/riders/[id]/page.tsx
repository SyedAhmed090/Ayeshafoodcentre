import Link from "next/link";
import { notFound } from "next/navigation";
import { saveRider } from "@/app/admin/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { card, Check, Field, input, PageTitle, PhotoField } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { mediaUrl } from "@/lib/media";

export const metadata = { title: "Rider" };

export default async function RiderPage({ params, searchParams }: PageProps<"/admin/riders/[id]">) {
  const { id } = await params;
  const rider = id === "new" ? null : await db.rider.findUnique({ where: { id: Number(id) || 0 } });
  if (id !== "new" && !rider) notFound();

  return (
    <>
      <PageTitle aside={<Link href="/admin/riders" className="text-[15px] font-semibold text-muted">← Riders</Link>}>
        {rider ? rider.name : "New rider"}
      </PageTitle>
      {(await searchParams).saved && <p className="font-semibold text-ready-ink">Saved</p>}
      <div className={card}>
        <ActionForm action={saveRider}>
          {rider && <input type="hidden" name="id" value={rider.id} />}
          <Field label="Name">
            <input name="name" defaultValue={rider?.name} required maxLength={40} className={input} />
          </Field>
          <Field label="Phone" hint="Customers see a Call rider button on their order page.">
            <input name="phone" type="tel" defaultValue={rider?.phone ?? ""} className={input} />
          </Field>
          <Field label="Photo" hint="Riders log in by tapping their photo.">
            <PhotoField current={mediaUrl(rider?.photo)} />
          </Field>
          <Field label={rider ? "New PIN (leave empty to keep the old one)" : "PIN"} hint="4 digits. Changing it logs the rider's phone out.">
            <input name="pin" inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="off" required={!rider} className={`${input} w-32`} />
          </Field>
          <Check name="active" label="Working here (shown on the rider and counter screens)" defaultChecked={rider?.active ?? true} />
        </ActionForm>
      </div>
    </>
  );
}
