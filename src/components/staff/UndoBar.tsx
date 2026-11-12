"use client";

import { useT } from "@/components/staff/StaffText";
import { UNDO_WINDOW_MS } from "@/lib/order-rules";
import { UndoIcon } from "@/components/icons";

/** "Undo #48" with a 10 s shrinking bar, bottom centre on staff screens. The caller hides it when time runs out. */
export function UndoBar({ number, until, onUndo }: { number: number; until: number; onUndo: () => void }) {
  const t = useT();
  return (
    <div className="fixed inset-x-0 bottom-6 flex justify-center px-5">
      <button
        key={until}
        type="button"
        onClick={onUndo}
        className="relative flex h-[72px] items-center gap-3 overflow-hidden rounded-2xl bg-ink px-8 text-[22px] font-semibold text-white shadow-card"
      >
        <UndoIcon size={28} />
        {t.undo} #{number}
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1.5 origin-left bg-cooking"
          style={{ animation: `afc-shrink ${UNDO_WINDOW_MS}ms linear forwards` }}
        />
      </button>
    </div>
  );
}
