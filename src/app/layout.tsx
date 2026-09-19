import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import ThemeRegistry from "./ThemeRegistry";
import AppShell from "./components/AppShell";

import { getDeliverySettings } from "@/lib/deliverySettings.server";

const poppins = Poppins({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getDeliverySettings().catch(() => null);
  const shopName = settings?.shopName?.trim() || process.env.NEXT_PUBLIC_STORE_NAME || "Ecommerce Store";
  const storeLogo = settings?.storeLogo;

  return {
    title: {
      default: shopName,
      template: `%s | ${shopName}`,
    },
    description: "Quality stationery, craft, and ecommerce supplies for every project.",
    icons: storeLogo ? [{ rel: "icon", url: storeLogo }] : undefined,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} antialiased`}>
        <ThemeRegistry>
          <AppShell>{children}</AppShell>
        </ThemeRegistry>
      </body>
    </html>
  );
}
