"use client";

import React, { useEffect, useState } from "react";
import { Box, AppBar, Toolbar, Typography, IconButton, Container } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import AdminSidebar from "../components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.replace("/login?next=/admin");
        return;
      }
      const decoded = jwtDecode<{ role?: string }>(token);
      if (decoded.role !== "admin") {
        router.replace("/");
        return;
      }
      setAllowed(true);
    } catch {
      router.replace("/login?next=/admin");
    }
  }, [router]);

  if (!allowed) return null;

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#f1f5f9" }}>
      <AdminSidebar open={sidebarOpen} onToggle={toggleSidebar} />
      
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <AppBar position="sticky" elevation={0} sx={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0", color: "#0f172a" }}>
          <Toolbar sx={{ justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <IconButton onClick={toggleSidebar} edge="start" color="inherit">
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
                Dashboard Control Center
              </Typography>
            </Box>
            <Typography variant="body2" component={Link} href="/" sx={{ color: "#0284c7", textDecoration: "none", fontWeight: 600 }}>
              ← Return to Main Storefront
            </Typography>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ mt: 4, mb: 6, flexGrow: 1 }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
}
