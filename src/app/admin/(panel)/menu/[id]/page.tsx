import Link from "next/link";
import { notFound } from "next/navigation";
import { saveItem } from "@/app/admin/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { card, Check, Field, input, PageTitle, PhotoField } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { mediaUrl } from "@/lib/media";

export const metadata = { title: "Menu item" };

export default async function ItemPage({ params, searchParams }: PageProps<"/admin/menu/[id]">) {
  const { id } = await params;
  const item = id === "new" ? null : await db.menuItem.findUnique({ where: { id: Number(id) || 0 } });
  if (id !== "new" && !item) notFound();
  const cats = await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true, name: true } });

  return (
    <>
      <PageTitle aside={<Link href="/admin/menu" className="text-[15px] font-semibold text-muted">← Menu</Link>}>
        {item ? item.name : "New item"}
      </PageTitle>
      {(await searchParams).saved && <p className="font-semibold text-ready-ink">Saved</p>}
      <div className={card}>
        <ActionForm action={saveItem}>
          {item && <input type="hidden" name="id" value={item.id} />}
          <Field label="Name">
            <input name="name" defaultValue={item?.name} required maxLength={60} className={input} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price (Rs)">
              <input name="price" inputMode="numeric" defaultValue={item?.price} required className={input} />
            </Field>
            <Field label="Category">
              <select name="categoryId" defaultValue={item?.categoryId} required className={input}>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="One line under the name (optional)" hint="Shown on the deal card, e.g. 2 burgers · 2 fries · 1.5L drink">
            <input name="description" defaultValue={item?.description ?? ""} maxLength={120} className={input} />
          </Field>
          <Field label="Photo">
            <PhotoField current={mediaUrl(item?.photo)} />
          </Field>
          <div className="w-28">
            <Field label="Order in category">
              <input name="sortOrder" type="number" defaultValue={item?.sortOrder ?? 0} className={input} />
            </Field>
          </div>
          <div className="flex flex-col">
            <Check name="active" label="Shown on the menu" defaultChecked={item?.active ?? true} />
            <Check name="soldOut" label="Sold out" defaultChecked={item?.soldOut} />
            <Check name="featured" label="Today's deal (the big card at the top; only one item)" defaultChecked={item?.featured} />
          </div>
        </ActionForm>
      </div>
    </>
  );
}
