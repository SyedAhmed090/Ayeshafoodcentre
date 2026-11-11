// Shared look for the owner admin: a normal admin UI in the Look B tokens (no design exists for it).

export const card = "flex flex-col gap-4 rounded-[18px] border border-line bg-surface p-5 shadow-card";
export const input = "h-11 w-full rounded-xl border border-line-2 bg-surface px-3 text-base outline-none focus:border-ink";
export const btn = "flex h-11 items-center justify-center rounded-xl bg-ink px-5 text-[15px] font-semibold text-white disabled:opacity-60";
export const btnOutline = "flex h-11 items-center justify-center rounded-xl border border-line-2 bg-surface px-5 text-[15px] font-semibold";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-ink-2">{label}</span>
      {children}
      {hint && <span className="text-[13px] text-muted">{hint}</span>}
    </label>
  );
}

export function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex min-h-11 items-center gap-3 text-base font-medium">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-5 accent-ink" />
      {label}
    </label>
  );
}

export function PageTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-[28px] font-bold tracking-[-0.5px]">{children}</h1>
      {aside}
    </div>
  );
}

/** A stored photo, or the grey box the designs use where a photo goes. */
export function Thumb({ src, size = 56 }: { src: string | null; size?: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- already resized by sharp when uploaded
    <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-xl bg-ground object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="shrink-0 rounded-xl bg-ground" style={{ width: size, height: size }} />
  );
}

/** Photo input for an edit form: choose a new one, or remove the current one. */
export function PhotoField({ current }: { current: string | null }) {
  return (
    <div className="flex items-center gap-4">
      <Thumb src={current} size={88} />
      <div className="flex flex-col gap-2">
        <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" className="text-sm" />
        {current && <Check name="removePhoto" label="Remove photo" />}
      </div>
    </div>
  );
}
