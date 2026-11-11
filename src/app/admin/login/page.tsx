import { redirect } from "next/navigation";
import { ownerLogin } from "@/app/admin/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { card, Field, input } from "@/components/admin/ui";
import { ownerDevice } from "@/lib/staff-auth";

export const metadata = { title: "Log in" };

export default async function OwnerLogin() {
  if (await ownerDevice()) redirect("/admin");
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className={`${card} w-full max-w-sm`}>
        <h1 className="font-display text-2xl font-bold tracking-[-0.5px]">Ayesha Food Centre · Admin</h1>
        <ActionForm action={ownerLogin} submit="Log in">
          <Field label="Owner password">
            <input type="password" name="password" required autoComplete="current-password" autoFocus className={input} />
          </Field>
        </ActionForm>
      </div>
    </main>
  );
}
