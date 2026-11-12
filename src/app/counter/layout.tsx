import { getSettings } from "@/lib/settings";
import { StaffTextProvider } from "@/components/staff/StaffText";

export const dynamic = "force-dynamic";

// Covers the PIN screen and the desk: both show staff words in the owner's chosen language.
export default async function CounterRoot({ children }: { children: React.ReactNode }) {
  return <StaffTextProvider lang={(await getSettings()).staffLang}>{children}</StaffTextProvider>;
}
