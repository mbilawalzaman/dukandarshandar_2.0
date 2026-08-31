"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <>
      {!isAdmin && <Navbar />}
      <main style={{ minHeight: isAdmin ? "100vh" : "calc(100vh - 80px)" }}>{children}</main>
      {!isAdmin && <Footer />}
    </>
  );
}
