"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Container,
  useTheme,
  useMediaQuery,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  Divider,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { signOut } from "firebase/auth";
import AdminSidebar from "../components/admin/AdminSidebar";
import NotificationBell from "../components/notifications/NotificationBell";
import { isChatEnabled } from "@/lib/firebaseConfig";
import { BRAND, TOKEN_COOKIE } from "@/lib/constants";
import { getFirebaseAuth } from "@/lib/firebaseClient";
import { unregisterWebPushToken } from "@/lib/fcmClient";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const router = useRouter();

  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.replace("/login?next=/admin");
        return;
      }
      const decoded = jwtDecode<{ role?: string; userName?: string }>(token);
      if (decoded.role !== "admin") {
        router.replace("/");
        return;
      }
      setUserName(decoded.userName || null);
      setAllowed(true);
    } catch {
      router.replace("/login?next=/admin");
    }
  }, [router]);

  const handleLogout = async () => {
    await unregisterWebPushToken().catch(() => undefined);
    if (isChatEnabled()) {
      try {
        await signOut(getFirebaseAuth());
      } catch {
        /* ignore */
      }
    }
    localStorage.removeItem("token");
    document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "logout" }),
    }).catch(() => undefined);
    setAnchorElUser(null);
    window.dispatchEvent(new Event("authChange"));
    router.push("/login");
  };

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
          <Toolbar sx={{ justifyContent: "space-between", px: { xs: 1.5, sm: 3 }, gap: 1 }}>
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
            <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 1.5 } }}>
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
                  display: { xs: "none", sm: "block" },
                }}
              >
                ← Main Storefront
              </Typography>
              {isChatEnabled() && <NotificationBell />}
              <Tooltip title="Admin account">
                <IconButton
                  onClick={(e) => setAnchorElUser(e.currentTarget)}
                  sx={{ p: 0.5 }}
                  aria-label="admin account"
                >
                  <Avatar
                    sx={{
                      bgcolor: BRAND.gold,
                      color: BRAND.navy,
                      width: { xs: 32, sm: 36 },
                      height: { xs: 32, sm: 36 },
                      fontWeight: 700,
                      fontSize: "0.9rem",
                    }}
                  >
                    {(userName || "A").charAt(0).toUpperCase()}
                  </Avatar>
                </IconButton>
              </Tooltip>
              <Menu
                sx={{ mt: "45px" }}
                anchorEl={anchorElUser}
                open={Boolean(anchorElUser)}
                onClose={() => setAnchorElUser(null)}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                <MenuItem disabled sx={{ opacity: "1 !important" }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: BRAND.navy }}>
                      {userName || "Admin"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#0284c7", fontWeight: 600 }}>
                      Administrator
                    </Typography>
                  </Box>
                </MenuItem>
                <Divider />
                <MenuItem
                  component={Link}
                  href="/"
                  onClick={() => setAnchorElUser(null)}
                >
                  Main Storefront
                </MenuItem>
                {isChatEnabled() && (
                  <>
                    <MenuItem
                      component={Link}
                      href="/admin/messages"
                      onClick={() => setAnchorElUser(null)}
                    >
                      Messages
                    </MenuItem>
                    <MenuItem
                      component={Link}
                      href="/admin/notifications"
                      onClick={() => setAnchorElUser(null)}
                    >
                      Notifications
                    </MenuItem>
                  </>
                )}
                <MenuItem onClick={handleLogout}>
                  <Typography color="error">Logout</Typography>
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ mt: { xs: 2.5, sm: 4 }, mb: 6, flexGrow: 1, px: { xs: 1.5, sm: 3 } }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
}
