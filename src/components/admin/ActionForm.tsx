"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { FormResult } from "@/app/admin/actions";
import { btn } from "@/components/admin/ui";

type Action = (prev: FormResult, fd: FormData) => Promise<FormResult>;

/** An admin form: runs a server action, then shows its error or "Saved" next to the button. */
export function ActionForm({
  action,
  submit = "Save",
  className = "flex flex-col gap-4",
  children,
}: {
  action: Action;
  submit?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <Submit label={submit} />
        <p role="status" className={`text-sm font-semibold ${state?.error ? "text-accent-ink" : "text-ready-ink"}`}>
          {state?.error ?? state?.ok ?? ""}
        </p>
      </div>
    </form>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btn}>
      {pending ? "Saving…" : label}
    </button>
  );
}
