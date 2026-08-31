import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import ThemeRegistry from "./ThemeRegistry";
import AppShell from "./components/AppShell";

const poppins = Poppins({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Dukandar Shandar",
  description: "Stationery and craft ecommerce — quality supplies for every project.",
  icons: {
    icon: "/images/ds-icon.png",
    shortcut: "/images/ds-icon.png",
    apple: "/images/ds-icon.png",
  },
};

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
