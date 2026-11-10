import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicOrder } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { StatusView } from "@/components/customer/StatusView";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function OrderStatusPage({ params }: PageProps<"/order/[token]">) {
  const [order, settings] = await Promise.all([getPublicOrder((await params).token), getSettings()]);
  if (!order) notFound();
  return <StatusView initial={order} shopPhone={settings.shopPhone} />;
}
