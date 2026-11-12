import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPublicOrder } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { StatusView } from "@/components/customer/StatusView";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function OrderStatusPage({ params }: PageProps<"/order/[token]">) {
  const [order, settings] = await Promise.all([getPublicOrder((await params).token), getSettings()]);
  if (!order) notFound();
  // The address the customer used, for the WhatsApp link (the proxy says whether it was https).
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http")}://${h.get("host")}`;
  return <StatusView initial={order} shopPhone={settings.shopPhone} origin={origin} />;
}
