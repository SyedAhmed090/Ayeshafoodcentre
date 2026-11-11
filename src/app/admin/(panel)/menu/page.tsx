import Link from "next/link";
import { saveCategory } from "@/app/admin/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { SoldOutSwitch } from "@/components/admin/SoldOutSwitch";
import { btn, card, Check, Field, input, PageTitle, Thumb } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { mediaUrl } from "@/lib/media";
import { rs } from "@/lib/money";

export const metadata = { title: "Menu" };

export default async function MenuAdmin() {
  const cats = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: { items: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } },
  });

  return (
    <>
      <PageTitle
        aside={
          <Link href="/admin/menu/new" className={btn}>
            Add item
          </Link>
        }
      >
        Menu
      </PageTitle>

      {cats.map((c) => (
        <section key={c.id} className={card}>
          <ActionForm action={saveCategory} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={c.id} />
            <div className="min-w-48 grow">
              <Field label="Category">
                <input name="name" defaultValue={c.name} required maxLength={40} className={input} />
              </Field>
            </div>
            <div className="w-24">
              <Field label="Order">
                <input name="sortOrder" type="number" defaultValue={c.sortOrder} className={input} />
              </Field>
            </div>
            <Check name="active" label="Shown" defaultChecked={c.active} />
          </ActionForm>

          <ul className="divide-y divide-line">
            {c.items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-2.5">
                <Thumb src={mediaUrl(i.photo)} />
                <Link href={`/admin/menu/${i.id}`} className="flex min-w-0 grow flex-col">
                  <span className="truncate font-semibold">
                    {i.name}
                    {i.featured && <span className="ml-2 rounded-md bg-accent px-1.5 py-0.5 text-xs font-bold text-white">DEAL</span>}
                    {!i.active && <span className="ml-2 text-sm font-normal text-muted">(hidden)</span>}
                  </span>
                  <span className="text-[15px] text-muted">{rs(i.price)}</span>
                </Link>
                <SoldOutSwitch id={i.id} soldOut={i.soldOut} />
              </li>
            ))}
            {c.items.length === 0 && <li className="py-2.5 text-muted">No items yet.</li>}
          </ul>
        </section>
      ))}

      <section className={card}>
        <h2 className="font-display text-xl font-bold">New category</h2>
        <ActionForm action={saveCategory} submit="Add category" className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 grow">
            <Field label="Name">
              <input name="name" required maxLength={40} className={input} />
            </Field>
          </div>
          <div className="w-24">
            <Field label="Order">
              <input name="sortOrder" type="number" defaultValue={cats.length} className={input} />
            </Field>
          </div>
          <input type="hidden" name="active" value="on" />
        </ActionForm>
      </section>
    </>
  );
}
