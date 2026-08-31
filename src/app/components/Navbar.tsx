"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Menu from "@mui/material/Menu";
import MenuIcon from "@mui/icons-material/Menu";
import Container from "@mui/material/Container";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import MenuItem from "@mui/material/MenuItem";
import Badge from "@mui/material/Badge";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import Image from "next/image";
import { jwtDecode } from "jwt-decode";
import { BRAND } from "@/lib/constants";
import { useCart } from "@/app/providers/CartProvider";
import { TOKEN_COOKIE } from "@/lib/constants";

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
  const [anchorElNav, setAnchorElNav] = useState<null | HTMLElement>(null);
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const router = useRouter();
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
    ...(role === "admin" ? [{ label: "Admin Portal", path: "/admin" }] : []),
  ];

  const handleLogout = async () => {
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
    window.dispatchEvent(new Event("authChange"));
    router.push("/login");
  };

  return (
    <AppBar position="sticky" elevation={0} sx={{ backgroundColor: "#fff", color: BRAND.navy, borderBottom: "1px solid #eee" }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Box sx={{ width: 120, height: 48, position: "relative", mr: 1, flexShrink: 0 }}>
            <Image src="/images/logo.jpg" alt="Dukandar Shandar" fill style={{ objectFit: "contain" }} />
          </Box>
          <Typography
            variant="h6"
            component={Link}
            href="/"
            sx={{
              mr: 2,
              display: { xs: "none", md: "flex" },
              fontWeight: 800,
              letterSpacing: ".04rem",
              color: "inherit",
              textDecoration: "none",
            }}
          >
            Dukandar Shandar
          </Typography>

          <Box sx={{ flexGrow: 1, display: { xs: "flex", md: "none" } }}>
            <IconButton onClick={(e) => setAnchorElNav(e.currentTarget)} color="inherit">
              <MenuIcon />
            </IconButton>
            <Menu
              anchorEl={anchorElNav}
              open={Boolean(anchorElNav)}
              onClose={() => setAnchorElNav(null)}
              sx={{ display: { xs: "block", md: "none" } }}
            >
              {pages.map((page) => (
                <MenuItem key={page.label} onClick={() => setAnchorElNav(null)}>
                  <Typography component={Link} href={page.path} sx={{ textDecoration: "none", color: "inherit" }}>
                    {page.label}
                  </Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>

          <Typography
            variant="h6"
            component={Link}
            href="/"
            sx={{
              display: { xs: "flex", md: "none" },
              flexGrow: 1,
              fontWeight: 800,
              color: "inherit",
              textDecoration: "none",
              fontSize: "1rem",
            }}
          >
            Dukandar Shandar
          </Typography>

          <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" }, gap: 0.5 }}>
            {pages.map((page) => (
              <Button
                key={page.label}
                component={Link}
                href={page.path}
                sx={{
                  color: BRAND.navy,
                  fontWeight: 600,
                  "&:hover": { color: BRAND.goldHover, backgroundColor: "transparent" },
                }}
              >
                {page.label}
              </Button>
            ))}
          </Box>

          <IconButton component={Link} href="/cart" color="inherit" sx={{ mr: 1 }}>
            <Badge badgeContent={mounted ? count : 0} sx={{ "& .MuiBadge-badge": { backgroundColor: BRAND.gold, color: "#1a1a1a" } }}>
              <ShoppingBagOutlinedIcon />
            </Badge>
          </IconButton>

          <Box sx={{ flexGrow: 0 }}>
            {mounted && isAuthenticated ? (
              <>
                <Tooltip title="Account">
                  <IconButton onClick={(e) => setAnchorElUser(e.currentTarget)} sx={{ p: 0 }}>
                    <Avatar sx={{ bgcolor: BRAND.gold, color: BRAND.navy, width: 36, height: 36 }}>
                      {(userName || "U").charAt(0).toUpperCase()}
                    </Avatar>
                  </IconButton>
                </Tooltip>
                <Menu
                  sx={{ mt: "45px" }}
                  anchorEl={anchorElUser}
                  open={Boolean(anchorElUser)}
                  onClose={() => setAnchorElUser(null)}
                >
                  <MenuItem disabled>
                    <Typography sx={{ fontWeight: 700 }}>{userName}</Typography>
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setAnchorElUser(null);
                      router.push("/orders");
                    }}
                  >
                    My Orders
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <Typography>Logout</Typography>
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button component={Link} href="/signup" variant="contained" size="small">
                  Sign Up
                </Button>
                <Button
                  component={Link}
                  href="/login"
                  variant="outlined"
                  size="small"
                  sx={{ borderColor: BRAND.gold, color: BRAND.navy }}
                >
                  Login
                </Button>
              </Box>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
