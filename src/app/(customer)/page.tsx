import { getMenu } from "@/lib/menu";
import { getSettings } from "@/lib/settings";
import { MenuView } from "@/components/customer/MenuView";

// Prices, sold-out flags and open/closed change from the admin, so never cache this page.
export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const [menu, settings] = await Promise.all([getMenu(), getSettings()]);
  return <MenuView menu={menu} shopOpen={settings.shopOpen} shopPhone={settings.shopPhone} />;
}
