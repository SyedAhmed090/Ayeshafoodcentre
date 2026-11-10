import type { Metadata } from "next";
import { getBoard } from "@/lib/orders";
import { requireCounterPage } from "@/lib/staff-auth";
import { CounterShell } from "@/components/staff/CounterShell";

export const metadata: Metadata = { title: "Front desk", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CounterLayout({ children }: { children: React.ReactNode }) {
  await requireCounterPage();
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-ground select-none">
      <CounterShell initial={await getBoard()}>{children}</CounterShell>
    </div>
  );
}
