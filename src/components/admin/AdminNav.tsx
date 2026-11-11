"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Report" },
  { href: "/admin/wallet", label: "Wallet" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/riders", label: "Riders" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1">
      {LINKS.map((l) => {
        const on = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={on ? "page" : undefined}
            className={`flex h-10 items-center rounded-xl px-3 text-[15px] font-semibold whitespace-nowrap ${on ? "bg-ink text-white" : "text-ink-2"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
