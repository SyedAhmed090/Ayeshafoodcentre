import { getMenu } from "@/lib/menu";
import { getSettings } from "@/lib/settings";
import { shopStatus } from "@/lib/time";
import { MenuView } from "@/components/customer/MenuView";

// Prices, sold-out flags and open/closed change from the admin, so never cache this page.
export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const [menu, settings] = await Promise.all([getMenu(), getSettings()]);
  const { open, opensAt } = shopStatus(settings);
  return <MenuView menu={menu} shopOpen={open} opensAt={opensAt} shopPhone={settings.shopPhone} />;
}
