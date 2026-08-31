"use client";

import React, { useEffect, useState } from "react";
import { Box, AppBar, Toolbar, Typography, IconButton, Container, useTheme, useMediaQuery } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import AdminSidebar from "../components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
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
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setSidebarOpen(!sidebarOpen);
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#f1f5f9" }}>
      <AdminSidebar
        open={sidebarOpen}
        onToggle={toggleSidebar}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minWidth: 0, width: "100%" }}>
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            backgroundColor: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
            color: "#0f172a",
            zIndex: (t) => t.zIndex.drawer + 1,
          }}
        >
          <Toolbar sx={{ justifyContent: "space-between", px: { xs: 1.5, sm: 3 } }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <IconButton onClick={toggleSidebar} edge="start" color="inherit" aria-label="open drawer">
                <MenuIcon />
              </IconButton>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: "#0f172a",
                  fontSize: { xs: "0.95rem", sm: "1.25rem" },
                  whiteSpace: "nowrap",
                }}
              >
                Control Center
              </Typography>
            </Box>
            <Typography
              variant="body2"
              component={Link}
              href="/"
              sx={{
                color: "#0284c7",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: { xs: "0.8rem", sm: "0.875rem" },
                whiteSpace: "nowrap",
              }}
            >
              ← Main Storefront
            </Typography>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ mt: { xs: 2.5, sm: 4 }, mb: 6, flexGrow: 1, px: { xs: 1.5, sm: 3 } }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
}
