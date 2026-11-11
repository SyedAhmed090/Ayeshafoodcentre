import { changeCounterPin, changeOwnerPassword, saveSettings } from "@/app/admin/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { card, Check, Field, input, PageTitle } from "@/components/admin/ui";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const s = await getSettings();
  return (
    <>
      <PageTitle>Settings</PageTitle>

      <section className={card}>
        <h2 className="font-display text-xl font-bold">Shop</h2>
        <ActionForm action={saveSettings}>
          <Check name="shopOpen" label="Shop is open (customers can order)" defaultChecked={s.shopOpen} />
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
        </ActionForm>
      </section>

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
