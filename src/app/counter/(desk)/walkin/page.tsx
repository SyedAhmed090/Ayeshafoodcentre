import { getMenu } from "@/lib/menu";
import { WalkinView } from "@/components/staff/WalkinView";

export default async function WalkinPage() {
  return <WalkinView menu={await getMenu()} />;
}
