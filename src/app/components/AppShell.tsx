"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { WishlistProvider } from "@/app/providers/WishlistProvider";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <WishlistProvider>
      {!isAdmin && <Navbar />}
      <main style={{ minHeight: isAdmin ? "100vh" : "calc(100vh - 80px)" }}>{children}</main>
      {!isAdmin && <Footer />}
    </WishlistProvider>
  );
}
