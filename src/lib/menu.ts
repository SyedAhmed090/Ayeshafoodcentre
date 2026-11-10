import "server-only";
import { db } from "@/lib/db";

export type MenuItemView = {
  id: number;
  name: string;
  price: number;
  description: string | null;
  photo: string | null;
  soldOut: boolean;
  featured: boolean;
};
export type CategoryView = { id: number; name: string; items: MenuItemView[] };

const itemSelect = { id: true, name: true, price: true, description: true, photo: true, soldOut: true, featured: true };

/** Active categories with their active items, in menu order. Empty categories are dropped. */
export async function getMenu(): Promise<CategoryView[]> {
  const cats = await db.category.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      items: { where: { active: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: itemSelect },
    },
  });
  return cats.filter((c) => c.items.length > 0);
}
