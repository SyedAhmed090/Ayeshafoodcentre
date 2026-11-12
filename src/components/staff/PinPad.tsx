"use client";

import { useState } from "react";
import { useT } from "@/components/staff/StaffText";
import { BackIcon } from "@/components/icons";

type Result = { error: "wrong" | "locked" } | void;

/** 4 dots + number pad. Submits on the 4th digit; `submit` redirects on success or returns an error. */
export function PinPad({ heading, submit }: { heading: React.ReactNode; submit: (pin: string) => Promise<Result> }) {
  const t = useT();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<"wrong" | "locked" | null>(null);
  const [busy, setBusy] = useState(false);

  async function press(d: string) {
    if (busy) return;
    const next = (pin + d).slice(0, 4);
    setPin(next);
    setError(null);
    if (next.length < 4) return;
    setBusy(true);
    const res = await submit(next);
    if (res?.error) {
      setError(res.error);
      setPin("");
      setBusy(false);
    }
  }

  return (
    <>
      {heading}
      <div className="flex gap-5" aria-label={`${pin.length} of 4`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`size-6 rounded-full ${i < pin.length ? "bg-ink" : "border-2 border-line-2"}`} />
        ))}
      </div>
      <p role="alert" className="h-7 text-xl font-bold text-accent-ink">
        {error === "wrong" ? t.wrongPin : error === "locked" ? t.tryLater : ""}
      </p>
      <div className="grid grid-cols-3 gap-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <Key key={d} onClick={() => press(d)}>
            {d}
          </Key>
        ))}
        <span />
        <Key onClick={() => press("0")}>0</Key>
        <Key onClick={() => setPin(pin.slice(0, -1))} label={t.deletePin}>
          <BackIcon size={32} />
        </Key>
      </div>
    </>
  );
}

function Key({ onClick, label, children }: { onClick: () => void; label?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-[88px] items-center justify-center rounded-[22px] border border-line bg-surface font-display text-4xl font-bold shadow-card active:bg-ground"
    >
      {children}
    </button>
  );
}
