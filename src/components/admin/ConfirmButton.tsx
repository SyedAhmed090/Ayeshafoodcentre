"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/** A button that needs a second tap, for things that can't be undone from here (cancel, block). */
export function ConfirmButton({ label, confirm, action }: { label: string; confirm: string; action: () => Promise<unknown> }) {
  const router = useRouter();
  const [sure, setSure] = useState(false);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!sure) return setSure(true);
        start(async () => {
          await action();
          router.refresh();
        });
      }}
      onBlur={() => setSure(false)}
      className={`h-9 shrink-0 rounded-lg px-3 text-sm font-semibold disabled:opacity-60 ${
        sure ? "bg-accent text-white" : "border border-line-2 text-ink-2"
      }`}
    >
      {sure ? confirm : label}
    </button>
  );
}
