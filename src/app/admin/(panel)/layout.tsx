import { ownerLogout } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireOwnerPage } from "@/lib/staff-auth";

export default async function AdminPanel({ children }: { children: React.ReactNode }) {
  await requireOwnerPage();
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center gap-2 overflow-x-auto px-4 py-2.5">
          <AdminNav />
          <form action={ownerLogout} className="ml-auto">
            <button type="submit" className="h-10 rounded-xl px-3 text-[15px] font-semibold whitespace-nowrap text-muted">
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6">{children}</main>
    </>
  );
}
