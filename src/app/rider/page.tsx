import { db } from "@/lib/db";
import { getRiderOrder } from "@/lib/orders";
import { vapidPublicKey } from "@/lib/push";
import { requireRiderPage } from "@/lib/staff-auth";
import { RiderApp } from "@/components/staff/RiderApp";

export default async function RiderPage() {
  const { riderId } = await requireRiderPage();
  const rider = await db.rider.findUniqueOrThrow({ where: { id: riderId }, select: { name: true, photo: true } });
  return <RiderApp riderId={riderId} name={rider.name} photo={rider.photo} initial={await getRiderOrder(riderId)} pushKey={vapidPublicKey()} />;
}
