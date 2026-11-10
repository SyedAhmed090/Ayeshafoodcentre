import { redirect } from "next/navigation";
import { getCheckDetails } from "@/lib/orders";
import { CheckView } from "@/components/staff/CheckView";

export default async function CheckPage({ params }: PageProps<"/counter/check/[id]">) {
  const id = Number((await params).id);
  const order = Number.isInteger(id) ? await getCheckDetails(id) : null;
  // Already checked (here or on another device): nothing to do on this screen.
  if (!order || order.status !== "CHECK_PAYMENT") redirect("/counter");
  return <CheckView order={order} />;
}
