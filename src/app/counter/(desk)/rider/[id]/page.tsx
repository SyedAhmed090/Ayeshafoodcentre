import { redirect } from "next/navigation";
import { getPickDetails } from "@/lib/orders";
import { PickRiderView } from "@/components/staff/PickRiderView";

export default async function PickRiderPage({ params }: PageProps<"/counter/rider/[id]">) {
  const id = Number((await params).id);
  const details = Number.isInteger(id) ? await getPickDetails(id) : null;
  // Already sent out (here or on another device): nothing to do on this screen.
  if (!details) redirect("/counter");
  return <PickRiderView {...details} />;
}
