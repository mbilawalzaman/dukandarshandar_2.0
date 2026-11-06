import { Poppins } from "next/font/google";

import type { Metadata } from "next";

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

  const shopName =
    settings?.shopName?.trim() ||
    process.env.NEXT_PUBLIC_STORE_NAME ||
    "Ecommerce Store";

  const storeLogo = settings?.storeLogo;

  return {
    title: {
      default: shopName,
      template: `%s | ${shopName}`,
    },
    description:
      "Quality stationery, craft, and ecommerce supplies for every project.",
    icons: storeLogo ? [{ rel: "icon", url: storeLogo }] : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getDeliverySettings().catch(() => null);

  const siteUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://www.dukandarshandar.com"
  ).replace(/\/+$/, "");

  const storeName =
    settings?.shopName?.trim() ||
    process.env.NEXT_PUBLIC_STORE_NAME ||
    "Dukandar Shandar";

  const sameAsCandidates = [
    settings?.socialLinks?.instagram,
    settings?.socialLinks?.facebook,
    settings?.socialLinks?.youtube,
    process.env.DARAZ_STORE_URL,
  ];

  const sameAs = sameAsCandidates.filter((url): url is string => {
    if (!url) return false;

    try {
      return new URL(url).protocol === "https:";
    } catch {
      return false;
    }
  });

  const logoCandidate = settings?.storeLogo;
  let logoUrl = `${siteUrl}/icon.png`;

  if (logoCandidate) {
    try {
      if (new URL(logoCandidate).protocol === "https:") logoUrl = logoCandidate;
    } catch {
      // Use the app's actual logo when no valid absolute HTTPS store logo is configured.
    }
  }

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    "@id": `${siteUrl}/#organization`,
    name: storeName,
    url: siteUrl,
    logo: logoUrl,
    ...(sameAs.length ? { sameAs } : {}),
  };

  /*
   * Use only HTTPS URLs from the store's configured social profiles and the
   * optional official Daraz URL; never publish guessed profile URLs.
   */
  const schemaJson = JSON.stringify(organizationSchema).replace(
    /</g,
    "\\u003c",
  );

  return (
    <html lang="en">
      <body className={`${poppins.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: schemaJson }}
        />
        <ThemeRegistry>
          <AppShell>{children}</AppShell>
        </ThemeRegistry>
      </body>
    </html>
  );
}
