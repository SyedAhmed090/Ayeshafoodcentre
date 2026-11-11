import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getDevice } from "@/lib/staff-auth";
import { RiderLoginView } from "@/components/staff/RiderLoginView";

// Done once per phone; afterwards it stays logged in as that rider.
export default async function RiderLogin() {
  const d = await getDevice();
  if (d?.role === "RIDER" && d.riderId) redirect("/rider");
  const riders = await db.rider.findMany({ where: { active: true }, orderBy: { id: "asc" }, select: { id: true, name: true } });
  return <RiderLoginView riders={riders} />;
}
