"use client";

import { useState } from "react";
import { counterLogin } from "@/app/counter/actions";
import { en as t } from "@/lib/i18n/en";
import { BackIcon } from "@/components/icons";

// Done once when the tablet is set up; afterwards the device stays logged in.
export default function CounterLogin() {
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
    const res = await counterLogin(next); // redirects on success
    if (res?.error) {
      setError(res.error);
      setPin("");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-ground p-6 select-none">
      <div className="flex flex-col items-center gap-2">
        <h1 className="font-display text-[32px] font-bold tracking-[-0.5px]">{t.shopName}</h1>
        <p className="text-xl font-semibold text-muted">{t.enterPin}</p>
      </div>
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
    </main>
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
