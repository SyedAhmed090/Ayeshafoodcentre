import type { Metadata } from "next";
import { getMenu } from "@/lib/menu";
import { getSettings } from "@/lib/settings";
import { CheckoutView } from "@/components/customer/CheckoutView";

export const metadata: Metadata = { title: "Your order" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [menu, s] = await Promise.all([getMenu(), getSettings()]);
  return (
    <CheckoutView
      items={menu.flatMap((c) => c.items).filter((i) => !i.soldOut)}
      deliveryFee={s.deliveryFee}
      merchantNumber={s.merchantNumber}
      shopOpen={s.shopOpen}
    />
  );
}
