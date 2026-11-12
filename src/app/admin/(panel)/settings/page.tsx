import { changeCounterPin, changeOwnerPassword, saveSettings, unblockCustomer } from "@/app/admin/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { btnOutline, card, Check, Field, input, PageTitle } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { STAFF_LANGS } from "@/lib/i18n";
import { formatPhone } from "@/lib/phone";
import { getSettings } from "@/lib/settings";

/** 750 → "12:30" for a time box. */
const hhmm = (m: number | null) => (m === null ? "" : `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [s, blocked] = await Promise.all([
    getSettings(),
    db.customer.findMany({ where: { blocked: true }, orderBy: { id: "desc" }, select: { id: true, name: true, phone: true } }),
  ]);
  return (
    <>
      <PageTitle>Settings</PageTitle>

      <section className={card}>
        <h2 className="font-display text-xl font-bold">Shop</h2>
        <ActionForm action={saveSettings}>
          <Check name="shopOpen" label="Shop is open (customers can order)" defaultChecked={s.shopOpen} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Opens at" hint="Leave both empty to use only the switch above.">
              <input name="opens" type="time" defaultValue={hhmm(s.openMinute)} className={input} />
            </Field>
            <Field label="Closes at" hint="Earlier than opening = closes after midnight.">
              <input name="closes" type="time" defaultValue={hhmm(s.closeMinute)} className={input} />
            </Field>
            <Field label="Staff screens" hint="Counter tablet and rider phones.">
              <select name="staffLang" defaultValue={s.staffLang} className={input}>
                {Object.entries(STAFF_LANGS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Delivery fee (Rs)">
              <input name="deliveryFee" inputMode="numeric" defaultValue={s.deliveryFee} required className={input} />
            </Field>
            <Field label="Merchant number" hint="JazzCash / Easypaisa, shown at checkout.">
              <input name="merchantNumber" type="tel" defaultValue={s.merchantNumber} required className={input} />
            </Field>
            <Field label="Shop phone" hint="Customers' Call shop button.">
              <input name="shopPhone" type="tel" defaultValue={s.shopPhone} required className={input} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Minimum order (Rs)" hint="Food total before delivery. 0 = none.">
              <input name="minOrder" inputMode="numeric" defaultValue={s.minOrder} required className={input} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Delivery area" hint="Shown at checkout, e.g. North Karachi, Sectors 5 to 11.">
                <input name="deliveryArea" defaultValue={s.deliveryArea ?? ""} maxLength={120} className={input} />
              </Field>
            </div>
          </div>
        </ActionForm>
      </section>

      {blocked.length > 0 && (
        <section className={card}>
          <h2 className="font-display text-xl font-bold">Blocked numbers</h2>
          <ul className="divide-y divide-line">
            {blocked.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2.5 text-[15px]">
                <span className="grow">
                  {formatPhone(c.phone)} · {c.name}
                </span>
                <form action={unblockCustomer.bind(null, c.id)}>
                  <button type="submit" className={btnOutline}>
                    Unblock
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={card}>
        <h2 className="font-display text-xl font-bold">Counter PIN</h2>
        <ActionForm action={changeCounterPin} submit="Change PIN">
          <Field label="New PIN" hint="4 digits. The counter tablet stays logged in; the PIN is asked only when a tablet logs in.">
            <input name="pin" inputMode="numeric" pattern="\d{4}" maxLength={4} required autoComplete="off" className={`${input} w-32`} />
          </Field>
        </ActionForm>
      </section>

      <section className={card}>
        <h2 className="font-display text-xl font-bold">Owner password</h2>
        <ActionForm action={changeOwnerPassword} submit="Change password">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Current password">
              <input name="current" type="password" required autoComplete="current-password" className={input} />
            </Field>
            <Field label="New password" hint="At least 8 characters.">
              <input name="next" type="password" required minLength={8} autoComplete="new-password" className={input} />
            </Field>
          </div>
        </ActionForm>
      </section>
    </>
  );
}
