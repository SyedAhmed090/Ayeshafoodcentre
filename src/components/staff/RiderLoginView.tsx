"use client";

import { useState } from "react";
import { riderLogin } from "@/app/rider/actions";
import { en as t } from "@/lib/i18n/en";
import { BackIcon } from "@/components/icons";
import { PinPad } from "@/components/staff/PinPad";
import { RiderPhoto } from "@/components/staff/RiderPhoto";

type Rider = { id: number; name: string; photo: string | null };

/** Tap your photo, then your 4-digit PIN. No typing. */
export function RiderLoginView({ riders }: { riders: Rider[] }) {
  const [rider, setRider] = useState<Rider | null>(null);

  if (!rider) {
    return (
      <main className="grid grid-cols-2 gap-4 p-5">
        {riders.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRider(r)}
            className="flex flex-col items-center gap-3 rounded-[22px] border border-line bg-surface p-4 shadow-card"
          >
            <RiderPhoto name={r.name} photo={r.photo} size={120} />
            <span className="font-display text-2xl font-bold tracking-[-0.5px]">{r.name}</span>
          </button>
        ))}
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-7 p-5">
      <button
        type="button"
        onClick={() => setRider(null)}
        aria-label={t.back}
        className="fixed top-5 left-5 flex size-[60px] items-center justify-center rounded-2xl border border-line bg-surface"
      >
        <BackIcon size={28} strokeWidth={2.4} />
      </button>
      <PinPad
        submit={(pin) => riderLogin(rider.id, pin)}
        heading={
          <div className="flex flex-col items-center gap-3">
            <RiderPhoto name={rider.name} photo={rider.photo} size={120} onGround />
            <h1 className="font-display text-[28px] font-bold tracking-[-0.5px]">{rider.name}</h1>
          </div>
        }
      />
    </main>
  );
}
