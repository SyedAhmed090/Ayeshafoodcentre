import { CustomerMotion } from "@/components/customer/Motion";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <CustomerMotion>{children}</CustomerMotion>;
}
