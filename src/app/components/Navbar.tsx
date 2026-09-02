"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  Container,
  Avatar,
  Button,
  Tooltip,
  MenuItem,
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import Image from "next/image";
import { jwtDecode } from "jwt-decode";
import { BRAND, TOKEN_COOKIE } from "@/lib/constants";
import { useCart } from "@/app/providers/CartProvider";
import NotificationBell from "@/app/components/notifications/NotificationBell";
import { isChatEnabled } from "@/lib/firebaseConfig";
import { unregisterWebPushToken } from "@/lib/fcmClient";
import { getFirebaseAuth } from "@/lib/firebaseClient";
import { signOut } from "firebase/auth";

type DecodedToken = { userName?: string; role?: string };

const storePages = [
  { label: "Home", path: "/" },
  { label: "Shop", path: "/shop" },
  // { label: "Blog", path: "/blog" },
  { label: "About", path: "/about" },
  { label: "Contact", path: "/contact" },
];

export default function Navbar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { count } = useCart();

  useEffect(() => {
    setMounted(true);

    const checkAuth = () => {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const decoded: DecodedToken = jwtDecode(token);
          setUserName(decoded.userName || null);
          setRole(decoded.role || null);
          setIsAuthenticated(true);
        } else {
          setUserName(null);
          setRole(null);
          setIsAuthenticated(false);
        }
      } catch {
        setUserName(null);
        setRole(null);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
    window.addEventListener("storage", checkAuth);
    window.addEventListener("authChange", checkAuth);
    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("authChange", checkAuth);
    };
  }, []);

  const pages = [
    ...storePages,
    ...(isAuthenticated && role !== "guest" ? [{ label: "Support", path: "/support" }] : []),
    ...(role === "admin" ? [{ label: "Admin Portal", path: "/admin" }] : []),
  ];

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
    setIsAuthenticated(false);
    setRole(null);
    setAnchorElUser(null);
    setMobileDrawerOpen(false);
    window.dispatchEvent(new Event("authChange"));
    router.push("/login");
  };

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: "#ffffff",
          color: BRAND.navy,
          borderBottom: "1px solid #e2e8f0",
          zIndex: 1100,
        }}
      >
        <Container maxWidth="xl">
          <Toolbar
            disableGutters
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              minHeight: { xs: 58, sm: 68 },
              px: { xs: 1, sm: 2 },
            }}
          >
            {/* LEFT SECTION: Mobile Hamburger + Brand Logo */}
            <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 1.5 } }}>
              {/* Mobile Hamburger Button on the Extreme Left */}
              <IconButton
                onClick={() => setMobileDrawerOpen(true)}
                color="inherit"
                aria-label="open navigation menu"
                sx={{ display: { xs: "flex", md: "none" }, p: 0.5, ml: -0.5 }}
              >
                <MenuIcon fontSize="medium" />
              </IconButton>

              {/* Brand Logo Link: DS icon on mobile, full logo on desktop */}
              <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
                {/* Mobile: Compact DS icon */}
                <Box
                  style={{ position: "relative", width: 38, height: 38 }}
                  sx={{
                    display: { xs: "block", md: "none" },
                    width: 38,
                    height: 38,
                    position: "relative",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <Image
                    src="/images/ds-icon.png"
                    alt="DS Logo"
                    fill
                    priority
                    style={{ objectFit: "contain" }}
                  />
                </Box>

                {/* Desktop: Full Banner Logo */}
                <Box
                  style={{ position: "relative", width: 140, height: 46 }}
                  sx={{
                    display: { xs: "none", md: "block" },
                    width: 140,
                    height: 46,
                    position: "relative",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <Image
                    src="/images/logo.jpg"
                    alt="Dukandar Shandar"
                    fill
                    priority
                    style={{ objectFit: "contain", objectPosition: "left center" }}
                  />
                </Box>
              </Link>
            </Box>

            {/* CENTER SECTION (Desktop Only): Main Navigation Links */}
            <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 1 }}>
              {pages.map((page) => {
                const isActive = pathname === page.path;
                return (
                  <Button
                    key={page.label}
                    component={Link}
                    href={page.path}
                    sx={{
                      color: isActive ? BRAND.navy : "#475569",
                      fontWeight: isActive ? 700 : 500,
                      fontSize: "0.95rem",
                      px: 1.5,
                      borderBottom: isActive ? `2px solid ${BRAND.gold}` : "2px solid transparent",
                      borderRadius: 0,
                      "&:hover": {
                        color: BRAND.navy,
                        backgroundColor: "rgba(0,0,0,0.02)",
                        borderBottom: `2px solid ${BRAND.goldHover}`,
                      },
                    }}
                  >
                    {page.label}
                  </Button>
                );
              })}
            </Box>

            {/* RIGHT SECTION: Cart + Auth (Desktop & Mobile) */}
            <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 1.5 } }}>
              {/* Cart Icon */}
              <IconButton
                component={Link}
                href="/cart"
                color="inherit"
                aria-label="shopping cart"
                sx={{
                  p: { xs: 0.75, sm: 1 },
                  "&:hover": { backgroundColor: "rgba(0,0,0,0.04)" },
                }}
              >
                <Badge
                  badgeContent={mounted ? count : 0}
                  sx={{
                    "& .MuiBadge-badge": {
                      backgroundColor: BRAND.gold,
                      color: "#1a1a1a",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                    },
                  }}
                >
                  <ShoppingBagOutlinedIcon />
                </Badge>
              </IconButton>

              {mounted && isAuthenticated && isChatEnabled() && <NotificationBell />}

              {/* User Account / Auth Actions */}
              {mounted && isAuthenticated ? (
                <Box sx={{ flexGrow: 0 }}>
                  <Tooltip title="My Account">
                    <IconButton
                      onClick={(e) => setAnchorElUser(e.currentTarget)}
                      sx={{ p: 0.5 }}
                      aria-label="user profile"
                    >
                      <Avatar
                        style={{ width: 36, height: 36 }}
                        sx={{
                          bgcolor: BRAND.gold,
                          color: BRAND.navy,
                          width: { xs: 32, sm: 36 },
                          height: { xs: 32, sm: 36 },
                          fontWeight: 700,
                          fontSize: "0.9rem",
                        }}
                      >
                        {(userName || "U").charAt(0).toUpperCase()}
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
                          {userName || "User"}
                        </Typography>
                        {role === "admin" && (
                          <Typography variant="caption" sx={{ color: "#0284c7", fontWeight: 600 }}>
                            Administrator
                          </Typography>
                        )}
                      </Box>
                    </MenuItem>
                    <Divider />
                    {role === "admin" && (
                      <MenuItem
                        onClick={() => {
                          setAnchorElUser(null);
                          router.push("/admin");
                        }}
                      >
                        Admin Portal
                      </MenuItem>
                    )}
                    <MenuItem
                      onClick={() => {
                        setAnchorElUser(null);
                        router.push("/orders");
                      }}
                    >
                      My Orders
                    </MenuItem>
                    {isChatEnabled() && role !== "guest" && (
                      <MenuItem
                        onClick={() => {
                          setAnchorElUser(null);
                          router.push("/messages");
                        }}
                      >
                        Chat
                      </MenuItem>
                    )}
                    <MenuItem onClick={handleLogout}>
                      <Typography color="error">Logout</Typography>
                    </MenuItem>
                  </Menu>
                </Box>
              ) : (
                <>
                  {/* Desktop Auth Buttons */}
                  <Box sx={{ display: { xs: "none", sm: "flex" }, gap: 1 }}>
                    <Button
                      component={Link}
                      href="/login"
                      variant="outlined"
                      size="small"
                      sx={{
                        borderColor: "#e2e8f0",
                        color: BRAND.navy,
                        textTransform: "none",
                        fontWeight: 600,
                        "&:hover": { borderColor: BRAND.gold, backgroundColor: "#fffbeb" },
                      }}
                    >
                      Login
                    </Button>
                    <Button
                      component={Link}
                      href="/signup"
                      variant="contained"
                      size="small"
                      sx={{
                        backgroundColor: BRAND.gold,
                        color: "#1a1a1a",
                        textTransform: "none",
                        fontWeight: 700,
                        "&:hover": { backgroundColor: BRAND.goldHover },
                      }}
                    >
                      Sign Up
                    </Button>
                  </Box>

                  {/* Mobile Compact User Icon */}
                  <IconButton
                    component={Link}
                    href="/login"
                    color="inherit"
                    aria-label="login"
                    sx={{
                      display: { xs: "flex", sm: "none" },
                      p: 0.75,
                    }}
                  >
                    <PersonOutlineIcon />
                  </IconButton>
                </>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* MOBILE SLIDE-OUT NAVIGATION DRAWER */}
      <Drawer
        anchor="left"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: 290,
            maxWidth: "85vw",
            boxSizing: "border-box",
            backgroundColor: "#ffffff",
            p: 2.5,
            pb: 4,
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
          },
        }}
      >
        {/* Drawer Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexShrink: 0 }}>
          <Box style={{ position: "relative", width: 120, height: 40 }} sx={{ width: 120, height: 40, position: "relative", flexShrink: 0 }}>
            <Image src="/images/logo.jpg" alt="Dukandar Shandar" fill style={{ objectFit: "contain" }} />
          </Box>
          <IconButton onClick={() => setMobileDrawerOpen(false)} size="small" aria-label="close navigation drawer">
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 1.5, flexShrink: 0 }} />

        {/* Navigation Links */}
        <List sx={{ flexGrow: 1, py: 0 }}>
          {pages.map((page) => {
            const isActive = pathname === page.path;
            return (
              <ListItem key={page.label} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  component={Link}
                  href={page.path}
                  onClick={() => setMobileDrawerOpen(false)}
                  sx={{
                    borderRadius: 2,
                    backgroundColor: isActive ? "#fffbeb" : "transparent",
                    color: isActive ? BRAND.navy : "#475569",
                    fontWeight: isActive ? 700 : 500,
                    borderLeft: isActive ? `4px solid ${BRAND.gold}` : "4px solid transparent",
                    py: 1,
                  }}
                >
                  <ListItemText
                    primary={page.label}
                    primaryTypographyProps={{
                      fontWeight: isActive ? 700 : 500,
                      fontSize: "0.95rem",
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        <Divider sx={{ my: 2, flexShrink: 0 }} />

        {/* Mobile Drawer Auth Footer */}
        {mounted && isAuthenticated ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, flexShrink: 0, mt: "auto" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1.5,
                backgroundColor: "#f8fafc",
                borderRadius: 2,
                border: "1px solid #e2e8f0",
              }}
            >
              <Avatar style={{ width: 38, height: 38 }} sx={{ bgcolor: BRAND.gold, color: BRAND.navy, width: 38, height: 38, fontWeight: 700 }}>
                {(userName || "U").charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {userName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {role === "admin" ? "Admin Account" : "Customer"}
                </Typography>
              </Box>
            </Box>
            <Button
              component={Link}
              href="/orders"
              variant="outlined"
              fullWidth
              onClick={() => setMobileDrawerOpen(false)}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                borderColor: "#cbd5e1",
                color: BRAND.navy,
                py: 1,
                "&:hover": { borderColor: BRAND.gold, backgroundColor: "#fffbeb" },
              }}
            >
              My Orders
            </Button>
            {isChatEnabled() && role !== "guest" && (
              <Button
                component={Link}
                href="/messages"
                variant="outlined"
                fullWidth
                onClick={() => setMobileDrawerOpen(false)}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  borderColor: "#cbd5e1",
                  color: BRAND.navy,
                  py: 1,
                  "&:hover": { borderColor: BRAND.gold, backgroundColor: "#fffbeb" },
                }}
              >
                Chat
              </Button>
            )}
            <Button
              variant="text"
              color="error"
              fullWidth
              onClick={handleLogout}
              sx={{ textTransform: "none", fontWeight: 600, py: 0.75 }}
            >
              Logout
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, flexShrink: 0, mt: "auto" }}>
            <Button
              component={Link}
              href="/login"
              variant="outlined"
              fullWidth
              onClick={() => setMobileDrawerOpen(false)}
              sx={{ textTransform: "none", fontWeight: 600, borderColor: BRAND.gold, color: BRAND.navy, py: 1 }}
            >
              Login
            </Button>
            <Button
              component={Link}
              href="/signup"
              variant="contained"
              fullWidth
              onClick={() => setMobileDrawerOpen(false)}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                backgroundColor: BRAND.gold,
                color: "#1a1a1a",
                py: 1,
                "&:hover": { backgroundColor: BRAND.goldHover },
              }}
            >
              Sign Up
            </Button>
          </Box>
        )}
      </Drawer>
    </>
  );
}
