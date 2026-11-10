import Link from "next/link";
import { BackIcon } from "@/components/icons";
import { en as t } from "@/lib/i18n/en";

/** The 88px white bar on the counter's inner screens: back button, title, optional extras. */
export function StaffHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex h-[88px] shrink-0 items-center gap-4 border-b border-line bg-surface px-6">
      <Link href="/counter" aria-label={t.back} className="flex size-14 items-center justify-center rounded-2xl border border-line">
        <BackIcon size={26} strokeWidth={2.4} />
      </Link>
      <h1 className="font-display text-[28px] font-bold tracking-[-0.5px]">{title}</h1>
      {children}
    </div>
  );
}
