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
import NotificationsIcon from '@mui/icons-material/Notifications';
import Badge from '@mui/material/Badge';
import Image from "next/image";
import { jwtDecode } from "jwt-decode";


const myImage = "/images/logo.jpg"

const pages = [
  { label: "Shop", path: "/shop" },
  { label: "About", path: "/about" },
  { label: "Contact", path: "/contact" },
];

export default function Navbar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [anchorElNav, setAnchorElNav] = useState<null | HTMLElement>(null);
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    setMounted(true); // Mark as mounted

    const checkAuth = () => {
      try {
        if (typeof window !== "undefined") {
          const token = localStorage.getItem("token");

          if (token) {
            const decoded: { userName?: string } = jwtDecode(token);
            setUserName(decoded.userName || null);
            setIsAuthenticated(true);
          } else {
            setUserName(null);
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.error("Invalid token:", error);
        setUserName(null);
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

  const handleLogin = () => {
    router.push("/login"); // ✅ Redirect
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false); // ✅ Update state
    setAnchorElUser(null); // ✅ Close menu
    router.push("/login");
  };

  return (
    <AppBar position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {/* Logo (Desktop) */}
          {/* <AdbIcon sx={{ display: { xs: "none", md: "flex" }, mr: 1 }} /> */}
          <Box sx={{ width: 150, height: 50, position: "relative", marginRight: "2px" }}>
            <Image src={myImage} alt="Logo" layout="fill" objectFit="contain" />
          </Box>
          <Typography
            variant="h6"
            noWrap
            component={Link}
            href="/"
            sx={{
              mr: 2,
              display: { xs: "none", md: "flex" },
              fontFamily: "monospace",
              fontWeight: 700,
              letterSpacing: ".3rem",
              color: "inherit",
              textDecoration: "none",
            }}
          >
            Dukandar Shandar
          </Typography>

          {/* Mobile Menu Button */}
          <Box sx={{ flexGrow: 1, display: { xs: "flex", md: "none" } }}>
            <IconButton
              size="medium"
              aria-label="menu"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={(e) => setAnchorElNav(e.currentTarget)}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
              keepMounted
              transformOrigin={{ vertical: "top", horizontal: "left" }}
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
          {/* Logo (Mobile) */}
          <Typography
            variant="h6"
            component={Link}
            href="/"
            sx={{
              display: { xs: "flex", md: "none" },
              flexGrow: 1,
              fontFamily: "monospace",
              fontWeight: 700,
              color: "inherit",
              textDecoration: "none",
              lineHeight: 1,
              flexDirection: "column",
              textAlign: "center",
              fontSize: '1.1rem', // Explicit font size
              '& br': {
                display: 'block',
                content: '""',
                marginBottom: '0.2em' // Space between lines
              }
            }}
          >
            Dukandar
            <br />
            Shandar
          </Typography>

          {/* Desktop Menu */}
          <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" } }}>
            {pages.map((page) => (
              <Button key={page.label} component={Link} href={page.path} sx={{ my: 2, color: "white", display: "block" }}>
                {page.label}
              </Button>
            ))}
          </Box>

          {/* User Menu */}
          <MenuItem>
            <IconButton
              size="large"
              aria-label="show 17 new notifications"
              color="inherit"
            >
              <Badge badgeContent={17} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </MenuItem>


          <Box sx={{ flexGrow: 0 }}>
            <Tooltip title="User Options">
              <IconButton onClick={(e) => setAnchorElUser(e.currentTarget)} sx={{ p: 0 }}>
                <Avatar alt="User" src="/static/images/avatar/2.jpg" />
              </IconButton>
            </Tooltip>
            {mounted && ( // Only render when mounted (client-side)
              <Menu
                sx={{ mt: "45px" }}
                id="menu-appbar"
                anchorEl={anchorElUser}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
                keepMounted
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                open={Boolean(anchorElUser)}
                onClose={() => setAnchorElUser(null)}
              >
                {isAuthenticated && userName ? (
                  [
                    <MenuItem key="username">
                      <Typography sx={{ fontWeight: "bold", textAlign: "center" }}>
                        {userName}
                      </Typography>
                    </MenuItem>,
                    <MenuItem key="logout" onClick={handleLogout}>
                      <Typography>Logout</Typography>
                    </MenuItem>,
                  ]
                ) : (
                  <MenuItem onClick={handleLogin}>
                    <Typography>Login</Typography>
                  </MenuItem>
                )}
              </Menu>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}