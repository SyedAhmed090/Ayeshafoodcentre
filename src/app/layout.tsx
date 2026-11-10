import type { Metadata, Viewport } from "next";
import { inter, spaceGrotesk } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Ayesha Food Centre", template: "%s · Ayesha Food Centre" },
  description: "Order fast food for home delivery in North Karachi.",
  applicationName: "Ayesha Food Centre",
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
