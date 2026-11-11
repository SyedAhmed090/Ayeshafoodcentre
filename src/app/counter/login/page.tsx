"use client";

import { counterLogin } from "@/app/counter/actions";
import { en as t } from "@/lib/i18n/en";
import { PinPad } from "@/components/staff/PinPad";

// Done once when the tablet is set up; afterwards the device stays logged in.
export default function CounterLogin() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-ground p-6 select-none">
      <PinPad
        submit={counterLogin}
        heading={
          <div className="flex flex-col items-center gap-2">
            <h1 className="font-display text-[32px] font-bold tracking-[-0.5px]">{t.shopName}</h1>
            <p className="text-xl font-semibold text-muted">{t.enterPin}</p>
          </div>
        }
      />
    </main>
  );
}
