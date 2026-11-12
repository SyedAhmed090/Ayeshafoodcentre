import type { Metadata, Viewport } from "next";
import { getSettings } from "@/lib/settings";
import { StaffTextProvider } from "@/components/staff/StaffText";

export const metadata: Metadata = {
  title: "Rider",
  robots: { index: false },
  manifest: "/rider.webmanifest",
  appleWebApp: { capable: true, title: "Ayesha Rider" },
};
export const viewport: Viewport = { themeColor: "#F1F0EC" };
export const dynamic = "force-dynamic";

export default async function RiderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-ground select-none">
      <StaffTextProvider lang={(await getSettings()).staffLang}>{children}</StaffTextProvider>
    </div>
  );
}
