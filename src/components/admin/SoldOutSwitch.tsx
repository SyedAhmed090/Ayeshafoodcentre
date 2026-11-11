"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setSoldOut } from "@/app/admin/actions";

/** One tap marks an item sold out (or back on) without opening it. */
export function SoldOutSwitch({ id, soldOut }: { id: number; soldOut: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setSoldOut(id, !soldOut);
          router.refresh();
        })
      }
      className={`h-9 shrink-0 rounded-lg px-3 text-sm font-semibold disabled:opacity-60 ${
        soldOut ? "bg-new-tint text-new-ink" : "border border-line-2 text-ink-2"
      }`}
    >
      {soldOut ? "Sold out · put back" : "Mark sold out"}
    </button>
  );
}
